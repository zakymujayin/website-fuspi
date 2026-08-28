import {z} from "zod";

import {
  CmsGovernanceSummarySchema,
  CmsPageMetadataSchema,
  collectDuplicateAwareSearchParams,
} from "@/contracts/cms";
import {
  FacilityAdminDetailSchema,
  FacilityAdminViewSchema,
  FacilityCommandSchema,
  FacilityInputSchema,
  FacilityListQuerySchema,
  FacilityListResultSchema,
  FacilityMutationResultSchema,
  PublicFacilityItemSchema,
  PublicFacilityListResultSchema,
  type FacilityCommand,
  type FacilityMutationResult,
} from "@/contracts/facility";
import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {PublicMediaViewSchema} from "@/contracts/media";
import {StorageKeySchema} from "@/contracts/storage";
import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {createContentRevision} from "@/lib/db/revision";

export type FacilityDatabase = ReturnType<typeof createPrismaClient>;
type Locale = "id" | "en" | "ar";
type FacilityInput = z.infer<typeof FacilityInputSchema>;
export type PublicHomeFacility = {
  id: string;
  slug: string;
  image: ReturnType<typeof publicMedia>;
  caption: string;
  description: string | null;
};

const MEDIA_SELECT = {
  id: true,
  storageKey: true,
  storageClass: true,
  mimeType: true,
  size: true,
  alt: true,
  isDecorative: true,
  width: true,
  height: true,
  focalX: true,
  focalY: true,
} as const;

type MediaRow = {
  id: string; storageKey: string; storageClass: string; mimeType: string;
  size: number; alt: string | null; isDecorative: boolean; width: number | null; height: number | null;
  focalX: number | null; focalY: number | null;
} | null;

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function publicMedia(media: MediaRow, rawUploadBase: string) {
  if (!media || media.storageClass !== "PUBLIC" || media.mimeType !== "image/webp"
    || media.alt === null || !StorageKeySchema.safeParse(media.storageKey).success) return null;
  const url = `${rawUploadBase.replace(/\/+$/u, "") || "/uploads"}/${media.storageKey}`;
  const view = {id: media.id, url, mimeType: media.mimeType, size: media.size, alt: media.alt,
    isDecorative: media.isDecorative, width: media.width, height: media.height,
    focalX: media.focalX, focalY: media.focalY};
  return PublicMediaViewSchema.safeParse(view).success ? view : null;
}

function pageMetadata(page: number, pageSize: 10 | 20 | 50, total: number) {
  return CmsPageMetadataSchema.parse({page, pageSize, total,
    totalPages: Math.ceil(total / pageSize), hasNextPage: page < Math.ceil(total / pageSize), hasPreviousPage: page > 1});
}

function isPrismaCode(e: unknown, code: string) {
  return e instanceof PrismaNamespace.PrismaClientKnownRequestError && e.code === code;
}

function governance(r: {
  governanceStatus: string; contentOwnerId: string | null;
  lastReviewedAt: Date | null; reviewDueAt: Date | null; expiresAt: Date | null;
}) {
  return CmsGovernanceSummarySchema.parse({
    status: r.governanceStatus, contentOwnerId: r.contentOwnerId,
    lastReviewedAt: r.lastReviewedAt?.toISOString() ?? null,
    reviewDueAt: r.reviewDueAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
  });
}

function translationState(locale: Locale, active: boolean, actorId: string, now: Date) {
  const pub = locale === "id" && active;
  return {status: pub ? "PUBLISHED" as const : "DRAFT" as const, translatorId: actorId,
    reviewerId: pub ? actorId : null, reviewedAt: pub ? now : null};
}

const RAW_LIST_QUERY_SCHEMA = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
}).strict();

export function normalizeFacilitySearchParams(params: URLSearchParams) {
  try {
    const raw = RAW_LIST_QUERY_SCHEMA.parse(collectDuplicateAwareSearchParams(params));
    return {ok: true as const, data: FacilityListQuerySchema.parse({
      page: raw.page === undefined ? 1 : Number(raw.page),
      pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
      search: raw.search ?? "",
      direction: raw.direction ?? "ASC",
      active: raw.active ?? "ALL",
    })};
  } catch { return {ok: false as const, code: "REQUEST_INVALID" as const}; }
}

async function validateCoverMedia(tx: Prisma.TransactionClient, mediaId: string | null) {
  if (!mediaId) return true;
  const m = await tx.media.findUnique({where: {id: mediaId}, select: MEDIA_SELECT});
  return publicMedia(m, "/uploads") !== null;
}

