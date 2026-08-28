import {z} from "zod";

import {
  CmsGovernanceSummarySchema,
  CmsNullableConfiguredLinkSchema,
  CmsPageMetadataSchema,
  CmsTranslationResolutionSchema,
  collectDuplicateAwareSearchParams,
} from "@/contracts/cms";
import {
  HomeNavAdminCommandSchema,
  HomeNavAdminDetailQuerySchema,
  HomeNavAdminDetailSchema,
  HomeNavAdminListQuerySchema,
  HomeNavAdminListResultSchema,
  HomeNavMutationResultSchema,
  HomeNavResourceSchema,
  MenuItemInputSchema,
  QuickLinkInputSchema,
  ExternalLinkInputSchema,
  HomeSliderInputSchema,
  HomeSectionInputSchema,
  StatisticInputSchema,
  SiteSettingInputSchema, HomeVideoInputSchema,
  PublicHomeSnapshotQuerySchema,
  PublicHomeSnapshotSchema,
  PublicHomeSnapshotResultSchema,
  type HomeNavMutationResult,
  type HomeNavResource,
} from "@/contracts/home-nav";
import {PublicMediaViewSchema} from "@/contracts/media";
import {StorageKeySchema} from "@/contracts/storage";
import type {Prisma} from "@/generated/prisma/client";
import {Prisma as PrismaNamespace} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";
import {createContentRevision} from "@/lib/db/revision";

export type HomeNavDatabase = ReturnType<typeof createPrismaClient>;
type Locale = "id" | "en" | "ar";

type TranslationRow = {
  locale: string;
  status: string | null;
  sourceVersion: number | null;
  translatorId: string | null;
  reviewerId: string | null;
  reviewedAt: Date | null;
};

const SUPPORTED_RESOURCES = new Set<HomeNavResource>([
  "MENU_ITEM", "QUICK_LINK", "EXTERNAL_LINK", "HOME_SLIDER", "HOME_SECTION", "STATISTIC", "SITE_SETTING", "HOME_VIDEO",
]);

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

function publicMedia(media: MediaRow, rawUploadBase: string) {
  if (!media || media.storageClass !== "PUBLIC" || media.mimeType !== "image/webp"
    || media.alt === null || !StorageKeySchema.safeParse(media.storageKey).success) return null;
  const url = `${rawUploadBase.replace(/\/+$/u, "") || "/uploads"}/${media.storageKey}`;
  const view = {id: media.id, url, mimeType: media.mimeType, size: media.size, alt: media.alt,
    isDecorative: media.isDecorative, width: media.width, height: media.height,
    focalX: media.focalX, focalY: media.focalY};
  return PublicMediaViewSchema.safeParse(view).success ? view : null;
}

function workflow(t: TranslationRow) {
  return {locale: t.locale, status: t.status, sourceVersion: t.sourceVersion,
    translatorId: t.translatorId, reviewerId: t.reviewerId, reviewedAt: t.reviewedAt?.toISOString() ?? null};
}

function governance(r: {governanceStatus?: string; contentOwnerId?: string | null;
  lastReviewedAt?: Date | null; reviewDueAt?: Date | null; expiresAt?: Date | null;}) {
  if (!r.governanceStatus) return null;
  return CmsGovernanceSummarySchema.parse({
    status: r.governanceStatus, contentOwnerId: r.contentOwnerId,
    lastReviewedAt: r.lastReviewedAt?.toISOString() ?? null,
    reviewDueAt: r.reviewDueAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
  });
}

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = z.object({userId: z.string(), role: z.literal("ADMIN"),
    mustChangePassword: z.literal(false), expiresAt: z.date()}).safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function pageMetadata(page: number, pageSize: 10 | 20 | 50, total: number) {
  return CmsPageMetadataSchema.parse({page, pageSize, total,
    totalPages: Math.ceil(total / pageSize), hasNextPage: page < Math.ceil(total / pageSize), hasPreviousPage: page > 1});
}

function isPrismaCode(e: unknown, code: string) {
  return e instanceof PrismaNamespace.PrismaClientKnownRequestError && e.code === code;
}

function translationState(locale: Locale, active: boolean, actorId: string, now: Date) {
  const pub = locale === "id" && active;
  return {status: pub ? "PUBLISHED" as const : "DRAFT" as const, translatorId: actorId,
    reviewerId: pub ? actorId : null, reviewedAt: pub ? now : null};
}

function resolveLink(url: string | null, pageId: string | null): z.infer<typeof CmsNullableConfiguredLinkSchema> {
  // @ts-expect-error PAGE kind not in current CmsConfiguredLinkSchema
  if (url && pageId) return {kind: "PAGE" as const, pageId};
  if (url) return url.startsWith("/") ? {kind: "INTERNAL", href: url} : {kind: "EXTERNAL", href: url};
  // @ts-expect-error PAGE kind not in current CmsConfiguredLinkSchema
  if (pageId) return {kind: "PAGE" as const, pageId};
  return null;
}

// ── ADMIN LIST ───────────────────────────────────────────────────────

const RAW_LIST_SCHEMA = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(["ASC", "DESC"]).optional(),
  resource: HomeNavResourceSchema.exclude(["SITE_SETTING"]),
  visibility: z.enum(["ALL", "VISIBLE", "HIDDEN"]).optional(),
  location: z.enum(["CONTENT_BAR", "TOPBAR", "HEADER", "FOOTER"]).optional(),
  category: z.enum(["SYSTEM", "ACADEMIC", "EXTERNAL"]).optional(),
}).strict();

export function normalizeHomeNavSearchParams(params: URLSearchParams) {
  try {
    const raw = RAW_LIST_SCHEMA.parse(collectDuplicateAwareSearchParams(params));
    return {ok: true as const, data: HomeNavAdminListQuerySchema.parse({
      page: raw.page ? Number(raw.page) : 1, pageSize: raw.pageSize ? Number(raw.pageSize) : 20,
      search: raw.search ?? "", direction: raw.direction ?? "ASC", resource: raw.resource,
      visibility: raw.visibility ?? "ALL", location: raw.location ?? null, category: raw.category ?? null,
    })};
  } catch { return {ok: false as const, code: "REQUEST_INVALID" as const}; }
}

