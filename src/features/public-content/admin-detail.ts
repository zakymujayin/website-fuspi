import {PublicContentAdminDetailQuerySchema, PublicContentAdminLoadResultSchema} from "@/contracts/public-content";

import {
  MEDIA_SELECT,
  actorOrNull,
  configuredLink,
  documentView,
  governance,
  mediaView,
  publicPdfMedia,
  safeDate,
  workflow,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

type TranslationRow = Parameters<typeof workflow>[0] & Record<string, unknown>;

function localized(rows: TranslationRow[], fields: string[]) {
  return Object.fromEntries(rows.map((row) => [row.locale,
    Object.fromEntries(fields.map((field) => [field, row[field] ?? null])),
  ]));
}

function workflows(rows: TranslationRow[]) {
  return rows.map(workflow);
}

function externalUrl(value: string | null) {
  if (value === null) return null;
  const link = configuredLink(value);
  return link?.kind === "EXTERNAL" ? link.href : undefined;
}

function mediaAsset(media: Parameters<typeof mediaView>[0], uploadBase: string) {
  const view = mediaView(media, uploadBase);
  return view ? {kind: "MEDIA" as const, media: view} : null;
}

export async function getPublicContentAdminDetail(
  prisma: PublicContentDatabase,
  rawActor: unknown,
  rawQuery: unknown,
  now = new Date(),
  uploadBase = "/uploads",
) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = PublicContentAdminDetailQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return {ok: false as const, code: "REQUEST_INVALID" as const};
  const {resource, id} = parsed.data;

  try {
    let data: unknown;
    if (resource === "SERVICE") {
      const row = await prisma.service.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const link = row.url === null ? null : configuredLink(row.url);
      if (link === undefined) return {ok: false as const, code: "NOT_FOUND" as const};
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: governance(row), assets: [], input: {
        slug: row.slug, category: row.category, link, icon: (row as Record<string, unknown>).icon as string | null, isActive: row.isActive, order: row.order,
        contentOwnerId: row.contentOwnerId, expiresAt: safeDate(row.expiresAt),
        translations: localized(row.translations, ["name", "description"]),
      }};
    } else if (resource === "PARTNERSHIP") {
      const row = await prisma.partnership.findUnique({where: {id}, include: {
        translations: true, logoMedia: {select: MEDIA_SELECT}, document: {include: {translations: true}},
      }});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const websiteUrl = externalUrl(row.websiteUrl); const legacyDocumentUrl = externalUrl(row.documentUrl);
      const logo = row.logoMedia ? mediaAsset(row.logoMedia, uploadBase) : null;
      if (websiteUrl === undefined || legacyDocumentUrl === undefined || (row.logoMedia && !logo)) {
        return {ok: false as const, code: "NOT_FOUND" as const};
      }
      const document = documentView(row.document, "id", uploadBase);
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: null,
        assets: [...(logo ? [logo] : []), ...(document ? [{kind: "DOCUMENT" as const, document}] : [])], input: {
          slug: row.slug, partnerName: row.partnerName, level: row.level, country: row.country,
          startDate: safeDate(row.startDate), endDate: safeDate(row.endDate), documentId: row.documentId,
          legacyDocumentUrl, websiteUrl, logoMediaId: row.logoMediaId, isActive: row.isActive, order: row.order,
          translations: localized(row.translations, ["category", "description"]),
        }};
    } else if (resource === "SCHOLARSHIP") {
      const row = await prisma.scholarship.findUnique({where: {id}, include: {translations: true, document: {include: {translations: true}}}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const registrationUrl = externalUrl(row.registrationUrl);
      if (registrationUrl === undefined) return {ok: false as const, code: "NOT_FOUND" as const};
      const document = documentView(row.document, "id", uploadBase);
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: null,
        assets: document ? [{kind: "DOCUMENT", document}] : [], input: {
          slug: row.slug, startDate: safeDate(row.startDate), endDate: safeDate(row.endDate), registrationUrl,
          documentId: row.documentId, isActive: row.isActive,
          translations: localized(row.translations, ["title", "provider", "description"]),
        }};
    } else if (resource === "ACHIEVEMENT") {
      const row = await prisma.achievement.findUnique({where: {id}, include: {translations: true, imageMedia: {select: MEDIA_SELECT}}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const image = row.imageMedia ? mediaAsset(row.imageMedia, uploadBase) : null;
      if (row.imageMedia && !image) return {ok: false as const, code: "NOT_FOUND" as const};
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: null,
        assets: image ? [image] : [], input: {slug: row.slug, studentName: row.studentName, level: row.level,
          achievedAt: safeDate(row.achievedAt), imageMediaId: row.imageMediaId,
          translations: localized(row.translations, ["title", "description"])}};
    } else if (resource === "STUDENT_ACTIVITY") {
      const row = await prisma.studentActivity.findUnique({where: {id}, include: {translations: true,
        images: {orderBy: [{order: "asc"}, {id: "asc"}], include: {media: {select: MEDIA_SELECT}}}}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const assets = row.images.map(({media}) => mediaAsset(media, uploadBase));
      if (assets.some((asset) => !asset)) return {ok: false as const, code: "NOT_FOUND" as const};
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: null,
        assets, input: {slug: row.slug, date: safeDate(row.date),
          images: row.images.map(({mediaId, caption, order}) => ({mediaId, caption, order})),
          translations: localized(row.translations, ["title", "description"])}};
    } else if (resource === "DOCUMENT") {
      const row = await prisma.document.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const media = await prisma.media.findUnique({where: {storageKey: row.storageKey}, select: MEDIA_SELECT});
      if (!publicPdfMedia(media)) return {ok: false as const, code: "NOT_FOUND" as const};
      const document = documentView(row, "id", uploadBase);
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: governance(row),
        assets: document ? [{kind: "DOCUMENT", document}] : [], input: {slug: row.slug, publicPdfMediaId: media!.id,
          isPublished: row.publishedAt !== null, contentOwnerId: row.contentOwnerId, expiresAt: safeDate(row.expiresAt),
          translations: localized(row.translations, ["title", "category"])}};
    } else if (resource === "ALBUM") {
      const row = await prisma.album.findUnique({where: {id}, include: {translations: true, coverMedia: {select: MEDIA_SELECT},
        photos: {orderBy: [{order: "asc"}, {id: "asc"}], include: {media: {select: MEDIA_SELECT}}}}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const cover = row.coverMedia ? mediaAsset(row.coverMedia, uploadBase) : null;
      const photos = row.photos.map(({media}) => mediaAsset(media, uploadBase));
      if ((row.coverMedia && !cover) || photos.some((asset) => !asset)) return {ok: false as const, code: "NOT_FOUND" as const};
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: null,
        assets: [...(cover ? [cover] : []), ...photos], input: {slug: row.slug, coverMediaId: row.coverMediaId,
          eventDate: safeDate(row.eventDate), isPublished: row.isPublished,
          photos: row.photos.map(({mediaId, caption, order}) => ({mediaId, caption, order})),
          translations: localized(row.translations, ["title", "description"])}};
    } else if (resource === "EVENT") {
      const row = await prisma.event.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const registrationUrl = externalUrl(row.registrationUrl);
      if (registrationUrl === undefined) return {ok: false as const, code: "NOT_FOUND" as const};
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: governance(row), assets: [], input: {
        slug: row.slug, startAt: row.startAt.toISOString(), endAt: safeDate(row.endAt), registrationUrl,
        isPublished: row.isPublished, contentOwnerId: row.contentOwnerId, expiresAt: safeDate(row.expiresAt),
        translations: localized(row.translations, ["title", "description", "location"]),
      }};
    } else if (resource === "FAQ") {
      const row = await prisma.faq.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: governance(row), assets: [], input: {
        order: row.order, isVisible: row.isVisible, contentOwnerId: row.contentOwnerId, expiresAt: safeDate(row.expiresAt),
        translations: localized(row.translations, ["category", "question", "answer"]),
      }};
    } else {
      const row = await prisma.testimonial.findUnique({where: {id}, include: {translations: true, photoMedia: {select: MEDIA_SELECT}}});
      if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
      const photo = row.photoMedia ? mediaAsset(row.photoMedia, uploadBase) : null;
      if (row.photoMedia && !photo) return {ok: false as const, code: "NOT_FOUND" as const};
      data = {id, resource, version: row.version, translationWorkflow: workflows(row.translations), governance: null,
        assets: photo ? [photo] : [], input: {name: row.name, graduationYear: row.graduationYear,
          photoMediaId: row.photoMediaId, order: row.order, isVisible: row.isVisible,
          publicationConsentAt: safeDate(row.publicationConsentAt),
          translations: localized(row.translations, ["currentRole", "quote"])}};
    }
    const result = PublicContentAdminLoadResultSchema.safeParse({ok: true, data});
    return result.success ? result.data : {ok: false as const, code: "NOT_FOUND" as const};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}
