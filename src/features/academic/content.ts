import {z} from "zod";

import {
  AcademicAdminViewSchema,
  AcademicCommandSchema,
  AcademicListQuerySchema,
  AcademicListResultSchema,
  AcademicMutationResultSchema,
  CommunityServiceInputSchema,
  PublicAcademicDirectoryItemSchema,
  ResearchInputSchema,
  UnitInputSchema,
  type AcademicCommand,
  type AcademicMutationResult,
} from "@/contracts/academic";
import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {CmsPageMetadataSchema, collectDuplicateAwareSearchParams} from "@/contracts/cms";
import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {createContentRevision} from "@/lib/db/revision";
import {sanitizeRichTextHtml} from "@/lib/security/sanitize";

export type AcademicContentDatabase = ReturnType<typeof createPrismaClient>;

type Resource = "RESEARCH" | "COMMUNITY_SERVICE" | "UNIT";
type Locale = "id" | "en" | "ar";
type ResearchInput = z.infer<typeof ResearchInputSchema>;
type CommunityInput = z.infer<typeof CommunityServiceInputSchema>;
type UnitInput = z.infer<typeof UnitInputSchema>;

const RESOURCES = new Set<Resource>(["RESEARCH", "COMMUNITY_SERVICE", "UNIT"]);
const RAW_QUERY_SCHEMA = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  resource: z.enum(["RESEARCH", "COMMUNITY_SERVICE", "UNIT"]),
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
  studyProgramId: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/u).optional(),
  year: z.string().regex(/^\d{4}$/u).optional(),
}).strict();

