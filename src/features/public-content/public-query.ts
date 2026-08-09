import {z} from "zod";

import {
  PublicContentDetailQuerySchema,
  PublicContentDetailResultSchema,
} from "@/contracts/public-content";

import {
  MEDIA_SELECT,
  configuredLink,
  documentView,
  isExpired,
  mediaView,
  resolution,
  resolve,
  rich,
  safeDate,
  type Locale,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

const DOCUMENT_INCLUDE = {translations: true} as const;
type PublicContentDetailResult = z.infer<typeof PublicContentDetailResultSchema>;

export async function getPublicContentDetail(
  prisma: PublicContentDatabase,
  rawQuery: unknown,
  now = new Date(),
  uploadBase = "/uploads",
): Promise<PublicContentDetailResult> {
  const parsed = PublicContentDetailQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false, code: "REQUEST_INVALID"};
  const query = parsed.data;
  const locale = query.locale as Locale;
  const localeFilter = {status: "PUBLISHED" as const, locale: {in: locale === "id" ? ["id" as const] : [locale, "id" as const]}};
  try {
    let detail: unknown;
    if (query.resource === "SERVICE") {
      const row = await prisma.service.findFirst({where: {
        slug: query.slug, isActive: true, OR: [{expiresAt: null}, {expiresAt: {gt: now}}], translations: {some: localeFilter},
      }, include: {translations: {where: localeFilter}}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale); const link = configuredLink(row.url);
      if (!translation || link === undefined) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "SERVICE", slug: row.slug, category: row.category, link,
        icon: row.icon, order: row.order, translation: {...resolution(locale, translation.locale), name: translation.name, description: rich(translation.description)}};
    } else if (query.resource === "PARTNERSHIP") {
      const row = await prisma.partnership.findFirst({where: {slug: query.slug, isActive: true, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter}, logoMedia: {select: MEDIA_SELECT}, document: {include: DOCUMENT_INCLUDE},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale);
      const websiteUrl = row.websiteUrl === null ? null : configuredLink(row.websiteUrl);
      const legacy = row.documentUrl === null ? null : configuredLink(row.documentUrl);
      const document = documentView(row.document, locale, uploadBase);
      const logo = mediaView(row.logoMedia, uploadBase);
      if (
        !translation || websiteUrl === undefined || legacy === undefined || (row.document && !document)
        || (row.logoMedia && !logo)
        || (row.websiteUrl !== null && websiteUrl?.kind !== "EXTERNAL")
        || (row.documentUrl !== null && legacy?.kind !== "EXTERNAL")
      ) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "PARTNERSHIP", slug: row.slug, partnerName: row.partnerName,
        level: row.level, country: row.country, startDate: safeDate(row.startDate), endDate: safeDate(row.endDate),
        websiteUrl: websiteUrl?.kind === "EXTERNAL" ? websiteUrl.href : null,
        logo, evidence: document ? {kind: "DOCUMENT", document}
          : legacy?.kind === "EXTERNAL" ? {kind: "EXTERNAL", url: legacy.href} : null, order: row.order,
        translation: {...resolution(locale, translation.locale), category: translation.category, description: rich(translation.description)}};
    } else if (query.resource === "SCHOLARSHIP") {
      const row = await prisma.scholarship.findFirst({where: {
        slug: query.slug, isActive: true, OR: [{endDate: null}, {endDate: {gte: now}}], translations: {some: localeFilter},
      }, include: {translations: {where: localeFilter}, document: {include: DOCUMENT_INCLUDE}}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      const translation = resolve(row.translations, locale);
      const registration = row.registrationUrl === null ? null : configuredLink(row.registrationUrl);
      const document = documentView(row.document, locale, uploadBase);
      if (!translation || registration === undefined || (row.document && !document)
        || (row.registrationUrl !== null && registration?.kind !== "EXTERNAL")) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "SCHOLARSHIP", slug: row.slug, startDate: safeDate(row.startDate), endDate: safeDate(row.endDate),
        registrationUrl: registration?.kind === "EXTERNAL" ? registration.href : null, document,
        translation: {...resolution(locale, translation.locale), title: translation.title, provider: translation.provider, description: rich(translation.description)}};
    } else if (query.resource === "ACHIEVEMENT") {
      const row = await prisma.achievement.findFirst({where: {slug: query.slug, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter}, imageMedia: {select: MEDIA_SELECT},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"}; const translation = resolve(row.translations, locale);
      const image = mediaView(row.imageMedia, uploadBase);
      if (!translation || (row.imageMedia && !image)) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "ACHIEVEMENT", slug: row.slug, studentName: row.studentName,
        level: row.level, achievedAt: safeDate(row.achievedAt), image,
        translation: {...resolution(locale, translation.locale), title: translation.title, description: rich(translation.description)}};
    } else if (query.resource === "STUDENT_ACTIVITY") {
      const row = await prisma.studentActivity.findFirst({where: {slug: query.slug, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter}, images: {orderBy: [{order: "asc"}, {id: "asc"}], include: {media: {select: MEDIA_SELECT}}},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"}; const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      const images = row.images.map(({media, caption, order}) => {const view = mediaView(media, uploadBase); return view ? {media: view, caption, order} : null;});
      if (images.some((image) => !image)) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "STUDENT_ACTIVITY", slug: row.slug, date: safeDate(row.date), images,
        translation: {...resolution(locale, translation.locale), title: translation.title, description: rich(translation.description)}};
    } else if (query.resource === "DOCUMENT") {
      const row = await prisma.document.findFirst({where: {
        slug: query.slug, publishedAt: {lte: now}, OR: [{expiresAt: null}, {expiresAt: {gt: now}}], translations: {some: localeFilter},
      }, include: {translations: {where: localeFilter}}});
      const document = documentView(row, locale, uploadBase);
      if (!document) return {ok: false, code: "NOT_FOUND"}; detail = {...document, resource: "DOCUMENT"};
    } else if (query.resource === "ALBUM") {
      const row = await prisma.album.findFirst({where: {slug: query.slug, isPublished: true, translations: {some: localeFilter}}, include: {
        translations: {where: localeFilter}, coverMedia: {select: MEDIA_SELECT},
        photos: {orderBy: [{order: "asc"}, {id: "asc"}], include: {media: {select: MEDIA_SELECT}}},
      }});
      if (!row) return {ok: false, code: "NOT_FOUND"}; const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      const cover = mediaView(row.coverMedia, uploadBase);
      const photos = row.photos.map(({media, caption, order}) => {const view = mediaView(media, uploadBase); return view ? {media: view, caption, order} : null;});
      if ((row.coverMedia && !cover) || photos.some((photo) => !photo)) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "ALBUM", slug: row.slug, eventDate: safeDate(row.eventDate),
        cover, photos,
        translation: {...resolution(locale, translation.locale), title: translation.title, description: rich(translation.description)}};
    } else if (query.resource === "EVENT") {
      const row = await prisma.event.findFirst({where: {
        slug: query.slug, isPublished: true, OR: [{expiresAt: null}, {expiresAt: {gt: now}}], translations: {some: localeFilter},
      }, include: {translations: {where: localeFilter}}});
      if (!row) return {ok: false, code: "NOT_FOUND"}; const translation = resolve(row.translations, locale);
      const registration = row.registrationUrl === null ? null : configuredLink(row.registrationUrl);
      if (!translation || registration === undefined
        || (row.registrationUrl !== null && registration?.kind !== "EXTERNAL")) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "EVENT", slug: row.slug, startAt: row.startAt.toISOString(), endAt: safeDate(row.endAt),
        registrationUrl: registration?.kind === "EXTERNAL" ? registration.href : null,
        translation: {...resolution(locale, translation.locale), title: translation.title, description: rich(translation.description), location: translation.location}};
    } else if ("id" in query && query.resource === "FAQ") {
      const row = await prisma.faq.findFirst({where: {
        id: query.id, isVisible: true, OR: [{expiresAt: null}, {expiresAt: {gt: now}}], translations: {some: localeFilter},
      }, include: {translations: {where: localeFilter}}});
      if (!row) return {ok: false, code: "NOT_FOUND"}; const translation = resolve(row.translations, locale);
      if (!translation) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "FAQ", order: row.order,
        translation: {...resolution(locale, translation.locale), category: translation.category, question: translation.question, answer: rich(translation.answer)}};
    } else {
      if (!("id" in query)) return {ok: false, code: "NOT_FOUND"};
      const row = await prisma.testimonial.findFirst({where: {
        id: query.id, isVisible: true, publicationConsentAt: {lte: now}, translations: {some: localeFilter},
      }, include: {translations: {where: localeFilter}, photoMedia: {select: MEDIA_SELECT}}});
      if (!row) return {ok: false, code: "NOT_FOUND"}; const translation = resolve(row.translations, locale);
      const photo = mediaView(row.photoMedia, uploadBase);
      if (!translation || (row.photoMedia && !photo)) return {ok: false, code: "NOT_FOUND"};
      detail = {id: row.id, resource: "TESTIMONIAL", name: row.name, graduationYear: row.graduationYear,
        photo, order: row.order,
        translation: {...resolution(locale, translation.locale), currentRole: translation.currentRole, quote: rich(translation.quote)}};
    }
    const result = PublicContentDetailResultSchema.safeParse({ok: true, data: detail});
    return result.success ? result.data : {ok: false, code: "NOT_FOUND"};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

export function publicContentIsExpired(expiresAt: Date | null, now: Date) {
  return isExpired(expiresAt, now);
}
