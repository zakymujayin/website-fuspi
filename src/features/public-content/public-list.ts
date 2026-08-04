import type {Prisma} from "@/generated/prisma/client";

import {PublicContentListQuerySchema, PublicContentListResultSchema} from "@/contracts/public-content";

import {
  MEDIA_SELECT,
  configuredLink,
  mediaView,
  pageMetadata,
  resolution,
  resolve,
  safeDate,
  type Locale,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

function yearRange(year: number) {
  return {gte: new Date(`${year}-01-01T00:00:00+07:00`), lt: new Date(`${year + 1}-01-01T00:00:00+07:00`)};
}

function translation(locale: Locale, resolvedLocale: Locale) {
  return resolution(locale, resolvedLocale);
}

export async function listPublicContent(
  prisma: PublicContentDatabase,
  rawQuery: unknown,
  now = new Date(),
  uploadBase = "/uploads",
) {
  const parsed = PublicContentListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const query = parsed.data; const locale = query.locale as Locale;
  const localeFilter = {status: "PUBLISHED" as const, locale: {in: locale === "id" ? ["id" as const] : [locale, "id" as const]}};
  const direction = query.direction.toLowerCase() as "asc" | "desc";
  const pagination = {skip: (query.page - 1) * query.pageSize, take: query.pageSize};

  try {
    let items: unknown[] = []; let total = 0;
    if (query.resource === "SERVICE") {
      const category = query.category && ["AKADEMIK", "LABORATORIUM", "UMUM"].includes(query.category)
        ? query.category as "AKADEMIK" | "LABORATORIUM" | "UMUM" : null;
      const where: Prisma.ServiceWhereInput = {isActive: true, AND: [{OR: [{expiresAt: null}, {expiresAt: {gt: now}}]}],
        translations: {some: localeFilter},
        ...(query.search ? {OR: [{slug: {contains: query.search, mode: "insensitive"}}, {translations: {some: {...localeFilter, name: {contains: query.search, mode: "insensitive"}}}}]} : {}),
        ...(category ? {category} : query.category ? {id: "__no_match__"} : {}),
        ...(query.archive === "ARCHIVE" ? {id: "__no_match__"} : {})};
      const [rows, count] = await prisma.$transaction([prisma.service.findMany({where, ...pagination,
        orderBy: [{order: direction}, {id: "asc"}], include: {translations: {where: localeFilter}}}), prisma.service.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); const link = configuredLink(row.url);
        return text && link !== undefined ? {id: row.id, resource: "SERVICE", slug: row.slug, title: text.name,
          summary: null, badge: row.category, startsAt: null, endsAt: safeDate(row.expiresAt), media: null, link,
          translation: translation(locale, text.locale)} : null;});
    } else if (query.resource === "PARTNERSHIP") {
      const level = query.category && ["INTERNASIONAL", "NASIONAL", "LOKAL"].includes(query.category)
        ? query.category as "INTERNASIONAL" | "NASIONAL" | "LOKAL" : null;
      const where: Prisma.PartnershipWhereInput = {isActive: true,
        translations: {some: localeFilter},
        ...(query.search ? {OR: [{partnerName: {contains: query.search, mode: "insensitive"}}, {translations: {some: {...localeFilter, OR: [{category: {contains: query.search, mode: "insensitive"}}, {description: {contains: query.search, mode: "insensitive"}}]}}}]} : {}),
        ...(level ? {level} : query.category ? {id: "__no_match__"} : {}), ...(query.year ? {startDate: yearRange(query.year)} : {}),
        ...(query.archive === "ARCHIVE" ? {id: "__no_match__"} : {})};
      const [rows, count] = await prisma.$transaction([prisma.partnership.findMany({where, ...pagination,
        orderBy: [{order: direction}, {id: "asc"}], include: {translations: {where: localeFilter}, logoMedia: {select: MEDIA_SELECT}}}), prisma.partnership.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); const website = row.websiteUrl === null ? null : configuredLink(row.websiteUrl);
        return text && website !== undefined && (row.websiteUrl === null || website?.kind === "EXTERNAL") ? {id: row.id, resource: "PARTNERSHIP", slug: row.slug,
          title: row.partnerName, summary: null, badge: text.category ?? row.level, startsAt: safeDate(row.startDate), endsAt: safeDate(row.endDate),
          media: mediaView(row.logoMedia, uploadBase), link: website, translation: translation(locale, text.locale)} : null;});
    } else if (query.resource === "SCHOLARSHIP") {
      const archive = query.archive === "ACTIVE" ? {OR: [{endDate: null}, {endDate: {gte: now}}]} : query.archive === "ARCHIVE" ? {endDate: {lt: now}} : {};
      const where: Prisma.ScholarshipWhereInput = {isActive: true, ...archive,
        translations: {some: {...localeFilter, ...(query.search ? {OR: [{title: {contains: query.search, mode: "insensitive"}}, {provider: {contains: query.search, mode: "insensitive"}}]} : {})}},
        ...(query.year ? {endDate: yearRange(query.year)} : {}), ...(query.category ? {id: "__no_match__"} : {})};
      const [rows, count] = await prisma.$transaction([prisma.scholarship.findMany({where, ...pagination,
        orderBy: [{endDate: direction}, {id: "asc"}], include: {translations: {where: localeFilter}}}), prisma.scholarship.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); const link = row.registrationUrl === null ? null : configuredLink(row.registrationUrl);
        return text && link !== undefined && (row.registrationUrl === null || link?.kind === "EXTERNAL") ? {id: row.id, resource: "SCHOLARSHIP", slug: row.slug,
          title: text.title, summary: null, badge: text.provider, startsAt: safeDate(row.startDate), endsAt: safeDate(row.endDate), media: null,
          link, translation: translation(locale, text.locale)} : null;});
    } else if (query.resource === "ACHIEVEMENT") {
      const level = query.category && ["INTERNASIONAL", "NASIONAL", "REGIONAL", "LOKAL"].includes(query.category)
        ? query.category as "INTERNASIONAL" | "NASIONAL" | "REGIONAL" | "LOKAL" : null;
      const where: Prisma.AchievementWhereInput = {translations: {some: localeFilter},
        ...(query.search ? {OR: [{studentName: {contains: query.search, mode: "insensitive"}}, {translations: {some: {...localeFilter, title: {contains: query.search, mode: "insensitive"}}}}]} : {}),
        ...(level ? {level} : query.category ? {id: "__no_match__"} : {}), ...(query.year ? {achievedAt: yearRange(query.year)} : {}),
        ...(query.archive === "ARCHIVE" ? {id: "__no_match__"} : {})};
      const [rows, count] = await prisma.$transaction([prisma.achievement.findMany({where, ...pagination,
        orderBy: [{achievedAt: direction}, {id: "asc"}], include: {translations: {where: localeFilter}, imageMedia: {select: MEDIA_SELECT}}}), prisma.achievement.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); const image = mediaView(row.imageMedia, uploadBase); return text && (!row.imageMedia || image) ? {id: row.id, resource: "ACHIEVEMENT", slug: row.slug,
        title: text.title, summary: null, badge: row.level, startsAt: safeDate(row.achievedAt), endsAt: null,
        media: image, link: null, translation: translation(locale, text.locale)} : null;});
    } else if (query.resource === "STUDENT_ACTIVITY") {
      const where: Prisma.StudentActivityWhereInput = {translations: {some: {...localeFilter,
        ...(query.search ? {title: {contains: query.search, mode: "insensitive"}} : {})}}, ...(query.year ? {date: yearRange(query.year)} : {}),
        ...(query.category || query.archive === "ARCHIVE" ? {id: "__no_match__"} : {})};
      const [rows, count] = await prisma.$transaction([prisma.studentActivity.findMany({where, ...pagination,
        orderBy: [{date: direction}, {id: "asc"}], include: {translations: {where: localeFilter}, images: {take: 1, orderBy: [{order: "asc"}, {id: "asc"}], include: {media: {select: MEDIA_SELECT}}}}}), prisma.studentActivity.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); const image = mediaView(row.images[0]?.media ?? null, uploadBase); return text && (!row.images[0] || image) ? {id: row.id, resource: "STUDENT_ACTIVITY", slug: row.slug,
        title: text.title, summary: null, badge: null, startsAt: safeDate(row.date), endsAt: null,
        media: image, link: null, translation: translation(locale, text.locale)} : null;});
    } else if (query.resource === "DOCUMENT") {
      const where: Prisma.DocumentWhereInput = {publishedAt: {lte: now}, OR: [{expiresAt: null}, {expiresAt: {gt: now}}],
        ...(query.archive === "ARCHIVE" ? {id: "__no_match__"} : {}),
        translations: {some: {...localeFilter, ...(query.search ? {title: {contains: query.search, mode: "insensitive"}} : {}),
          ...(query.category ? {category: {equals: query.category, mode: "insensitive"}} : {})}}};
      const [rows, count] = await prisma.$transaction([prisma.document.findMany({where, ...pagination,
        orderBy: [{publishedAt: direction}, {id: "asc"}], include: {translations: {where: localeFilter}}}), prisma.document.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); return text ? {id: row.id, resource: "DOCUMENT", slug: row.slug,
        title: text.title, summary: null, badge: text.category, startsAt: safeDate(row.publishedAt), endsAt: safeDate(row.expiresAt),
        media: null, link: null, translation: translation(locale, text.locale)} : null;});
    } else if (query.resource === "ALBUM") {
      const where: Prisma.AlbumWhereInput = {isPublished: true, translations: {some: {...localeFilter,
        ...(query.search ? {title: {contains: query.search, mode: "insensitive"}} : {})}}, ...(query.year ? {eventDate: yearRange(query.year)} : {}),
        ...(query.category || query.archive === "ARCHIVE" ? {id: "__no_match__"} : {})};
      const [rows, count] = await prisma.$transaction([prisma.album.findMany({where, ...pagination,
        orderBy: [{eventDate: direction}, {id: "asc"}], include: {translations: {where: localeFilter}, coverMedia: {select: MEDIA_SELECT}}}), prisma.album.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); const cover = mediaView(row.coverMedia, uploadBase); return text && (!row.coverMedia || cover) ? {id: row.id, resource: "ALBUM", slug: row.slug,
        title: text.title, summary: null, badge: null, startsAt: safeDate(row.eventDate), endsAt: null,
        media: cover, link: null, translation: translation(locale, text.locale)} : null;});
    } else if (query.resource === "EVENT") {
      const lifecycle = query.archive === "ACTIVE" ? {OR: [{endAt: {gte: now}}, {endAt: null, startAt: {gte: now}}]}
        : query.archive === "ARCHIVE" ? {OR: [{endAt: {lt: now}}, {endAt: null, startAt: {lt: now}}]} : {};
      const where: Prisma.EventWhereInput = {isPublished: true, AND: [{OR: [{expiresAt: null}, {expiresAt: {gt: now}}]}, lifecycle], translations: {some: {...localeFilter,
        ...(query.search ? {title: {contains: query.search, mode: "insensitive"}} : {})}}, ...(query.year ? {startAt: yearRange(query.year)} : {}),
        ...(query.category ? {id: "__no_match__"} : {})};
      const [rows, count] = await prisma.$transaction([prisma.event.findMany({where, ...pagination,
        orderBy: [{startAt: direction}, {id: "asc"}], include: {translations: {where: localeFilter}}}), prisma.event.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); const link = row.registrationUrl === null ? null : configuredLink(row.registrationUrl);
        return text && link !== undefined && (row.registrationUrl === null || link?.kind === "EXTERNAL") ? {id: row.id, resource: "EVENT", slug: row.slug,
          title: text.title, summary: null, badge: text.location, startsAt: row.startAt.toISOString(), endsAt: safeDate(row.endAt),
          media: null, link, translation: translation(locale, text.locale)} : null;});
    } else if (query.resource === "FAQ") {
      const where: Prisma.FaqWhereInput = {isVisible: true, OR: [{expiresAt: null}, {expiresAt: {gt: now}}],
        ...(query.archive === "ARCHIVE" ? {id: "__no_match__"} : {}), translations: {some: {...localeFilter,
        ...(query.search ? {question: {contains: query.search, mode: "insensitive"}} : {}),
        ...(query.category ? {category: {equals: query.category, mode: "insensitive"}} : {})}}};
      const [rows, count] = await prisma.$transaction([prisma.faq.findMany({where, ...pagination,
        orderBy: [{order: direction}, {id: "asc"}], include: {translations: {where: localeFilter}}}), prisma.faq.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); return text ? {id: row.id, resource: "FAQ", slug: null,
        title: text.question, summary: null, badge: text.category, startsAt: null, endsAt: safeDate(row.expiresAt),
        media: null, link: null, translation: translation(locale, text.locale)} : null;});
    } else {
      const where: Prisma.TestimonialWhereInput = {isVisible: true, publicationConsentAt: {lte: now}, translations: {some: localeFilter},
        ...(query.search ? {OR: [{name: {contains: query.search, mode: "insensitive"}}, {translations: {some: {...localeFilter, OR: [{currentRole: {contains: query.search, mode: "insensitive"}}, {quote: {contains: query.search, mode: "insensitive"}}]}}}]} : {}),
        ...(query.year ? {graduationYear: query.year} : {}), ...(query.category || query.archive === "ARCHIVE" ? {id: "__no_match__"} : {})};
      const [rows, count] = await prisma.$transaction([prisma.testimonial.findMany({where, ...pagination,
        orderBy: [{order: direction}, {id: "asc"}], include: {translations: {where: localeFilter}, photoMedia: {select: MEDIA_SELECT}}}), prisma.testimonial.count({where})]); total = count;
      items = rows.map((row) => {const text = resolve(row.translations, locale); const photo = mediaView(row.photoMedia, uploadBase); return text && (!row.photoMedia || photo) ? {id: row.id, resource: "TESTIMONIAL", slug: null,
        title: row.name, summary: null, badge: text.currentRole, startsAt: null, endsAt: null,
        media: photo, link: null, translation: translation(locale, text.locale)} : null;});
    }
    if (items.some((item) => item === null)) return {ok: false as const, code: "UNAVAILABLE" as const};
    const result = PublicContentListResultSchema.safeParse({ok: true, items, page: pageMetadata(query.page, query.pageSize, total)});
    return result.success ? result.data : {ok: false as const, code: "UNAVAILABLE" as const};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}