async function replaceFacilityTranslations(
  tx: Prisma.TransactionClient,
  id: string,
  input: FacilityInput,
  actorId: string,
  version: number,
  now: Date,
) {
  const entries = Object.entries(input.translations) as Array<[Locale, FacilityInput["translations"]["id"]]>;
  await tx.facilityTranslation.deleteMany({where: {facilityId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const state = translationState(locale, input.isActive, actorId, now);
    await tx.facilityTranslation.upsert({
      where: {facilityId_locale: {facilityId: id, locale}},
      create: {facilityId: id, locale, name: val.name, description: val.description,
        ...state, sourceVersion: version},
      update: {name: val.name, description: val.description,
        ...state, sourceVersion: version},
    });
  }
}

async function facilityRevisions(
  tx: Prisma.TransactionClient,
  id: string,
  input: FacilityInput,
  actorId: string,
  version: number,
  action: "CREATE" | "UPDATE",
  now: Date,
) {
  await createContentRevision(tx, {
    resourceType: "Facility", resourceId: id, version, actorId, changeSummary: action,
    snapshot: {
      slug: input.slug, type: input.type, isActive: input.isActive, order: input.order,
      coverMediaId: input.coverMediaId, contentOwnerId: input.contentOwnerId, version,
    },
  });
  for (const [locale, val] of Object.entries(input.translations) as Array<[Locale, FacilityInput["translations"]["id"]]>) {
    await createContentRevision(tx, {
      resourceType: "Facility", resourceId: id, locale, version, actorId, changeSummary: action,
      snapshot: {locale, ...val, ...translationState(locale, input.isActive, actorId, now), sourceVersion: version},
    });
  }
}

async function createFacility(
  tx: Prisma.TransactionClient,
  input: FacilityInput,
  actorId: string,
  now: Date,
) {
  if (!await validateCoverMedia(tx, input.coverMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  const row = await tx.facility.create({
    data: {
      slug: input.slug, type: input.type, isActive: input.isActive,
      order: input.order, coverMediaId: input.coverMediaId,
      contentOwnerId: input.contentOwnerId,
    },
    select: {id: true, version: true},
  });
  await replaceFacilityTranslations(tx, row.id, input, actorId, row.version, now);
  await facilityRevisions(tx, row.id, input, actorId, row.version, "CREATE", now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "Facility", resourceId: row.id}});
  return FacilityMutationResultSchema.parse({ok: true, id: row.id, version: row.version});
}

async function updateFacility(
  tx: Prisma.TransactionClient,
  id: string,
  expectedVersion: number,
  input: FacilityInput,
  actorId: string,
  now: Date,
) {
  const current = await tx.facility.findUnique({where: {id}, select: {id: true, slug: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  if (current.slug !== input.slug) return {ok: false, code: "SLUG_CONFLICT"} as const;
  if (!await validateCoverMedia(tx, input.coverMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;

  const claim = await tx.facility.updateMany({
    where: {id, version: expectedVersion},
    data: {version: {increment: 1}},
  });
  if (claim.count !== 1) return {ok: false, code: "VERSION_CONFLICT"} as const;
  const version = expectedVersion + 1;

  await tx.facility.update({
    where: {id},
    data: {
      type: input.type, isActive: input.isActive, order: input.order,
      coverMediaId: input.coverMediaId, contentOwnerId: input.contentOwnerId,
    },
  });
  await replaceFacilityTranslations(tx, id, input, actorId, version, now);
  await facilityRevisions(tx, id, input, actorId, version, "UPDATE", now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "Facility", resourceId: id}});
  return FacilityMutationResultSchema.parse({ok: true, id, version});
}

async function deleteFacility(
  tx: Prisma.TransactionClient,
  id: string,
  actorId: string,
) {
  const row = await tx.facility.findUnique({where: {id}, select: {id: true}});
  if (!row) return {ok: false, code: "NOT_FOUND"} as const;
  await tx.facility.delete({where: {id}});
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "Facility", resourceId: id, metadata: {operation: "DELETE"}}});
  return FacilityMutationResultSchema.parse({ok: true, id, version: 0});
}

// ── ADMIN LIST ───────────────────────────────────────────────────────

export async function listFacilities(
  prisma: FacilityDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  rawUploadBase = "/uploads",
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = FacilityListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data;
  const active = query.active === "ALL" ? {} : {isActive: query.active === "ACTIVE"};
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};

  try {
    const where: Prisma.FacilityWhereInput = {
      ...active,
      ...(query.search === "" ? {} : {OR: [
        {slug: {contains: query.search, mode: "insensitive"}},
        {translations: {some: {name: {contains: query.search, mode: "insensitive"}}}},
      ]}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.facility.findMany({
        where, orderBy: [{order: direction}, {id: "asc"}], ...pagination,
        include: {translations: true, coverMedia: {select: MEDIA_SELECT}},
      }),
      prisma.facility.count({where}),
    ]);
    const items = rows.map((row) => {
      const assets: unknown[] = [];
      const cover = publicMedia(row.coverMedia as unknown as MediaRow, rawUploadBase);
      if (cover) assets.push({kind: "MEDIA", media: cover});
      return FacilityAdminViewSchema.parse({
        id: row.id, slug: row.slug, type: row.type, isActive: row.isActive,
        order: row.order, version: row.version, governance: governance(row),
        translations: row.translations.map(t => ({
          locale: t.locale, status: t.status, sourceVersion: t.sourceVersion,
          translatorId: t.translatorId, reviewerId: t.reviewerId,
          reviewedAt: t.reviewedAt?.toISOString() ?? null,
        })),
        assets,
      });
    });
    return {ok: true as const, data: FacilityListResultSchema.parse({items, page: pageMetadata(query.page, query.pageSize, total)})};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

// ── ADMIN DETAIL ─────────────────────────────────────────────────────

export async function getFacilityDetail(
  prisma: FacilityDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  rawUploadBase = "/uploads",
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = z.object({id: z.string().trim().min(1).max(200)}).safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const {id} = parsed.data;
  try {
    const row = await prisma.facility.findUnique({
      where: {id},
      include: {translations: true, coverMedia: {select: MEDIA_SELECT}},
    });
    if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
    const assets: unknown[] = [];
    const cover = publicMedia(row.coverMedia as unknown as MediaRow, rawUploadBase);
    if (cover) assets.push({kind: "MEDIA", media: cover});
    const input = FacilityInputSchema.parse({
      slug: row.slug,
      type: row.type,
      isActive: row.isActive,
      order: row.order,
      coverMediaId: row.coverMediaId,
      contentOwnerId: row.contentOwnerId,
      translations: Object.fromEntries(row.translations.map((translation) => [
        translation.locale,
        {name: translation.name, description: translation.description},
      ])),
    });
    return {ok: true as const, data: FacilityAdminDetailSchema.parse({
      id: row.id, slug: row.slug, type: row.type, isActive: row.isActive,
      order: row.order, version: row.version, governance: governance(row),
      translations: row.translations.map(t => ({
        locale: t.locale, status: t.status, sourceVersion: t.sourceVersion,
        translatorId: t.translatorId, reviewerId: t.reviewerId,
        reviewedAt: t.reviewedAt?.toISOString() ?? null,
      })),
      assets, input, cover,
    })};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

// ── MUTATIONS ────────────────────────────────────────────────────────

export async function executeFacilityCommand(
  prisma: FacilityDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<FacilityMutationResult> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = FacilityCommandSchema.safeParse(rawCommand);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"};
  const command = parsed.data as FacilityCommand;

  try {
    return await prisma.$transaction(async (tx) => {
      if (command.action === "DELETE") return deleteFacility(tx, command.id, actor.userId);
      if (command.action === "CREATE") return createFacility(tx, command.payload as FacilityInput, actor.userId, now);
      return updateFacility(tx, command.mutation.id, command.mutation.expectedVersion,
        command.payload as FacilityInput, actor.userId, now);
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"};
    if (isPrismaCode(error, "P2003")) return {ok: false, code: "IN_USE"};
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

// ── PUBLIC ───────────────────────────────────────────────────────────

function resolvedTranslation<T extends {locale: string; status: string}>(translations: T[], locale: string): T | null {
  return translations.find(t => t.locale === locale && t.status === "PUBLISHED")
    ?? translations.find(t => t.locale === "id" && t.status === "PUBLISHED") ?? null;
}

export async function listPublicFacilities(
  prisma: FacilityDatabase,
  rawQuery: unknown,
  rawUploadBase = "/uploads",
  locale: Locale = "id",
) {
  const parsed = FacilityListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data;
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};

  try {
    const where: Prisma.FacilityWhereInput = {
      isActive: true,
      translations: {some: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
      ...(query.search === "" ? {} : {OR: [
        {translations: {some: {status: "PUBLISHED", name: {contains: query.search, mode: "insensitive"}}}},
      ]}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.facility.findMany({
        where, orderBy: [{order: direction}, {id: "asc"}], ...pagination,
        include: {translations: {where: {status: "PUBLISHED"}}, coverMedia: {select: MEDIA_SELECT}},
      }),
      prisma.facility.count({where}),
    ]);
    const items = rows.flatMap((row) => {
      const t = resolvedTranslation(row.translations, locale);
      if (!t) return [];
      const item = PublicFacilityItemSchema.safeParse({
        id: row.id, slug: row.slug, type: row.type, order: row.order,
        cover: publicMedia(row.coverMedia as unknown as MediaRow, rawUploadBase),
        translation: {
          requestedLocale: locale,
          resolvedLocale: t.locale,
          isFallback: t.locale !== locale,
          name: t.name,
          description: t.description,
        },
      });
      return item.success ? [item.data] : [];
    });
    return {ok: true as const, data: PublicFacilityListResultSchema.parse({items, page: pageMetadata(query.page, query.pageSize, total)})};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export async function listPublicHomeFacilities(
  prisma: FacilityDatabase,
  locale: Locale,
  limit: number,
  rawUploadBase = "/uploads",
): Promise<PublicHomeFacility[]> {
  const safeLimit = Math.max(0, Math.min(limit, 12));
  if (safeLimit === 0) return [];
  const result = await listPublicFacilities(prisma, {
    page: 1,
    pageSize: safeLimit <= 10 ? 10 : 20,
    search: "",
    direction: "ASC",
    active: "ACTIVE",
  }, rawUploadBase, locale);
  if (!result.ok) return [];
  return result.data.items.map((item) => ({
    id: item.id,
    slug: item.slug,
    image: item.cover,
    caption: item.translation.name,
    description: item.translation.description,
  })).slice(0, safeLimit);
}

export function facilityHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["VERSION_CONFLICT", "SLUG_CONFLICT", "IN_USE"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
