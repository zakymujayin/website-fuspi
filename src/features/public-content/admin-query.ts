import type {Prisma} from "@/generated/prisma/client";

import {
  PublicContentAdminListQuerySchema,
  PublicContentAdminListResultSchema,
  PublicContentAdminSummarySchema,
} from "@/contracts/public-content";

import {
  actorOrNull,
  governance,
  isExpired,
  pageMetadata,
  workflow,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

type WorkflowRow = Parameters<typeof workflow>[0];

type AdminSummary = ReturnType<typeof PublicContentAdminSummarySchema.parse>;

/**
 * Projects one row onto the frozen list summary. A row whose stored workflow/governance data
 * cannot satisfy the contract is skipped (and logged server-side) rather than failing the whole
 * list — a single inconsistent record must never make an entire admin section unreachable.
 */
function summary(value: {
  id: string; resource: string; slug: string | null; primaryText: string;
  isPublic: boolean; expired: boolean; order: number | null; version: number | null;
  translations: WorkflowRow[]; governance: ReturnType<typeof governance> | null;
}): AdminSummary | null {
  const parsed = PublicContentAdminSummarySchema.safeParse({
    id: value.id, resource: value.resource, slug: value.slug, primaryText: value.primaryText,
    visibility: value.expired ? "EXPIRED" : value.isPublic ? "PUBLIC" : "HIDDEN",
    order: value.order, version: value.version,
    translations: value.translations.map(workflow), governance: value.governance,
  });
  if (parsed.success) return parsed.data;
  console.error(
    `[public-content] skipped ${value.resource} ${value.id}: `
    + parsed.error.issues.map((issue) => `${issue.path.join(".")}:${issue.code}`).join(", "),
  );
  return null;
}

function present(items: Array<AdminSummary | null>): AdminSummary[] {
  return items.filter((item): item is AdminSummary => item !== null);
}

function governanceFilter(query: {visibility: string}, now: Date) {
  return query.visibility === "EXPIRED" ? {expiresAt: {lte: now}}
    : query.visibility === "PUBLIC" || query.visibility === "HIDDEN" ? {OR: [{expiresAt: null}, {expiresAt: {gt: now}}]}
    : {};
}

export async function listPublicContentAdmin(
  prisma: PublicContentDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  now = new Date(),
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = PublicContentAdminListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data;
  const skip = (query.page - 1) * query.pageSize;
  const take = query.pageSize;
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  const status = query.translationStatus ? {translations: {some: {status: query.translationStatus}}} : {};
  const pagination = {skip, take};
  try {
    let items: ReturnType<typeof summary>[]; let total: number;
    if (query.resource === "SERVICE") {
      const category = query.category && ["AKADEMIK", "LABORATORIUM", "UMUM"].includes(query.category) ? query.category as "AKADEMIK" | "LABORATORIUM" | "UMUM" : null;
      const where: Prisma.ServiceWhereInput = {...status, ...governanceFilter(query, now),
        ...(query.visibility === "PUBLIC" ? {isActive: true} : query.visibility === "HIDDEN" ? {isActive: false} : {}),
        ...(category ? {category} : query.category ? {id: "__no_match__"} : {}),
        ...(query.search ? {OR: [{slug: {contains: query.search, mode: "insensitive"}}, {translations: {some: {name: {contains: query.search, mode: "insensitive"}}}}]} : {})};
      const result = await prisma.$transaction([prisma.service.findMany({where, ...pagination, orderBy: [{order: direction}, {id: "asc"}], include: {translations: true}}), prisma.service.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "SERVICE", slug: row.slug,
        primaryText: row.translations.find(({locale}) => locale === "id")?.name ?? row.slug,
        isPublic: row.isActive, expired: isExpired(row.expiresAt, now), order: row.order, version: row.version,
        translations: row.translations, governance: governance(row)}));
    } else if (query.resource === "PARTNERSHIP") {
      const level = query.category && ["INTERNASIONAL", "NASIONAL", "LOKAL"].includes(query.category) ? query.category as "INTERNASIONAL" | "NASIONAL" | "LOKAL" : null;
      const where: Prisma.PartnershipWhereInput = {...status,
        ...(query.visibility === "PUBLIC" ? {isActive: true} : query.visibility === "HIDDEN" ? {isActive: false} : {}),
        ...(level ? {level} : query.category ? {id: "__no_match__"} : {}),
        ...(query.year ? {startDate: {gte: new Date(`${query.year}-01-01T00:00:00.000Z`), lt: new Date(`${query.year + 1}-01-01T00:00:00.000Z`)}} : {}),
        ...(query.search ? {OR: [{partnerName: {contains: query.search, mode: "insensitive"}}, {translations: {some: {category: {contains: query.search, mode: "insensitive"}}}}]} : {})};
      const result = await prisma.$transaction([prisma.partnership.findMany({where, ...pagination, orderBy: [{order: direction}, {id: "asc"}], include: {translations: true}}), prisma.partnership.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "PARTNERSHIP", slug: row.slug, primaryText: row.partnerName,
        isPublic: row.isActive, expired: false, order: row.order, version: row.version, translations: row.translations, governance: null}));
    } else if (query.resource === "SCHOLARSHIP") {
      const where: Prisma.ScholarshipWhereInput = {...status,
        ...(query.visibility === "PUBLIC" ? {isActive: true, OR: [{endDate: null}, {endDate: {gte: now}}]}
          : query.visibility === "HIDDEN" ? {isActive: false, OR: [{endDate: null}, {endDate: {gte: now}}]}
          : query.visibility === "EXPIRED" ? {endDate: {lt: now}} : {}),
        ...(query.year ? {endDate: {gte: new Date(`${query.year}-01-01T00:00:00.000Z`), lt: new Date(`${query.year + 1}-01-01T00:00:00.000Z`)}} : {}),
        ...(query.search ? {translations: {some: {title: {contains: query.search, mode: "insensitive"}}}} : {})};
      const result = await prisma.$transaction([prisma.scholarship.findMany({where, ...pagination, orderBy: [{endDate: direction}, {id: "asc"}], include: {translations: true}}), prisma.scholarship.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "SCHOLARSHIP", slug: row.slug,
        primaryText: row.translations.find(({locale}) => locale === "id")?.title ?? row.slug, isPublic: row.isActive,
        expired: Boolean(row.endDate && row.endDate < now), order: null, version: row.version, translations: row.translations, governance: null}));
    } else if (query.resource === "ACHIEVEMENT") {
      const level = query.category && ["INTERNASIONAL", "NASIONAL", "REGIONAL", "LOKAL"].includes(query.category) ? query.category as "INTERNASIONAL" | "NASIONAL" | "REGIONAL" | "LOKAL" : null;
      const where: Prisma.AchievementWhereInput = {...status, ...(level ? {level} : query.category ? {id: "__no_match__"} : {}),
        ...(query.year ? {achievedAt: {gte: new Date(`${query.year}-01-01T00:00:00.000Z`), lt: new Date(`${query.year + 1}-01-01T00:00:00.000Z`)}} : {}),
        ...(query.search ? {OR: [{studentName: {contains: query.search, mode: "insensitive"}}, {translations: {some: {title: {contains: query.search, mode: "insensitive"}}}}]} : {})};
      const result = await prisma.$transaction([prisma.achievement.findMany({where, ...pagination, orderBy: [{achievedAt: direction}, {id: "asc"}], include: {translations: true}}), prisma.achievement.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "ACHIEVEMENT", slug: row.slug,
        primaryText: row.translations.find(({locale}) => locale === "id")?.title ?? row.studentName, isPublic: true, expired: false, order: null, version: row.version, translations: row.translations, governance: null}));
    } else if (query.resource === "STUDENT_ACTIVITY") {
      const where: Prisma.StudentActivityWhereInput = {...status,
        ...(query.year ? {date: {gte: new Date(`${query.year}-01-01T00:00:00.000Z`), lt: new Date(`${query.year + 1}-01-01T00:00:00.000Z`)}} : {}),
        ...(query.search ? {translations: {some: {title: {contains: query.search, mode: "insensitive"}}}} : {})};
      const result = await prisma.$transaction([prisma.studentActivity.findMany({where, ...pagination, orderBy: [{date: direction}, {id: "asc"}], include: {translations: true}}), prisma.studentActivity.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "STUDENT_ACTIVITY", slug: row.slug,
        primaryText: row.translations.find(({locale}) => locale === "id")?.title ?? row.slug, isPublic: true, expired: false, order: null, version: row.version, translations: row.translations, governance: null}));
    } else if (query.resource === "DOCUMENT") {
      const where: Prisma.DocumentWhereInput = {...status, ...governanceFilter(query, now),
        ...(query.visibility === "PUBLIC" ? {publishedAt: {not: null}} : query.visibility === "HIDDEN" ? {publishedAt: null} : {}),
        ...(query.category ? {translations: {some: {category: {equals: query.category, mode: "insensitive"}}}} : {}),
        ...(query.search ? {translations: {some: {title: {contains: query.search, mode: "insensitive"}}}} : {})};
      const result = await prisma.$transaction([prisma.document.findMany({where, ...pagination, orderBy: [{updatedAt: direction}, {id: "asc"}], include: {translations: true}}), prisma.document.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "DOCUMENT", slug: row.slug,
        primaryText: row.translations.find(({locale}) => locale === "id")?.title ?? row.slug,
        isPublic: row.publishedAt !== null, expired: isExpired(row.expiresAt, now), order: null, version: row.version,
        translations: row.translations, governance: governance(row)}));
    } else if (query.resource === "ALBUM") {
      const where: Prisma.AlbumWhereInput = {...status,
        ...(query.visibility === "PUBLIC" ? {isPublished: true} : query.visibility === "HIDDEN" ? {isPublished: false} : query.visibility === "EXPIRED" ? {id: "__no_match__"} : {}),
        ...(query.year ? {eventDate: {gte: new Date(`${query.year}-01-01T00:00:00.000Z`), lt: new Date(`${query.year + 1}-01-01T00:00:00.000Z`)}} : {}),
        ...(query.search ? {translations: {some: {title: {contains: query.search, mode: "insensitive"}}}} : {})};
      const result = await prisma.$transaction([prisma.album.findMany({where, ...pagination, orderBy: [{eventDate: direction}, {id: "asc"}], include: {translations: true}}), prisma.album.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "ALBUM", slug: row.slug,
        primaryText: row.translations.find(({locale}) => locale === "id")?.title ?? row.slug, isPublic: row.isPublished, expired: false, order: null, version: row.version, translations: row.translations, governance: null}));
    } else if (query.resource === "EVENT") {
      const where: Prisma.EventWhereInput = {...status, ...governanceFilter(query, now),
        ...(query.visibility === "PUBLIC" ? {isPublished: true} : query.visibility === "HIDDEN" ? {isPublished: false} : {}),
        ...(query.year ? {startAt: {gte: new Date(`${query.year}-01-01T00:00:00.000Z`), lt: new Date(`${query.year + 1}-01-01T00:00:00.000Z`)}} : {}),
        ...(query.search ? {translations: {some: {title: {contains: query.search, mode: "insensitive"}}}} : {})};
      const result = await prisma.$transaction([prisma.event.findMany({where, ...pagination, orderBy: [{startAt: direction}, {id: "asc"}], include: {translations: true}}), prisma.event.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "EVENT", slug: row.slug,
        primaryText: row.translations.find(({locale}) => locale === "id")?.title ?? row.slug, isPublic: row.isPublished,
        expired: isExpired(row.expiresAt, now), order: null, version: row.version, translations: row.translations, governance: governance(row)}));
    } else if (query.resource === "FAQ") {
      const where: Prisma.FaqWhereInput = {...status, ...governanceFilter(query, now),
        ...(query.visibility === "PUBLIC" ? {isVisible: true} : query.visibility === "HIDDEN" ? {isVisible: false} : {}),
        ...(query.category ? {translations: {some: {category: {equals: query.category, mode: "insensitive"}}}} : {}),
        ...(query.search ? {translations: {some: {question: {contains: query.search, mode: "insensitive"}}}} : {})};
      const result = await prisma.$transaction([prisma.faq.findMany({where, ...pagination, orderBy: [{order: direction}, {id: "asc"}], include: {translations: true}}), prisma.faq.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "FAQ", slug: null,
        primaryText: row.translations.find(({locale}) => locale === "id")?.question ?? row.id, isPublic: row.isVisible,
        expired: isExpired(row.expiresAt, now), order: row.order, version: row.version, translations: row.translations, governance: governance(row)}));
    } else {
      const where: Prisma.TestimonialWhereInput = {...status,
        ...(query.visibility === "PUBLIC" ? {isVisible: true, publicationConsentAt: {lte: now}}
          : query.visibility === "HIDDEN" ? {OR: [{isVisible: false}, {publicationConsentAt: null}, {publicationConsentAt: {gt: now}}]}
          : query.visibility === "EXPIRED" ? {id: "__no_match__"} : {}),
        ...(query.year ? {graduationYear: query.year} : {}),
        ...(query.search ? {OR: [{name: {contains: query.search, mode: "insensitive"}}, {translations: {some: {currentRole: {contains: query.search, mode: "insensitive"}}}}]} : {})};
      const result = await prisma.$transaction([prisma.testimonial.findMany({where, ...pagination, orderBy: [{order: direction}, {id: "asc"}], include: {translations: true}}), prisma.testimonial.count({where})]);
      total = result[1]; items = result[0].map((row) => summary({id: row.id, resource: "TESTIMONIAL", slug: null, primaryText: row.name,
        isPublic: row.isVisible && Boolean(row.publicationConsentAt && row.publicationConsentAt <= now), expired: false, order: row.order, version: row.version, translations: row.translations, governance: null}));
    }
    return {ok: true as const, data: PublicContentAdminListResultSchema.parse({
      items: present(items),
      page: pageMetadata(query.page, query.pageSize, total),
    })};
  } catch (error) {
    console.error("[public-content] admin list failed:", error instanceof Error ? error.message : error);
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}