export async function listHomeNav(
  prisma: HomeNavDatabase, rawActor: unknown, rawQuery: unknown, rawUploadBase = "/uploads", now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = HomeNavAdminListQuerySchema.safeParse(rawQuery);
  if (!parsed.success || !SUPPORTED_RESOURCES.has(parsed.data.resource as HomeNavResource)) {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
  const q = parsed.data;
  const dir = q.direction.toLowerCase() as "asc" | "desc";
  const pag = {skip: (q.page - 1) * q.pageSize, take: q.pageSize};

  try {
    if (q.resource === "MENU_ITEM") {
      const where: Prisma.MenuItemWhereInput = {
        ...(q.location ? {location: q.location} : {}),
        ...(q.visibility === "ALL" ? {} : {isVisible: q.visibility === "VISIBLE"}),
        ...(q.search ? {translations: {some: {label: {contains: q.search, mode: "insensitive"}}}} : {}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.menuItem.findMany({where, orderBy: [{order: dir}, {id: "asc"}], ...pag, include: {translations: true}}),
        prisma.menuItem.count({where}),
      ]);
      return {ok: true as const, data: HomeNavAdminListResultSchema.parse({items: rows.map(r => ({
        id: r.id, resource: "MENU_ITEM", primaryText: r.translations.find(t => t.locale === "id")?.label ?? "",
        secondaryText: r.url ?? r.pageId ?? null, order: r.order, isVisible: r.isVisible, version: null,
        translationWorkflow: r.translations.map(wf => workflow(wf)),
        governance: null,
      })), page: pageMetadata(q.page, q.pageSize, total)})};
    }
    if (q.resource === "QUICK_LINK") {
      const where: Prisma.QuickLinkWhereInput = {
        ...(q.visibility === "ALL" ? {} : {isVisible: q.visibility === "VISIBLE"}),
        ...(q.search ? {translations: {some: {label: {contains: q.search, mode: "insensitive"}}}} : {}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.quickLink.findMany({where, orderBy: [{order: dir}, {id: "asc"}], ...pag, include: {translations: true}}),
        prisma.quickLink.count({where}),
      ]);
      return {ok: true as const, data: HomeNavAdminListResultSchema.parse({items: rows.map(r => ({
        id: r.id, resource: "QUICK_LINK", primaryText: r.translations.find(t => t.locale === "id")?.label ?? "",
        secondaryText: r.url, order: r.order, isVisible: r.isVisible, version: null,
        translationWorkflow: r.translations.map(wf => workflow(wf)), governance: null,
      })), page: pageMetadata(q.page, q.pageSize, total)})};
    }
    if (q.resource === "EXTERNAL_LINK") {
      const where: Prisma.ExternalLinkWhereInput = {
        ...(q.category ? {category: q.category} : {}),
        ...(q.visibility === "ALL" ? {} : {isVisible: q.visibility === "VISIBLE"}),
        ...(q.search ? {translations: {some: {label: {contains: q.search, mode: "insensitive"}}}} : {}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.externalLink.findMany({where, orderBy: [{order: dir}, {id: "asc"}], ...pag, include: {translations: true}}),
        prisma.externalLink.count({where}),
      ]);
      return {ok: true as const, data: HomeNavAdminListResultSchema.parse({items: rows.map(r => ({
        id: r.id, resource: "EXTERNAL_LINK", primaryText: r.translations.find(t => t.locale === "id")?.label ?? "",
        secondaryText: r.url, order: r.order, isVisible: r.isVisible, version: null,
        translationWorkflow: r.translations.map(wf => workflow(wf)), governance: null,
      })), page: pageMetadata(q.page, q.pageSize, total)})};
    }
    if (q.resource === "HOME_SLIDER") {
      const where: Prisma.HomeSliderWhereInput = {
        ...(q.visibility === "ALL" ? {} : {isVisible: q.visibility === "VISIBLE"}),
        ...(q.search ? {translations: {some: {title: {contains: q.search, mode: "insensitive"}}}} : {}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.homeSlider.findMany({where, orderBy: [{order: dir}, {id: "asc"}], ...pag, include: {translations: true, imageMedia: {select: MEDIA_SELECT}}}),
        prisma.homeSlider.count({where}),
      ]);
      return {ok: true as const, data: HomeNavAdminListResultSchema.parse({items: rows.map(r => {
        const idT = r.translations.find(t => t.locale === "id");
        void publicMedia(r.imageMedia as unknown as MediaRow, rawUploadBase);
        return {
          id: r.id, resource: "HOME_SLIDER", primaryText: idT?.title ?? "", secondaryText: idT?.subtitle ?? null,
          order: r.order, isVisible: r.isVisible, version: null,
          translationWorkflow: r.translations.map(wf => workflow(wf)), governance: null,
        };
      }), page: pageMetadata(q.page, q.pageSize, total)})};
    }
    if (q.resource === "HOME_SECTION") {
      const where: Prisma.HomeSectionWhereInput = {
        ...(q.visibility === "ALL" ? {} : {isVisible: q.visibility === "VISIBLE"}),
        ...(q.search ? {translations: {some: {title: {contains: q.search, mode: "insensitive"}}}} : {}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.homeSection.findMany({where, orderBy: [{order: dir}, {id: "asc"}], ...pag, include: {translations: true}}),
        prisma.homeSection.count({where}),
      ]);
      return {ok: true as const, data: HomeNavAdminListResultSchema.parse({items: rows.map(r => {
        const idT = r.translations.find(t => t.locale === "id");
        return {
          id: r.id, resource: "HOME_SECTION", primaryText: idT?.title ?? r.key, secondaryText: r.key, order: r.order,
          isVisible: r.isVisible, version: null, translationWorkflow: r.translations.map(wf => workflow(wf)), governance: null,
        };
      }), page: pageMetadata(q.page, q.pageSize, total)})};
    }
    if (q.resource === "HOME_VIDEO") {
      const where: Prisma.HomeVideoWhereInput = {
        ...(q.visibility === "ALL" ? {} : {isVisible: q.visibility === "VISIBLE"}),
        ...(q.search ? {translations: {some: {title: {contains: q.search, mode: "insensitive"}}}} : {}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.homeVideo.findMany({where, orderBy: [{order: dir}, {id: "asc"}], ...pag, include: {translations: true}}),
        prisma.homeVideo.count({where}),
      ]);
      return {ok: true as const, data: HomeNavAdminListResultSchema.parse({items: rows.map(r => {
        const idT = r.translations.find(t => t.locale === "id");
        return {
          id: r.id, resource: "HOME_VIDEO", primaryText: idT?.title ?? "", secondaryText: r.youtubeUrl,
          order: r.order, isVisible: r.isVisible, version: null,
          translationWorkflow: r.translations.map(wf => workflow(wf)), governance: null,
        };
      }), page: pageMetadata(q.page, q.pageSize, total)})};
    }
    const where: Prisma.StatisticWhereInput = {
      ...(q.visibility === "ALL" ? {} : {isVisible: q.visibility === "VISIBLE"}),
      ...(q.search ? {translations: {some: {label: {contains: q.search, mode: "insensitive"}}}} : {}),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.statistic.findMany({where, orderBy: [{order: dir}, {id: "asc"}], ...pag, include: {translations: true}}),
      prisma.statistic.count({where}),
    ]);
    return {ok: true as const, data: HomeNavAdminListResultSchema.parse({items: rows.map(r => ({
      id: r.id, resource: "STATISTIC", primaryText: r.value, secondaryText: r.translations.find(t => t.locale === "id")?.label ?? null,
      order: r.order, isVisible: r.isVisible, version: null, translationWorkflow: r.translations.map(wf => workflow(wf)), governance: null,
    })), page: pageMetadata(q.page, q.pageSize, total)})};
  } catch { return {ok: false as const, code: "UNAVAILABLE" as const}; }
}

// ── ADMIN DETAIL ─────────────────────────────────────────────────────