function actorOrNull(raw: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(raw);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function page(page: number, pageSize: 10 | 20 | 50, total: number) {
  const totalPages = Math.ceil(total / pageSize);
  return CmsPageMetadataSchema.parse({page, pageSize, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1});
}

function workflow(row: {
  locale: Locale; status: "DRAFT" | "REVIEWED" | "PUBLISHED" | "STALE";
  sourceVersion: number; translatorId: string | null; reviewerId: string | null; reviewedAt: Date | null;
}) {
  return {
    locale: row.locale,
    status: row.status,
    sourceVersion: row.sourceVersion,
    translatorId: row.translatorId,
    reviewerId: row.reviewerId,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

function governance(row: {
  governanceStatus: string; contentOwnerId: string | null; lastReviewedAt: Date | null;
  reviewDueAt: Date | null; expiresAt: Date | null;
}) {
  return {
    status: row.governanceStatus, contentOwnerId: row.contentOwnerId,
    lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
    reviewDueAt: row.reviewDueAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

function state(locale: Locale, publishId: boolean, actorId: string, now: Date) {
  const published = locale === "id" && publishId;
  return {
    status: published ? "PUBLISHED" as const : "DRAFT" as const,
    translatorId: actorId,
    reviewerId: published ? actorId : null,
    reviewedAt: published ? now : null,
  };
}

function isPrismaCode(error: unknown, code: string) {
  return error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === code;
}

export function normalizeAcademicContentSearchParams(params: URLSearchParams) {
  try {
    const raw = RAW_QUERY_SCHEMA.parse(collectDuplicateAwareSearchParams(params));
    return {ok: true as const, data: AcademicListQuerySchema.parse({
      page: raw.page === undefined ? 1 : Number(raw.page),
      pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
      search: raw.search ?? "",
      direction: raw.direction ?? "DESC",
      resource: raw.resource,
      active: raw.active ?? "ALL",
      studyProgramId: raw.studyProgramId ?? null,
      year: raw.year === undefined ? null : Number(raw.year),
    })};
  } catch {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
}

export async function listAcademicContent(
  prisma: AcademicContentDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = AcademicListQuerySchema.safeParse(rawQuery);
  if (!parsed.success || !RESOURCES.has(parsed.data.resource as Resource)) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data;
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
  try {
    if (query.resource === "RESEARCH") {
      const where: Prisma.ResearchWhereInput = {
        ...(query.year ? {year: query.year} : {}),
        ...(query.studyProgramId ? {lecturers: {some: {lecturer: {studyProgramId: query.studyProgramId}}}} : {}),
        ...(query.search === "" ? {} : {OR: [
          {slug: {contains: query.search, mode: "insensitive"}},
          {translations: {some: {title: {contains: query.search, mode: "insensitive"}}}},
        ]}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.research.findMany({where, orderBy: [{year: direction}, {slug: "asc"}, {id: "asc"}], ...pagination, include: {translations: true}}),
        prisma.research.count({where}),
      ]);
      const items = rows.map((row) => AcademicAdminViewSchema.parse({
        id: row.id, resource: "RESEARCH", slug: row.slug, version: null, isActive: null,
        translations: row.translations.map(workflow), governance: null, assets: [],
      }));
      return {ok: true as const, data: AcademicListResultSchema.parse({items, page: page(query.page, query.pageSize, total)})};
    }
    if (query.resource === "COMMUNITY_SERVICE") {
      const where: Prisma.CommunityServiceWhereInput = {
        ...(query.year ? {year: query.year} : {}),
        ...(query.studyProgramId ? {lecturers: {some: {lecturer: {studyProgramId: query.studyProgramId}}}} : {}),
        ...(query.search === "" ? {} : {OR: [
          {slug: {contains: query.search, mode: "insensitive"}},
          {translations: {some: {title: {contains: query.search, mode: "insensitive"}}}},
        ]}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.communityService.findMany({where, orderBy: [{year: direction}, {slug: "asc"}, {id: "asc"}], ...pagination, include: {translations: true}}),
        prisma.communityService.count({where}),
      ]);
      const items = rows.map((row) => AcademicAdminViewSchema.parse({
        id: row.id, resource: "COMMUNITY_SERVICE", slug: row.slug, version: null, isActive: null,
        translations: row.translations.map(workflow), governance: null, assets: [],
      }));
      return {ok: true as const, data: AcademicListResultSchema.parse({items, page: page(query.page, query.pageSize, total)})};
    }
    const where: Prisma.UnitWhereInput = {
      ...(query.active === "ALL" ? {} : {isActive: query.active === "ACTIVE"}),
      ...(query.studyProgramId || query.year ? {id: "__unsupported_filter__"} : {}),
      ...(query.search === "" ? {} : {OR: [
        {slug: {contains: query.search, mode: "insensitive"}},
        {translations: {some: {name: {contains: query.search, mode: "insensitive"}}}},
      ]}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.unit.findMany({where, orderBy: [{slug: direction}, {id: "asc"}], ...pagination, include: {translations: true}}),
      prisma.unit.count({where}),
    ]);
    const items = rows.map((row) => AcademicAdminViewSchema.parse({
      id: row.id, resource: "UNIT", slug: row.slug, version: row.version, isActive: row.isActive,
      translations: row.translations.map(workflow), governance: governance(row), assets: [],
    }));
    return {ok: true as const, data: AcademicListResultSchema.parse({items, page: page(query.page, query.pageSize, total)})};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

function sanitizeResearch(input: ResearchInput) {
  const translations = Object.fromEntries(Object.entries(input.translations).map(([locale, value]) => [locale, {
    ...value, abstract: value.abstract === null ? null : sanitizeRichTextHtml(value.abstract),
  }]));
  return ResearchInputSchema.parse({...input, translations});
}

function sanitizeCommunity(input: CommunityInput) {
  const translations = Object.fromEntries(Object.entries(input.translations).map(([locale, value]) => [locale, {
    ...value, description: value.description === null ? null : sanitizeRichTextHtml(value.description),
  }]));
  return CommunityServiceInputSchema.parse({...input, translations});
}

function sanitizeUnit(input: UnitInput) {
  const translations = Object.fromEntries(Object.entries(input.translations).map(([locale, value]) => [locale, {
    ...value, description: value.description === null ? null : sanitizeRichTextHtml(value.description),
  }]));
  return UnitInputSchema.parse({...input, translations});
}

async function lecturersExist(tx: Prisma.TransactionClient, ids: string[]) {
  return ids.length === 0 || await tx.lecturer.count({where: {id: {in: ids}}}) === ids.length;
}

async function replaceResearchTranslations(tx: Prisma.TransactionClient, id: string, input: ResearchInput, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, ResearchInput["translations"]["id"]]>;
  await tx.researchTranslation.deleteMany({where: {researchId: id, locale: {notIn: entries.map(([locale]) => locale)}}});
  for (const [locale, value] of entries) await tx.researchTranslation.upsert({
    where: {researchId_locale: {researchId: id, locale}},
    create: {researchId: id, locale, ...value, ...state(locale, true, actorId, now), sourceVersion: 1},
    update: {...value, ...state(locale, true, actorId, now), sourceVersion: {increment: 1}},
  });
}

async function replaceCommunityTranslations(tx: Prisma.TransactionClient, id: string, input: CommunityInput, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, CommunityInput["translations"]["id"]]>;
  await tx.communityServiceTranslation.deleteMany({where: {communityServiceId: id, locale: {notIn: entries.map(([locale]) => locale)}}});
  for (const [locale, value] of entries) await tx.communityServiceTranslation.upsert({
    where: {communityServiceId_locale: {communityServiceId: id, locale}},
    create: {communityServiceId: id, locale, ...value, ...state(locale, true, actorId, now), sourceVersion: 1},
    update: {...value, ...state(locale, true, actorId, now), sourceVersion: {increment: 1}},
  });
}

async function replaceUnitTranslations(tx: Prisma.TransactionClient, id: string, input: UnitInput, actorId: string, version: number, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, UnitInput["translations"]["id"]]>;
  await tx.unitTranslation.deleteMany({where: {unitId: id, locale: {notIn: entries.map(([locale]) => locale)}}});
  for (const [locale, value] of entries) await tx.unitTranslation.upsert({
    where: {unitId_locale: {unitId: id, locale}},
    create: {unitId: id, locale, ...value, ...state(locale, input.isActive, actorId, now), sourceVersion: version},
    update: {...value, ...state(locale, input.isActive, actorId, now), sourceVersion: version},
  });
}

async function unitRevisions(tx: Prisma.TransactionClient, id: string, input: UnitInput, actorId: string, version: number, action: string, now: Date) {
  await createContentRevision(tx, {resourceType: "Unit", resourceId: id, version, actorId, changeSummary: action, snapshot: {
    slug: input.slug, type: input.type, email: input.email, phone: input.phone,
    externalUrl: input.externalUrl?.href ?? null, isActive: input.isActive,
    contentOwnerId: input.contentOwnerId, version,
  }});
  for (const [locale, value] of Object.entries(input.translations) as Array<[Locale, UnitInput["translations"]["id"]]>) {
    await createContentRevision(tx, {resourceType: "Unit", resourceId: id, locale, version, actorId, changeSummary: action,
      snapshot: {locale, ...value, ...state(locale, input.isActive, actorId, now), sourceVersion: version}});
  }
}

async function mutateResearch(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: ResearchInput, mutation: {id: string; expectedVersion: number | null} | null, actorId: string, now: Date) {
  if (mutation?.expectedVersion !== null && mutation) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await lecturersExist(tx, input.lecturerIds)) return {ok: false, code: "RELATION_INVALID"} as const;
  let id: string;
  if (action === "CREATE") {
    id = (await tx.research.create({data: {slug: input.slug, year: input.year, documentUrl: input.documentUrl?.href ?? null}, select: {id: true}})).id;
  } else {
    if (!mutation || !await tx.research.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    id = mutation.id;
    await tx.research.update({where: {id}, data: {slug: input.slug, year: input.year, documentUrl: input.documentUrl?.href ?? null}});
  }
  await replaceResearchTranslations(tx, id, input, actorId, now);
  await tx.lecturerResearch.deleteMany({where: {researchId: id}});
  if (input.lecturerIds.length) await tx.lecturerResearch.createMany({data: input.lecturerIds.map((lecturerId) => ({lecturerId, researchId: id}))});
  await tx.activityLog.create({data: {actorId, action, resourceType: "Research", resourceId: id}});
  return AcademicMutationResultSchema.parse({ok: true, id, resource: "RESEARCH", version: null});
}

async function mutateCommunity(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: CommunityInput, mutation: {id: string; expectedVersion: number | null} | null, actorId: string, now: Date) {
  if (mutation?.expectedVersion !== null && mutation) return {ok: false, code: "VALIDATION_FAILED"} as const;
  if (!await lecturersExist(tx, input.lecturerIds)) return {ok: false, code: "RELATION_INVALID"} as const;
  let id: string;
  if (action === "CREATE") {
    id = (await tx.communityService.create({data: {slug: input.slug, year: input.year, location: input.location, documentUrl: input.documentUrl?.href ?? null}, select: {id: true}})).id;
  } else {
    if (!mutation || !await tx.communityService.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    id = mutation.id;
    await tx.communityService.update({where: {id}, data: {slug: input.slug, year: input.year, location: input.location, documentUrl: input.documentUrl?.href ?? null}});
  }
  await replaceCommunityTranslations(tx, id, input, actorId, now);
  await tx.lecturerCommunityService.deleteMany({where: {communityServiceId: id}});
  if (input.lecturerIds.length) await tx.lecturerCommunityService.createMany({data: input.lecturerIds.map((lecturerId) => ({lecturerId, communityServiceId: id}))});
  await tx.activityLog.create({data: {actorId, action, resourceType: "CommunityService", resourceId: id}});
  return AcademicMutationResultSchema.parse({ok: true, id, resource: "COMMUNITY_SERVICE", version: null});
}

async function mutateUnit(tx: Prisma.TransactionClient, action: "CREATE" | "UPDATE", input: UnitInput, mutation: {id: string; expectedVersion: number | null} | null, actorId: string, now: Date) {
  let id: string;
  let version: number;
  if (action === "CREATE") {
    const row = await tx.unit.create({data: {
      slug: input.slug, type: input.type, email: input.email, phone: input.phone,
      externalUrl: input.externalUrl?.href ?? null, isActive: input.isActive, contentOwnerId: input.contentOwnerId,
    }, select: {id: true, version: true}});
    id = row.id; version = row.version;
  } else {
    if (!mutation) return {ok: false, code: "VALIDATION_FAILED"} as const;
    if (mutation.expectedVersion === null) return {ok: false, code: "VALIDATION_FAILED"} as const;
    if (!await tx.unit.findUnique({where: {id: mutation.id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    const claimed = await tx.unit.updateMany({where: {id: mutation.id, version: mutation.expectedVersion}, data: {version: {increment: 1}}});
    if (claimed.count !== 1) return {ok: false, code: "VERSION_CONFLICT"} as const;
    id = mutation.id; version = mutation.expectedVersion + 1;
    await tx.unit.update({where: {id}, data: {
      slug: input.slug, type: input.type, email: input.email, phone: input.phone,
      externalUrl: input.externalUrl?.href ?? null, isActive: input.isActive, contentOwnerId: input.contentOwnerId,
    }});
  }
  await replaceUnitTranslations(tx, id, input, actorId, version, now);
  await unitRevisions(tx, id, input, actorId, version, action, now);
  await tx.activityLog.create({data: {actorId, action, resourceType: "Unit", resourceId: id}});
  return AcademicMutationResultSchema.parse({ok: true, id, resource: "UNIT", version});
}

async function remove(tx: Prisma.TransactionClient, resource: Resource, id: string, actorId: string) {
  if (resource === "RESEARCH") {
    if (!await tx.research.findUnique({where: {id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    await tx.research.delete({where: {id}});
  } else if (resource === "COMMUNITY_SERVICE") {
    if (!await tx.communityService.findUnique({where: {id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    await tx.communityService.delete({where: {id}});
  } else {
    if (!await tx.unit.findUnique({where: {id}, select: {id: true}})) return {ok: false, code: "NOT_FOUND"} as const;
    await tx.unit.delete({where: {id}});
  }
  const resourceType = resource === "RESEARCH" ? "Research" : resource === "COMMUNITY_SERVICE" ? "CommunityService" : "Unit";
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType, resourceId: id, metadata: {operation: "DELETE"}}});
  return AcademicMutationResultSchema.parse({ok: true, id, resource, version: null});
}

export async function executeAcademicContentCommand(
  prisma: AcademicContentDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<AcademicMutationResult> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = AcademicCommandSchema.safeParse(rawCommand);
  if (!parsed.success || !RESOURCES.has(parsed.data.resource as Resource)) return {ok: false, code: "VALIDATION_FAILED"};
  const command = parsed.data as AcademicCommand & {resource: Resource};
  try {
    const payload = command.action === "DELETE" ? null
      : command.resource === "RESEARCH" ? sanitizeResearch(command.payload as ResearchInput)
      : command.resource === "COMMUNITY_SERVICE" ? sanitizeCommunity(command.payload as CommunityInput)
      : sanitizeUnit(command.payload as UnitInput);
    return await prisma.$transaction(async (tx) => {
      if (command.action === "DELETE") return remove(tx, command.resource, command.id, actor.userId);
      const mutation = command.action === "UPDATE" ? command.mutation : null;
      if (command.resource === "RESEARCH") return mutateResearch(tx, command.action, payload as ResearchInput, mutation, actor.userId, now);
      if (command.resource === "COMMUNITY_SERVICE") return mutateCommunity(tx, command.action, payload as CommunityInput, mutation, actor.userId, now);
      return mutateUnit(tx, command.action, payload as UnitInput, mutation, actor.userId, now);
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "SLUG_CONFLICT"};
    if (isPrismaCode(error, "P2003")) return {ok: false, code: "IN_USE"};
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

function resolve<T extends {locale: Locale; status: string}>(translations: T[], locale: Locale) {
  return translations.find((item) => item.locale === locale && item.status === "PUBLISHED")
    ?? translations.find((item) => item.locale === "id" && item.status === "PUBLISHED") ?? null;
}

export async function listPublicAcademicContent(prisma: AcademicContentDatabase, rawQuery: unknown, locale: Locale) {
  const parsed = AcademicListQuerySchema.safeParse(rawQuery);
  if (!parsed.success || !RESOURCES.has(parsed.data.resource as Resource)) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data;
  const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  const published = {some: {status: "PUBLISHED" as const, locale: {in: locale === "id" ? ["id" as const] : [locale, "id" as const]}}};
  try {
    if (query.resource === "RESEARCH") {
      const where: Prisma.ResearchWhereInput = {translations: published, ...(query.year ? {year: query.year} : {}),
        ...(query.studyProgramId ? {lecturers: {some: {lecturer: {studyProgramId: query.studyProgramId}}}} : {}),
        ...(query.search ? {AND: [{translations: {some: {status: "PUBLISHED", title: {contains: query.search, mode: "insensitive"}}}}]} : {})};
      const [rows, total] = await prisma.$transaction([
        prisma.research.findMany({where, orderBy: [{year: direction}, {slug: "asc"}], ...pagination, include: {translations: {where: {status: "PUBLISHED"}}}}),
        prisma.research.count({where}),
      ]);
      const items = rows.flatMap((row) => { const translation = resolve(row.translations, locale); if (!translation) return [];
        return [PublicAcademicDirectoryItemSchema.parse({id: row.id, resource: "RESEARCH", slug: row.slug, name: translation.title, secondaryText: String(row.year), institutionalEmail: null, photo: null, studyProgram: null})]; });
      return {ok: true as const, data: {items, page: page(query.page, query.pageSize, total)}};
    }
    if (query.resource === "COMMUNITY_SERVICE") {
      const where: Prisma.CommunityServiceWhereInput = {translations: published, ...(query.year ? {year: query.year} : {}),
        ...(query.studyProgramId ? {lecturers: {some: {lecturer: {studyProgramId: query.studyProgramId}}}} : {}),
        ...(query.search ? {AND: [{translations: {some: {status: "PUBLISHED", title: {contains: query.search, mode: "insensitive"}}}}]} : {})};
      const [rows, total] = await prisma.$transaction([
        prisma.communityService.findMany({where, orderBy: [{year: direction}, {slug: "asc"}], ...pagination, include: {translations: {where: {status: "PUBLISHED"}}}}),
        prisma.communityService.count({where}),
      ]);
      const items = rows.flatMap((row) => { const translation = resolve(row.translations, locale); if (!translation) return [];
        return [PublicAcademicDirectoryItemSchema.parse({id: row.id, resource: "COMMUNITY_SERVICE", slug: row.slug, name: translation.title, secondaryText: row.location ?? String(row.year), institutionalEmail: null, photo: null, studyProgram: null})]; });
      return {ok: true as const, data: {items, page: page(query.page, query.pageSize, total)}};
    }
    if (query.studyProgramId || query.year) return {ok: true as const, data: {items: [], page: page(query.page, query.pageSize, 0)}};
    const where: Prisma.UnitWhereInput = {isActive: true, translations: published,
      ...(query.search ? {AND: [{translations: {some: {status: "PUBLISHED", name: {contains: query.search, mode: "insensitive"}}}}]} : {})};
    const [rows, total] = await prisma.$transaction([
      prisma.unit.findMany({where, orderBy: [{slug: direction}, {id: "asc"}], ...pagination, include: {translations: {where: {status: "PUBLISHED"}}}}),
      prisma.unit.count({where}),
    ]);
    const items = rows.flatMap((row) => { const translation = resolve(row.translations, locale); if (!translation) return [];
      return [PublicAcademicDirectoryItemSchema.parse({id: row.id, resource: "UNIT", slug: row.slug, name: translation.name, secondaryText: row.type, institutionalEmail: row.email, photo: null, studyProgram: null})]; });
    return {ok: true as const, data: {items, page: page(query.page, query.pageSize, total)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export function academicContentHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["VERSION_CONFLICT", "SLUG_CONFLICT", "IN_USE"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