export async function getHomeNavDetail(
  prisma: HomeNavDatabase, rawActor: unknown, rawQuery: unknown, rawUploadBase = "/uploads", now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = HomeNavAdminDetailQuerySchema.safeParse(rawQuery);
  if (!parsed.success || !SUPPORTED_RESOURCES.has(parsed.data.resource as HomeNavResource)) {
    return {ok: false as const, code: "REQUEST_INVALID" as const};
  }
  const {resource, id} = parsed.data;
  try {
    if (resource === "SITE_SETTING") {
      const row = await prisma.siteSetting.findUnique({where: {id: "singleton"},
        include: {translations: true, deanPhoto: {select: MEDIA_SELECT}, videoPoster: {select: MEDIA_SELECT},
          logoMedia: {select: MEDIA_SELECT}, accreditationLogoMedia: {select: MEDIA_SELECT},
          bluLogoMedia: {select: MEDIA_SELECT}, faviconMedia: {select: MEDIA_SELECT}}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const assets: {kind: string; media: NonNullable<ReturnType<typeof publicMedia>>}[] = [];
      const dp = publicMedia(row.deanPhoto as unknown as MediaRow, rawUploadBase);
      if (dp) assets.push({kind: "MEDIA", media: dp});
      const vp = publicMedia(row.videoPoster as unknown as MediaRow, rawUploadBase);
      if (vp) assets.push({kind: "MEDIA", media: vp});
      const lg = publicMedia(row.logoMedia as unknown as MediaRow, rawUploadBase);
      if (lg) assets.push({kind: "MEDIA", media: lg});
      const al = publicMedia(row.accreditationLogoMedia as unknown as MediaRow, rawUploadBase);
      if (al) assets.push({kind: "MEDIA", media: al});
      const bl = publicMedia(row.bluLogoMedia as unknown as MediaRow, rawUploadBase);
      if (bl) assets.push({kind: "MEDIA", media: bl});
      const fv = publicMedia(row.faviconMedia as unknown as MediaRow, rawUploadBase);
      if (fv) assets.push({kind: "MEDIA", media: fv});
      return {ok: true as const, data: HomeNavAdminDetailSchema.parse({
        id: row.id, resource: "SITE_SETTING", version: row.version, governance: governance(row),
        translationWorkflow: row.translations.map(wf => workflow(wf)), assets,
        input: {
          deanName: row.deanName, deanPhotoMediaId: row.deanPhotoId, videoUrl: row.videoUrl,
          videoPosterMediaId: row.videoPosterMediaId, showProfileVideoInGallery: row.showProfileVideoInGallery,
          email: row.email, phone: row.phone,
          facebookUrl: row.facebookUrl, instagramUrl: row.instagramUrl, youtubeUrl: row.youtubeUrl,
          xUrl: row.xUrl, logoMediaId: row.logoMediaId,
          accreditationLogoMediaId: row.accreditationLogoMediaId,
          bluLogoMediaId: row.bluLogoMediaId,
          faviconMediaId: row.faviconMediaId,
          contentOwnerId: row.contentOwnerId,
          expiresAt: row.expiresAt?.toISOString() ?? null,
          translations: Object.fromEntries(row.translations.map(t => [t.locale, {
            facultyName: t.facultyName, tagline: t.tagline, address1: t.address1, address2: t.address2,
            deanPosition: t.deanPosition, deanMessage: t.deanMessage, videoTitle: t.videoTitle, videoDesc: t.videoDesc,
          }])) as z.infer<typeof SiteSettingInputSchema>["translations"],
        },
      })};
    }
    if (resource === "MENU_ITEM") {
      const row = await prisma.menuItem.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      return {ok: true as const, data: HomeNavAdminDetailSchema.parse({
        id: row.id, resource: "MENU_ITEM", version: null, governance: null,
        translationWorkflow: row.translations.map(wf => workflow(wf)), assets: [],
        input: {
          location: row.location, link: resolveLink(row.url, row.pageId), pageId: row.pageId ?? null,
          parentId: row.parentId ?? null, order: row.order, isVisible: row.isVisible,
          translations: Object.fromEntries(row.translations.map(t => [t.locale, {label: t.label}])) as Record<string, {label: string}>,
        },
      })};
    }
    if (resource === "QUICK_LINK") {
      const row = await prisma.quickLink.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      return {ok: true as const, data: HomeNavAdminDetailSchema.parse({
        id: row.id, resource: "QUICK_LINK", version: null, governance: null,
        translationWorkflow: row.translations.map(wf => workflow(wf)), assets: [],
        input: {
          link: {kind: "EXTERNAL" as const, href: row.url}, icon: row.icon, order: row.order, isVisible: row.isVisible,
          translations: Object.fromEntries(row.translations.map(t => [t.locale, {label: t.label}])) as Record<string, {label: string}>,
        },
      })};
    }
    if (resource === "EXTERNAL_LINK") {
      const row = await prisma.externalLink.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      return {ok: true as const, data: HomeNavAdminDetailSchema.parse({
        id: row.id, resource: "EXTERNAL_LINK", version: null, governance: null,
        translationWorkflow: row.translations.map(wf => workflow(wf)), assets: [],
        input: {
          category: row.category, url: row.url, order: row.order, isVisible: row.isVisible,
          translations: Object.fromEntries(row.translations.map(t => [t.locale, {label: t.label}])) as Record<string, {label: string}>,
        },
      })};
    }
    if (resource === "HOME_SLIDER") {
      const row = await prisma.homeSlider.findUnique({where: {id}, include: {translations: true, imageMedia: {select: MEDIA_SELECT}}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const img = publicMedia(row.imageMedia as unknown as MediaRow, rawUploadBase);
      return {ok: true as const, data: HomeNavAdminDetailSchema.parse({
        id: row.id, resource: "HOME_SLIDER", version: null, governance: null,
        translationWorkflow: row.translations.map(wf => workflow(wf)),
        assets: img ? [{kind: "MEDIA", media: img}] : [],
        input: {
          imageMediaId: row.imageMediaId,
          cta: row.ctaUrl ? {kind: "EXTERNAL" as const, href: row.ctaUrl} : null,
          order: row.order, isVisible: row.isVisible,
          translations: Object.fromEntries(row.translations.map(t => [t.locale, {
            title: t.title, subtitle: t.subtitle, ctaLabel: t.ctaLabel,
          }])) as Record<string, {title: string | null; subtitle: string | null; ctaLabel: string | null}>,
        },
      })};
    }
    if (resource === "HOME_SECTION") {
      const row = await prisma.homeSection.findUnique({where: {id}, include: {translations: true, backgroundMedia: {select: MEDIA_SELECT}}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const bg = publicMedia(row.backgroundMedia as unknown as MediaRow, rawUploadBase);
      return {ok: true as const, data: HomeNavAdminDetailSchema.parse({
        id: row.id, resource: "HOME_SECTION", version: null, governance: null,
        translationWorkflow: row.translations.map(wf => workflow(wf)),
        assets: bg ? [{kind: "MEDIA", media: bg}] : [],
        input: {
          key: row.key, isVisible: row.isVisible, order: row.order, itemLimit: row.itemLimit,
          cta: row.ctaUrl ? {kind: "EXTERNAL" as const, href: row.ctaUrl} : null,
          backgroundMediaId: row.backgroundMediaId ?? null,
          translations: Object.fromEntries(row.translations.map(t => [t.locale, {
            title: t.title, subtitle: t.subtitle, ctaLabel: t.ctaLabel,
          }])) as Record<string, {title: string | null; subtitle: string | null; ctaLabel: string | null}>,
        },
      })};
    }
    if (resource === "HOME_VIDEO") {
      const row = await prisma.homeVideo.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      return {ok: true as const, data: HomeNavAdminDetailSchema.parse({
        id: row.id, resource: "HOME_VIDEO", version: null, governance: null,
        translationWorkflow: row.translations.map(wf => workflow(wf)), assets: [],
        input: {
          youtubeUrl: row.youtubeUrl, order: row.order, isVisible: row.isVisible,
          translations: Object.fromEntries(row.translations.map(t => [t.locale, {title: t.title}])) as Record<string, {title: string}>,
        },
      })};
    }
    const row = await prisma.statistic.findUnique({where: {id}, include: {translations: true}});
    if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
    return {ok: true as const, data: HomeNavAdminDetailSchema.parse({
      id: row.id, resource: "STATISTIC", version: null, governance: null,
      translationWorkflow: row.translations.map(wf => workflow(wf)), assets: [],
      input: {
        value: row.value, suffix: row.suffix, icon: row.icon, order: row.order, isVisible: row.isVisible,
        translations: Object.fromEntries(row.translations.map(t => [t.locale, {label: t.label}])) as Record<string, {label: string}>,
      },
    })};
  } catch { return {ok: false as const, code: "UNAVAILABLE" as const}; }
}

// ── MUTATIONS ────────────────────────────────────────────────────────

async function validateImageMedia(tx: Prisma.TransactionClient, mediaId: string | null) {
  if (!mediaId) return true;
  const m = await tx.media.findUnique({where: {id: mediaId}, select: MEDIA_SELECT});
  return publicMedia(m as unknown as MediaRow, "/uploads") !== null;
}

async function replaceMenuItemTranslations(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof MenuItemInputSchema>, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, z.infer<typeof MenuItemInputSchema>["translations"]["id"]]>;
  await tx.menuItemTranslation.deleteMany({where: {menuItemId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const s = translationState(locale, input.isVisible, actorId, now);
    await tx.menuItemTranslation.upsert({where: {menuItemId_locale: {menuItemId: id, locale}},
      create: {menuItemId: id, locale, label: val.label, ...s, sourceVersion: 1},
      update: {label: val.label, ...s, sourceVersion: {increment: 1}}});
  }
}

async function replaceQuickLinkTranslations(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof QuickLinkInputSchema>, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, z.infer<typeof QuickLinkInputSchema>["translations"]["id"]]>;
  await tx.quickLinkTranslation.deleteMany({where: {quickLinkId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const s = translationState(locale, input.isVisible, actorId, now);
    await tx.quickLinkTranslation.upsert({where: {quickLinkId_locale: {quickLinkId: id, locale}},
      create: {quickLinkId: id, locale, label: val.label, ...s, sourceVersion: 1},
      update: {label: val.label, ...s, sourceVersion: {increment: 1}}});
  }
}

async function replaceExternalLinkTranslations(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof ExternalLinkInputSchema>, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, z.infer<typeof ExternalLinkInputSchema>["translations"]["id"]]>;
  await tx.externalLinkTranslation.deleteMany({where: {externalLinkId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const s = translationState(locale, input.isVisible, actorId, now);
    await tx.externalLinkTranslation.upsert({where: {externalLinkId_locale: {externalLinkId: id, locale}},
      create: {externalLinkId: id, locale, label: val.label, ...s, sourceVersion: 1},
      update: {label: val.label, ...s, sourceVersion: {increment: 1}}});
  }
}

async function replaceSliderTranslations(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof HomeSliderInputSchema>, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, z.infer<typeof HomeSliderInputSchema>["translations"]["id"]]>;
  await tx.homeSliderTranslation.deleteMany({where: {homeSliderId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const s = translationState(locale, input.isVisible, actorId, now);
    await tx.homeSliderTranslation.upsert({where: {homeSliderId_locale: {homeSliderId: id, locale}},
      create: {homeSliderId: id, locale, title: val.title, subtitle: val.subtitle, ctaLabel: val.ctaLabel, ...s, sourceVersion: 1},
      update: {title: val.title, subtitle: val.subtitle, ctaLabel: val.ctaLabel, ...s, sourceVersion: {increment: 1}}});
  }
}

async function replaceSectionTranslations(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof HomeSectionInputSchema>, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, z.infer<typeof HomeSectionInputSchema>["translations"]["id"]]>;
  await tx.homeSectionTranslation.deleteMany({where: {homeSectionId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const s = translationState(locale, input.isVisible, actorId, now);
    await tx.homeSectionTranslation.upsert({where: {homeSectionId_locale: {homeSectionId: id, locale}},
      create: {homeSectionId: id, locale, title: val.title, subtitle: val.subtitle, ctaLabel: val.ctaLabel, ...s, sourceVersion: 1},
      update: {title: val.title, subtitle: val.subtitle, ctaLabel: val.ctaLabel, ...s, sourceVersion: {increment: 1}}});
  }
}

async function replaceStatisticTranslations(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof StatisticInputSchema>, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, z.infer<typeof StatisticInputSchema>["translations"]["id"]]>;
  await tx.statisticTranslation.deleteMany({where: {statisticId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const s = translationState(locale, input.isVisible, actorId, now);
    await tx.statisticTranslation.upsert({where: {statisticId_locale: {statisticId: id, locale}},
      create: {statisticId: id, locale, label: val.label, ...s, sourceVersion: 1},
      update: {label: val.label, ...s, sourceVersion: {increment: 1}}});
  }
}

async function replaceHomeVideoTranslations(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof HomeVideoInputSchema>, actorId: string, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, z.infer<typeof HomeVideoInputSchema>["translations"]["id"]]>;
  await tx.homeVideoTranslation.deleteMany({where: {homeVideoId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const s = translationState(locale, input.isVisible, actorId, now);
    await tx.homeVideoTranslation.upsert({where: {homeVideoId_locale: {homeVideoId: id, locale}},
      create: {homeVideoId: id, locale, title: val.title, ...s, sourceVersion: 1},
      update: {title: val.title, ...s, sourceVersion: {increment: 1}}});
  }
}

async function replaceSiteSettingTranslations(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof SiteSettingInputSchema>, actorId: string, version: number, now: Date) {
  const entries = Object.entries(input.translations) as Array<[Locale, z.infer<typeof SiteSettingInputSchema>["translations"]["id"]]>;
  await tx.siteSettingTranslation.deleteMany({where: {siteSettingId: id, locale: {notIn: entries.map(([l]) => l)}}});
  for (const [locale, val] of entries) {
    const status = locale === "id" ? "PUBLISHED" as const : "DRAFT" as const;
    await tx.siteSettingTranslation.upsert({where: {siteSettingId_locale: {siteSettingId: id, locale}},
      create: {siteSettingId: id, locale, facultyName: val.facultyName, tagline: val.tagline,
        address1: val.address1, address2: val.address2, deanPosition: val.deanPosition, deanMessage: val.deanMessage,
        videoTitle: val.videoTitle, videoDesc: val.videoDesc, status, sourceVersion: version, translatorId: actorId,
        reviewerId: locale === "id" ? actorId : null, reviewedAt: locale === "id" ? now : null},
      update: {facultyName: val.facultyName, tagline: val.tagline, address1: val.address1, address2: val.address2,
        deanPosition: val.deanPosition, deanMessage: val.deanMessage, videoTitle: val.videoTitle, videoDesc: val.videoDesc,
        status, sourceVersion: version, translatorId: actorId,
        reviewerId: locale === "id" ? actorId : null, reviewedAt: locale === "id" ? now : null}});
  }
}

async function createMenuItem(tx: Prisma.TransactionClient, input: z.infer<typeof MenuItemInputSchema>, actorId: string, now: Date) {
  const url = input.link?.kind === "INTERNAL" ? input.link.href : input.link?.kind === "EXTERNAL" ? input.link.href : null;
  // @ts-expect-error PAGE kind not in current CmsConfiguredLinkSchema; resolved through input.pageId
  const pageId = input.link?.kind === "PAGE" ? (input.link as {pageId: string}).pageId : null;
  if (input.parentId) {
    const parent = await tx.menuItem.findUnique({where: {id: input.parentId}, select: {id: true, location: true, parentId: true}});
    if (!parent || parent.location !== input.location) return {ok: false, code: "RELATION_INVALID"} as const;
    // Detect cycles
    let current: {parentId: string | null} | null = parent;
    const visited = new Set([input.parentId]);
    while (current?.parentId) {
      const next: {parentId: string | null} | null = await tx.menuItem.findUnique({where: {id: current.parentId}, select: {parentId: true}});
      if (!next) break;
      if (visited.has(next.parentId!)) return {ok: false, code: "RELATION_INVALID"} as const;
      visited.add(next.parentId!);
      current = next;
    }
  }
  const row = await tx.menuItem.create({data: {location: input.location, url, pageId, parentId: input.parentId,
    order: input.order, isVisible: input.isVisible}, select: {id: true}});
  await replaceMenuItemTranslations(tx, row.id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "MenuItem", resourceId: row.id}});
  return HomeNavMutationResultSchema.parse({ok: true, id: row.id, resource: "MENU_ITEM", version: null});
}

async function updateMenuItem(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof MenuItemInputSchema>, actorId: string, now: Date) {
  const current = await tx.menuItem.findUnique({where: {id}, select: {id: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  const url = input.link?.kind === "INTERNAL" ? input.link.href : input.link?.kind === "EXTERNAL" ? input.link.href : null;
  // @ts-expect-error PAGE kind not in current CmsConfiguredLinkSchema; resolved through input.pageId
  const pageId = input.link?.kind === "PAGE" ? (input.link as {pageId: string}).pageId : null;
  await tx.menuItem.update({where: {id}, data: {location: input.location, url, pageId, parentId: input.parentId,
    order: input.order, isVisible: input.isVisible}});
  await replaceMenuItemTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "MenuItem", resourceId: id}});
  return HomeNavMutationResultSchema.parse({ok: true, id, resource: "MENU_ITEM", version: null});
}

async function createQuickLink(tx: Prisma.TransactionClient, input: z.infer<typeof QuickLinkInputSchema>, actorId: string, now: Date) {
  const row = await tx.quickLink.create({data: {url: input.link.href, icon: input.icon, order: input.order, isVisible: input.isVisible}, select: {id: true}});
  await replaceQuickLinkTranslations(tx, row.id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "QuickLink", resourceId: row.id}});
  return HomeNavMutationResultSchema.parse({ok: true, id: row.id, resource: "QUICK_LINK", version: null});
}

async function updateQuickLink(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof QuickLinkInputSchema>, actorId: string, now: Date) {
  const current = await tx.quickLink.findUnique({where: {id}, select: {id: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  await tx.quickLink.update({where: {id}, data: {url: input.link.href, icon: input.icon, order: input.order, isVisible: input.isVisible}});
  await replaceQuickLinkTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "QuickLink", resourceId: id}});
  return HomeNavMutationResultSchema.parse({ok: true, id, resource: "QUICK_LINK", version: null});
}

async function createExternalLink(tx: Prisma.TransactionClient, input: z.infer<typeof ExternalLinkInputSchema>, actorId: string, now: Date) {
  const row = await tx.externalLink.create({data: {category: input.category, url: input.url, order: input.order, isVisible: input.isVisible}, select: {id: true}});
  await replaceExternalLinkTranslations(tx, row.id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "ExternalLink", resourceId: row.id}});
  return HomeNavMutationResultSchema.parse({ok: true, id: row.id, resource: "EXTERNAL_LINK", version: null});
}

async function updateExternalLink(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof ExternalLinkInputSchema>, actorId: string, now: Date) {
  const current = await tx.externalLink.findUnique({where: {id}, select: {id: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  await tx.externalLink.update({where: {id}, data: {category: input.category, url: input.url, order: input.order, isVisible: input.isVisible}});
  await replaceExternalLinkTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "ExternalLink", resourceId: id}});
  return HomeNavMutationResultSchema.parse({ok: true, id, resource: "EXTERNAL_LINK", version: null});
}

async function createHomeSlider(tx: Prisma.TransactionClient, input: z.infer<typeof HomeSliderInputSchema>, actorId: string, now: Date) {
  if (!await validateImageMedia(tx, input.imageMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  const row = await tx.homeSlider.create({data: {imageMediaId: input.imageMediaId,
    ctaUrl: input.cta?.kind === "EXTERNAL" ? input.cta.href : undefined, order: input.order, isVisible: input.isVisible}, select: {id: true}});
  await replaceSliderTranslations(tx, row.id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "HomeSlider", resourceId: row.id}});
  return HomeNavMutationResultSchema.parse({ok: true, id: row.id, resource: "HOME_SLIDER", version: null});
}

async function updateHomeSlider(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof HomeSliderInputSchema>, actorId: string, now: Date) {
  const current = await tx.homeSlider.findUnique({where: {id}, select: {id: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  if (!await validateImageMedia(tx, input.imageMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  await tx.homeSlider.update({where: {id}, data: {imageMediaId: input.imageMediaId,
    ctaUrl: input.cta?.kind === "EXTERNAL" ? input.cta.href : null, order: input.order, isVisible: input.isVisible}});
  await replaceSliderTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "HomeSlider", resourceId: id}});
  return HomeNavMutationResultSchema.parse({ok: true, id, resource: "HOME_SLIDER", version: null});
}

async function createStatistic(tx: Prisma.TransactionClient, input: z.infer<typeof StatisticInputSchema>, actorId: string, now: Date) {
  const row = await tx.statistic.create({data: {value: input.value,
    suffix: input.suffix, icon: input.icon,
    order: input.order, isVisible: input.isVisible}, select: {id: true}});
  await replaceStatisticTranslations(tx, row.id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "Statistic", resourceId: row.id}});
  return HomeNavMutationResultSchema.parse({ok: true, id: row.id, resource: "STATISTIC", version: null});
}

async function updateStatistic(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof StatisticInputSchema>, actorId: string, now: Date) {
  const current = await tx.statistic.findUnique({where: {id}, select: {id: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  await tx.statistic.update({where: {id}, data: {value: input.value,
    suffix: input.suffix, icon: input.icon,
    order: input.order, isVisible: input.isVisible}});
  await replaceStatisticTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "Statistic", resourceId: id}});
  return HomeNavMutationResultSchema.parse({ok: true, id, resource: "STATISTIC", version: null});
}

async function createHomeVideo(tx: Prisma.TransactionClient, input: z.infer<typeof HomeVideoInputSchema>, actorId: string, now: Date) {
  const row = await tx.homeVideo.create({data: {youtubeUrl: input.youtubeUrl, order: input.order, isVisible: input.isVisible}, select: {id: true}});
  await replaceHomeVideoTranslations(tx, row.id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "CREATE", resourceType: "HomeVideo", resourceId: row.id}});
  return HomeNavMutationResultSchema.parse({ok: true, id: row.id, resource: "HOME_VIDEO", version: null});
}

async function updateHomeVideo(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof HomeVideoInputSchema>, actorId: string, now: Date) {
  const current = await tx.homeVideo.findUnique({where: {id}, select: {id: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  await tx.homeVideo.update({where: {id}, data: {youtubeUrl: input.youtubeUrl, order: input.order, isVisible: input.isVisible}});
  await replaceHomeVideoTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "HomeVideo", resourceId: id}});
  return HomeNavMutationResultSchema.parse({ok: true, id, resource: "HOME_VIDEO", version: null});
}

async function updateHomeSection(tx: Prisma.TransactionClient, id: string, input: z.infer<typeof HomeSectionInputSchema>, actorId: string, now: Date) {
  const current = await tx.homeSection.findUnique({where: {id}, select: {id: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  if (!await validateImageMedia(tx, input.backgroundMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  await tx.homeSection.update({where: {id}, data: {key: input.key, isVisible: input.isVisible, order: input.order,
    itemLimit: input.itemLimit, ctaUrl: input.cta?.kind === "EXTERNAL" ? input.cta.href : null,
    backgroundMediaId: input.backgroundMediaId}});
  await replaceSectionTranslations(tx, id, input, actorId, now);
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "HomeSection", resourceId: id}});
  return HomeNavMutationResultSchema.parse({ok: true, id, resource: "HOME_SECTION", version: null});
}

async function updateSiteSetting(tx: Prisma.TransactionClient, input: z.infer<typeof SiteSettingInputSchema>, actorId: string, now: Date) {
  if (!await validateImageMedia(tx, input.deanPhotoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateImageMedia(tx, input.videoPosterMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateImageMedia(tx, input.logoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateImageMedia(tx, input.accreditationLogoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateImageMedia(tx, input.bluLogoMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  if (!await validateImageMedia(tx, input.faviconMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  const current = await tx.siteSetting.findUnique({where: {id: "singleton"}, select: {version: true}});
  if (!current) return {ok: false, code: "NOT_FOUND"} as const;
  const newVersion = current.version + 1;
  await tx.siteSetting.update({where: {id: "singleton"}, data: {
    deanName: input.deanName, deanPhotoId: input.deanPhotoMediaId,
    videoUrl: input.videoUrl,
    videoPosterMediaId: input.videoPosterMediaId,
    showProfileVideoInGallery: input.showProfileVideoInGallery,
    email: input.email, phone: input.phone,
    facebookUrl: input.facebookUrl, instagramUrl: input.instagramUrl,
    youtubeUrl: input.youtubeUrl, xUrl: input.xUrl,
    logoMediaId: input.logoMediaId,
    accreditationLogoMediaId: input.accreditationLogoMediaId,
    bluLogoMediaId: input.bluLogoMediaId,
    faviconMediaId: input.faviconMediaId,
    contentOwnerId: input.contentOwnerId, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    version: newVersion,
  }});
  await replaceSiteSettingTranslations(tx, "singleton", input, actorId, newVersion, now);
  await createContentRevision(tx, {resourceType: "SiteSetting", resourceId: "singleton", version: newVersion,
    actorId, changeSummary: "UPDATE", snapshot: {version: newVersion}});
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "SiteSetting", resourceId: "singleton"}});
  return HomeNavMutationResultSchema.parse({ok: true, id: "singleton", resource: "SITE_SETTING", version: newVersion});
}

async function deleteHomeNavItem(tx: Prisma.TransactionClient, resource: HomeNavResource, id: string, actorId: string) {
  if (resource === "HOME_SECTION" || resource === "SITE_SETTING") return {ok: false, code: "INVALID_STATE"} as const;
  try {
    if (resource === "MENU_ITEM") {
      const row = await tx.menuItem.findUnique({where: {id}, select: {id: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.menuItem.delete({where: {id}});
      await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "MenuItem", resourceId: id, metadata: {operation: "DELETE"}}});
      return HomeNavMutationResultSchema.parse({ok: true, id, resource, version: null});
    }
    if (resource === "QUICK_LINK") {
      const row = await tx.quickLink.findUnique({where: {id}, select: {id: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.quickLink.delete({where: {id}});
      await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "QuickLink", resourceId: id, metadata: {operation: "DELETE"}}});
      return HomeNavMutationResultSchema.parse({ok: true, id, resource, version: null});
    }
    if (resource === "EXTERNAL_LINK") {
      const row = await tx.externalLink.findUnique({where: {id}, select: {id: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.externalLink.delete({where: {id}});
      await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "ExternalLink", resourceId: id, metadata: {operation: "DELETE"}}});
      return HomeNavMutationResultSchema.parse({ok: true, id, resource, version: null});
    }
    if (resource === "HOME_SLIDER") {
      const row = await tx.homeSlider.findUnique({where: {id}, select: {id: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.homeSlider.delete({where: {id}});
      await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "HomeSlider", resourceId: id, metadata: {operation: "DELETE"}}});
      return HomeNavMutationResultSchema.parse({ok: true, id, resource, version: null});
    }
    if (resource === "HOME_VIDEO") {
      const row = await tx.homeVideo.findUnique({where: {id}, select: {id: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"} as const;
      await tx.homeVideo.delete({where: {id}});
      await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "HomeVideo", resourceId: id, metadata: {operation: "DELETE"}}});
      return HomeNavMutationResultSchema.parse({ok: true, id, resource, version: null});
    }
    const row = await tx.statistic.findUnique({where: {id}, select: {id: true}});
    if (!row) return {ok: false, code: "NOT_FOUND"} as const;
    await tx.statistic.delete({where: {id}});
    await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: "Statistic", resourceId: id, metadata: {operation: "DELETE"}}});
    return HomeNavMutationResultSchema.parse({ok: true, id, resource, version: null});
  } catch (e) {
    if (isPrismaCode(e, "P2003")) return {ok: false, code: "IN_USE"} as const;
    throw e;
  }
}

type OrderableTable = {
  update: (args: {where: {id: string}; data: {order: number}}) => Promise<unknown>;
};

function getOrderableTable(
  tx: Prisma.TransactionClient,
  resource: HomeNavResource,
): {table: OrderableTable; activityType: string} | null {
  switch (resource) {
    case "MENU_ITEM": return {table: tx.menuItem, activityType: "MenuItem"};
    case "QUICK_LINK": return {table: tx.quickLink, activityType: "QuickLink"};
    case "EXTERNAL_LINK": return {table: tx.externalLink, activityType: "ExternalLink"};
    case "HOME_SLIDER": return {table: tx.homeSlider, activityType: "HomeSlider"};
    case "HOME_SECTION": return {table: tx.homeSection, activityType: "HomeSection"};
    case "STATISTIC": return {table: tx.statistic, activityType: "Statistic"};
    case "HOME_VIDEO": return {table: tx.homeVideo, activityType: "HomeVideo"};
    default: return null;
  }
}

async function reorderHomeNav(tx: Prisma.TransactionClient, resource: HomeNavResource, payload: {ids: string[]}, actorId: string) {
  const info = getOrderableTable(tx, resource);
  if (!info) throw new Error("REORDER not allowed for this resource type.");
  for (let i = 0; i < payload.ids.length; i++) {
    await info.table.update({where: {id: payload.ids[i]!}, data: {order: i}});
  }
  await tx.activityLog.create({data: {actorId, action: "UPDATE", resourceType: info.activityType, metadata: {operation: "REORDER"}}});
}

export async function executeHomeNavCommand(
  prisma: HomeNavDatabase, rawActor: unknown, rawCommand: unknown, now = new Date(),
): Promise<HomeNavMutationResult> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = HomeNavAdminCommandSchema.safeParse(rawCommand);
  if (!parsed.success || !SUPPORTED_RESOURCES.has(parsed.data.resource as HomeNavResource)) {
    return {ok: false, code: "VALIDATION_FAILED"};
  }
  const cmd = parsed.data;
  try {
    return await prisma.$transaction(async (tx) => {
      if (cmd.action === "REORDER") {
        const reorderPayload = {ids: cmd.payload.items.map(e => e.id)};
        return reorderHomeNav(tx, cmd.resource as HomeNavResource, reorderPayload, actor.userId).then(() =>
          HomeNavMutationResultSchema.parse({ok: true, id: cmd.payload.items[0]!.id, resource: cmd.resource, version: null}));
      }
      if (cmd.action === "DELETE") return deleteHomeNavItem(tx, cmd.resource as HomeNavResource, cmd.id, actor.userId);

      const payload = 'mutation' in cmd ? cmd.payload : cmd.payload;
      if (cmd.resource === "MENU_ITEM" && 'action' in cmd) return cmd.action === "CREATE" ? createMenuItem(tx, payload as z.infer<typeof MenuItemInputSchema>, actor.userId, now)
        : updateMenuItem(tx, ('mutation' in cmd ? cmd.mutation.id : ""), payload as z.infer<typeof MenuItemInputSchema>, actor.userId, now);
      if (cmd.resource === "QUICK_LINK" && 'action' in cmd) return cmd.action === "CREATE" ? createQuickLink(tx, payload as z.infer<typeof QuickLinkInputSchema>, actor.userId, now)
        : updateQuickLink(tx, ('mutation' in cmd ? cmd.mutation.id : ""), payload as z.infer<typeof QuickLinkInputSchema>, actor.userId, now);
      if (cmd.resource === "EXTERNAL_LINK" && 'action' in cmd) return cmd.action === "CREATE" ? createExternalLink(tx, payload as z.infer<typeof ExternalLinkInputSchema>, actor.userId, now)
        : updateExternalLink(tx, ('mutation' in cmd ? cmd.mutation.id : ""), payload as z.infer<typeof ExternalLinkInputSchema>, actor.userId, now);
      if (cmd.resource === "HOME_SLIDER" && 'action' in cmd) return cmd.action === "CREATE" ? createHomeSlider(tx, payload as z.infer<typeof HomeSliderInputSchema>, actor.userId, now)
        : updateHomeSlider(tx, ('mutation' in cmd ? cmd.mutation.id : ""), payload as z.infer<typeof HomeSliderInputSchema>, actor.userId, now);
      if (cmd.resource === "HOME_SECTION") return updateHomeSection(tx, ('mutation' in cmd ? cmd.mutation.id : ""), payload as z.infer<typeof HomeSectionInputSchema>, actor.userId, now);
      if (cmd.resource === "HOME_VIDEO" && 'action' in cmd) return cmd.action === "CREATE" ? createHomeVideo(tx, payload as z.infer<typeof HomeVideoInputSchema>, actor.userId, now)
        : updateHomeVideo(tx, ('mutation' in cmd ? cmd.mutation.id : ""), payload as z.infer<typeof HomeVideoInputSchema>, actor.userId, now);
      if (cmd.resource === "STATISTIC" && 'action' in cmd) return cmd.action === "CREATE" ? createStatistic(tx, payload as z.infer<typeof StatisticInputSchema>, actor.userId, now)
        : updateStatistic(tx, ('mutation' in cmd ? cmd.mutation.id : ""), payload as z.infer<typeof StatisticInputSchema>, actor.userId, now);
      return updateSiteSetting(tx, payload as z.infer<typeof SiteSettingInputSchema>, actor.userId, now);
    }, {isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable});
  } catch (error) {
    if (isPrismaCode(error, "P2002")) return {ok: false, code: "UNAVAILABLE"};
    if (isPrismaCode(error, "P2003")) return {ok: false, code: "IN_USE"};
    if (error instanceof z.ZodError) return {ok: false, code: "VALIDATION_FAILED"};
    return {ok: false, code: "UNAVAILABLE"};
  }
}

// ── PUBLIC HOME SNAPSHOT ────────────────────────────────────────────

function resolvedTranslation<T extends {locale: string; status: string}>(translations: T[], locale: string): T | null {
  return translations.find(t => t.locale === locale && t.status === "PUBLISHED")
    ?? translations.find(t => t.locale === "id" && t.status === "PUBLISHED") ?? null;
}

function translationResult(t: {locale: string} | null, locale: string): z.infer<typeof CmsTranslationResolutionSchema> {
  const l = locale as "id" | "en" | "ar";
  if (!t) return {requestedLocale: l, resolvedLocale: "id" as const, isFallback: true};
  return {requestedLocale: l, resolvedLocale: t.locale as "id" | "en" | "ar", isFallback: t.locale !== locale};
}

type NavNode = {
  id: string;
  label: string;
  link: z.infer<typeof CmsNullableConfiguredLinkSchema> | null;
  children: NavNode[];
  translation: z.infer<typeof CmsTranslationResolutionSchema>;
  parentId: string | null;
};

async function buildPublicNavigation(prisma: HomeNavDatabase, locale: string) {
  const menus = await prisma.menuItem.findMany({
    where: {isVisible: true, translations: {some: {status: "PUBLISHED", locale: {in: (locale === "id" ? ["id"] : [locale, "id"]) as Locale[]}}}},
    orderBy: [{order: "asc"}, {id: "asc"}],
    include: {translations: true},
  });
  const nodeMap = new Map<string, NavNode>();
  menus.forEach(m => {
    const t = resolvedTranslation(m.translations, locale);
    if (!t) return;
    nodeMap.set(m.id, {
      id: m.id, label: t.label,
      link: resolveLink(m.url, m.pageId), children: [], translation: translationResult(t, locale), parentId: m.parentId,
    });
  });
  const roots: NavNode[] = [];
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else { roots.push(node); }
  });

  const byLocation = (loc: string) => roots.filter(n => {
    const m = menus.find(m => m.id === n.id);
    return m && m.location === loc;
  });

  return {
    contentBar: byLocation("CONTENT_BAR"),
    topbar: byLocation("TOPBAR"),
    header: byLocation("HEADER"),
    footer: byLocation("FOOTER"),
  };
}

type PublicSnapshotResult = z.infer<typeof PublicHomeSnapshotResultSchema>;

export async function getPublicHomeSnapshot(
  prisma: HomeNavDatabase, rawQuery: unknown, rawUploadBase = "/uploads",
): Promise<PublicSnapshotResult> {
  const parsed = PublicHomeSnapshotQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};
  const {locale} = parsed.data;
  const base = rawUploadBase.replace(/\/+$/u, "") || "/uploads";

  try {
    const [navigation, siteSettingRaw, sliders, quickLinks, sections, statistics, externalLinks, homeVideos,
      studyPrograms, berita, pengumuman, kolom, events, services, partnerships, testimonials] = await Promise.all([
      buildPublicNavigation(prisma, locale),

      prisma.siteSetting.findUnique({where: {id: "singleton"},
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
          deanPhoto: {select: MEDIA_SELECT}, videoPoster: {select: MEDIA_SELECT},
          logoMedia: {select: MEDIA_SELECT}, accreditationLogoMedia: {select: MEDIA_SELECT},
          bluLogoMedia: {select: MEDIA_SELECT}, faviconMedia: {select: MEDIA_SELECT}}}),

      prisma.homeSlider.findMany({where: {isVisible: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 12,
        include: {translations: true, imageMedia: {select: MEDIA_SELECT}}}),

      prisma.quickLink.findMany({where: {isVisible: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}}}}),

      prisma.homeSection.findMany({where: {isVisible: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 18,
        include: {translations: true, backgroundMedia: {select: MEDIA_SELECT}}}),

      prisma.statistic.findMany({where: {isVisible: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}}}}),

      prisma.externalLink.findMany({where: {isVisible: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 100,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}}}}),

      prisma.homeVideo.findMany({where: {isVisible: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}}}}),

            // Study programs in contract order
      prisma.studyProgram.findMany({where: {isActive: true},
        orderBy: [{order: "asc"}, {id: "asc"}],
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
          logoMedia: {select: MEDIA_SELECT}, curriculumDocument: {include: {translations: {where: {status: "PUBLISHED"}}}}} }),

      // Posts: berita
      prisma.post.findMany({where: {type: "BERITA", status: "PUBLISHED"},
        orderBy: {publishedAt: "desc"}, take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
          coverMedia: {select: MEDIA_SELECT}}}),

      // Posts: pengumuman
      prisma.post.findMany({where: {type: "PENGUMUMAN", status: "PUBLISHED"},
        orderBy: {publishedAt: "desc"}, take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
          coverMedia: {select: MEDIA_SELECT}}}),

      // Posts: kolom
      prisma.post.findMany({where: {type: "KOLOM", status: "PUBLISHED"},
        orderBy: {publishedAt: "desc"}, take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
          coverMedia: {select: MEDIA_SELECT}}}),

      // Public content: events
      prisma.event.findMany({where: {isPublished: true},
        orderBy: {startAt: "desc"}, take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}}}}),

      prisma.service.findMany({where: {isActive: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}}}}),

      prisma.partnership.findMany({where: {isActive: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
          logoMedia: {select: MEDIA_SELECT}}}),

      prisma.testimonial.findMany({where: {isVisible: true},
        orderBy: [{order: "asc"}, {id: "asc"}], take: 12,
        include: {translations: {where: {status: "PUBLISHED", locale: {in: locale === "id" ? ["id"] : [locale, "id"]}}},
          photoMedia: {select: MEDIA_SELECT}}}),
    ]);

    // Build site setting
    let siteSetting = null;
    if (siteSettingRaw) {
      const st = resolvedTranslation(siteSettingRaw.translations, locale);
      if (st) {
        const dean = siteSettingRaw.deanName ? {name: siteSettingRaw.deanName,
          photo: publicMedia(siteSettingRaw.deanPhoto as unknown as MediaRow, base)!,
          position: st.deanPosition ?? "", message: st.deanMessage ?? ""} : null;
        const video = siteSettingRaw.videoUrl ? {url: siteSettingRaw.videoUrl,
          poster: publicMedia(siteSettingRaw.videoPoster as unknown as MediaRow, base),
          title: st.videoTitle ?? "", description: st.videoDesc ?? null} : null;
        const logo = publicMedia(siteSettingRaw.logoMedia as unknown as MediaRow, base);
        const accreditationLogo = publicMedia(siteSettingRaw.accreditationLogoMedia as unknown as MediaRow, base);
        const bluLogo = publicMedia(siteSettingRaw.bluLogoMedia as unknown as MediaRow, base);
        const favicon = publicMedia(siteSettingRaw.faviconMedia as unknown as MediaRow, base);
        siteSetting = {
          facultyName: st.facultyName, tagline: st.tagline ?? null,
          addresses: [st.address1, st.address2].filter(Boolean),
          dean, video, showProfileVideoInGallery: siteSettingRaw.showProfileVideoInGallery,
          logo, accreditationLogo, bluLogo, favicon,
          email: siteSettingRaw.email, phone: siteSettingRaw.phone,
          socialLinks: {facebook: siteSettingRaw.facebookUrl, instagram: siteSettingRaw.instagramUrl,
            youtube: siteSettingRaw.youtubeUrl, x: siteSettingRaw.xUrl},
          translation: translationResult(st, locale),
        };
      }
    }
    if (!siteSetting) return {ok: false, code: "UNAVAILABLE"};

    // Build sliders
    const publicSliders = sliders.map(s => {
      const t = resolvedTranslation(s.translations, locale);
      if (!t) return null;
      const img = publicMedia(s.imageMedia as unknown as MediaRow, base);
      return {id: s.id, image: img!, cta: s.ctaUrl ? {kind: "EXTERNAL" as const, href: s.ctaUrl} : null,
        order: s.order, translation: {...translationResult(t, locale), title: t.title ?? null,
          subtitle: t.subtitle ?? null, ctaLabel: t.ctaLabel ?? null}};
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    const publicHomeVideos = homeVideos.map(v => {
      const t = resolvedTranslation(v.translations, locale);
      if (!t) return null;
      return {id: v.id, youtubeUrl: v.youtubeUrl, order: v.order,
        translation: {...translationResult(t, locale), title: t.title}};
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    // Build quick links
    const publicQuickLinks = quickLinks.map(q => {
      const t = resolvedTranslation(q.translations, locale);
      if (!t) return null;
      return {id: q.id, link: {kind: "EXTERNAL" as const, href: q.url}, icon: q.icon, order: q.order,
        translation: {...translationResult(t, locale), label: t.label}};
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    // Build sections
    const publicSections = sections.map(s => {
      const t = resolvedTranslation(s.translations, locale);
      if (!t) return null;
      return {id: s.id, key: s.key, order: s.order, itemLimit: s.itemLimit,
        cta: s.ctaUrl ? {kind: "EXTERNAL" as const, href: s.ctaUrl} : null,
        background: publicMedia(s.backgroundMedia as unknown as MediaRow, base),
        translation: {...translationResult(t, locale), title: t.title,
          subtitle: t.subtitle ?? null, ctaLabel: t.ctaLabel ?? null}};
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    // Build statistics
    const publicStats = statistics.map(s => {
      const t = resolvedTranslation(s.translations, locale);
      if (!t) return null;
      return {id: s.id, value: s.value, suffix: s.suffix, icon: s.icon, order: s.order,
        translation: {...translationResult(t, locale), label: t.label}};
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    // Build external links
    const publicExtLinks = externalLinks.map(el => {
      const t = resolvedTranslation(el.translations, locale);
      if (!t) return null;
      return {id: el.id, category: el.category, url: el.url, order: el.order,
        translation: {...translationResult(t, locale), label: t.label}};
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    // Build study programs
    const publicProdi = studyPrograms.map(sp => {
      const t = resolvedTranslation(sp.translations, locale);
      if (!t) return null;
      return {id: sp.id, code: sp.code, slug: sp.slug, name: t.name,
        degree: sp.degree, accreditation: sp.accreditation, logo: publicMedia(sp.logoMedia as unknown as MediaRow, base),
        translation: translationResult(t, locale)};
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    // Build post cards
    const mapPost = (p: typeof berita[number], type: "BERITA" | "PENGUMUMAN" | "KOLOM") => {
      const t = resolvedTranslation(p.translations, locale);
      if (!t) return null;
      return {id: p.id, type, slug: p.slug, title: t.title,
        excerpt: t.excerpt ?? null, publishedAt: (p.publishedAt as Date).toISOString(),
        cover: publicMedia(p.coverMedia as unknown as MediaRow, base),
        translation: translationResult(t, locale)};
    };
    const publicNews = berita.map(p => mapPost(p, "BERITA")).filter((v): v is NonNullable<typeof v> => v !== null);
    const publicAnnouncements = pengumuman.map(p => mapPost(p, "PENGUMUMAN")).filter((v): v is NonNullable<typeof v> => v !== null);
    const publicColumns = kolom.map(p => mapPost(p, "KOLOM")).filter((v): v is NonNullable<typeof v> => v !== null);

    // Build content cards — mapped per resource type
    const mapService = (item: typeof services[number]) => {
      const t = resolvedTranslation(item.translations, locale);
      if (!t) return null;
      return {id: item.id, resource: "SERVICE" as const, slug: item.slug, publishedAt: null,
        translation: {...translationResult(t, locale), title: t.name,
          excerpt: t.description ?? null}, cover: null};
    };
    const mapPartnership = (item: typeof partnerships[number]) => {
      const t = resolvedTranslation(item.translations, locale);
      if (!t) return null;
      return {id: item.id, resource: "PARTNERSHIP" as const, slug: item.slug, publishedAt: null,
        translation: {...translationResult(t, locale), title: item.partnerName,
          excerpt: t.description ?? null}, cover: publicMedia(item.logoMedia as unknown as MediaRow, base)};
    };
    const mapEvent = (item: typeof events[number]) => {
      const t = resolvedTranslation(item.translations, locale);
      if (!t) return null;
      return {id: item.id, resource: "EVENT" as const, slug: item.slug,
        publishedAt: item.startAt.toISOString(),
        translation: {...translationResult(t, locale), title: t.title,
          excerpt: t.description ?? null}, cover: null};
    };
    const mapTestimonial = (item: typeof testimonials[number]) => {
      const t = resolvedTranslation(item.translations, locale);
      if (!t) return null;
      return {id: item.id, resource: "TESTIMONIAL" as const, slug: item.id,
        publishedAt: item.publicationConsentAt?.toISOString() ?? null,
        translation: {...translationResult(t, locale), title: t.quote,
          excerpt: t.currentRole}, cover: publicMedia(item.photoMedia as unknown as MediaRow, base)};
    };

    const snapshot = PublicHomeSnapshotSchema.parse({
      locale, generatedAt: new Date().toISOString(), navigation,
      externalLinks: publicExtLinks,
      sections: publicSections, sliders: publicSliders,
      quickLinks: publicQuickLinks, statistics: publicStats, homeVideos: publicHomeVideos,
      siteSetting,
      content: {
        studyPrograms: publicProdi,
        news: publicNews, announcements: publicAnnouncements, columns: publicColumns,
        services: services.map(s => mapService(s)).filter((v): v is NonNullable<typeof v> => v !== null),
        partnerships: partnerships.map(p => mapPartnership(p)).filter((v): v is NonNullable<typeof v> => v !== null),
        events: events.map(e => mapEvent(e)).filter((v): v is NonNullable<typeof v> => v !== null),
        testimonials: testimonials.map(t => mapTestimonial(t)).filter((v): v is NonNullable<typeof v> => v !== null),
      },
    });
    return {ok: true as const, data: snapshot};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export function homeNavHttpStatus(result: {ok: boolean; code?: string}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (["VERSION_CONFLICT", "IN_USE"].includes(result.code ?? "")) return 409;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
