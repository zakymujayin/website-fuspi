import {
  actorOrNull,
  adminImageMediaPreview,
  configuredLink,
  mediaView,
  type PublicContentDatabase,
} from "@/features/public-content/shared";

export type HomeNavDetailResource = "HOME_SLIDER" | "STATISTIC" | "HOME_SECTION" | "SITE_SETTING" | "HOME_VIDEO";

type TranslationMap = Record<string, Record<string, unknown>>;

function localizedInput(rows: Array<{locale: string} & Record<string, unknown>>, fields: string[]): TranslationMap {
  return Object.fromEntries(rows.map((row) => [row.locale,
    Object.fromEntries(fields.map((field) => [field, row[field] ?? null])),
  ]));
}

export type HomeNavMediaPreview = {id: string; url: string; mimeType: "image/webp" | "application/pdf"; width: number | null; height: number | null; alt: string; isDecorative: boolean};

export type HomeNavAdminDetailResult =
  | {ok: true; data: {
      input: Record<string, unknown>; version: number | null;
      media: HomeNavMediaPreview | null; secondaryMedia: HomeNavMediaPreview | null;
      logoMedia?: HomeNavMediaPreview | null; faviconMedia?: HomeNavMediaPreview | null;
    }}
  | {ok: false; code: "SESSION_INVALID" | "NOT_FOUND" | "UNAVAILABLE"};

export async function getHomeNavAdminDetail(
  prisma: PublicContentDatabase,
  rawActor: unknown,
  resource: HomeNavDetailResource,
  id: string,
  now = new Date(),
): Promise<HomeNavAdminDetailResult> {
  if (!actorOrNull(rawActor, now)) return {ok: false, code: "SESSION_INVALID"};

  try {
    if (resource === "HOME_SLIDER") {
      const row = await prisma.homeSlider.findUnique({where: {id}, include: {translations: true, imageMedia: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      return {ok: true, data: {
        version: null,
        media: adminImageMediaPreview(row.imageMedia), secondaryMedia: null,
        input: {
          imageMediaId: row.imageMediaId, cta: configuredLink(row.ctaUrl) ?? null,
          order: row.order, isVisible: row.isVisible,
          translations: localizedInput(row.translations, ["title", "subtitle", "ctaLabel"]),
        },
      }};
    }
    if (resource === "STATISTIC") {
      const row = await prisma.statistic.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      return {ok: true, data: {
        version: null, media: null, secondaryMedia: null,
        input: {
          value: row.value, suffix: row.suffix, icon: row.icon, order: row.order, isVisible: row.isVisible,
          translations: localizedInput(row.translations, ["label"]),
        },
      }};
    }
    if (resource === "HOME_SECTION") {
      const row = await prisma.homeSection.findUnique({where: {id}, include: {translations: true, backgroundMedia: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      return {ok: true, data: {
        version: null, media: mediaView(row.backgroundMedia), secondaryMedia: null,
        input: {
          key: row.key, isVisible: row.isVisible, order: row.order, itemLimit: row.itemLimit,
          cta: configuredLink(row.ctaUrl) ?? null, backgroundMediaId: row.backgroundMediaId,
          translations: localizedInput(row.translations, ["title", "subtitle", "ctaLabel"]),
        },
      }};
    }
    if (resource === "HOME_VIDEO") {
      const row = await prisma.homeVideo.findUnique({where: {id}, include: {translations: true}});
      if (!row) return {ok: false, code: "NOT_FOUND"};
      return {ok: true, data: {
        version: null, media: null, secondaryMedia: null,
        input: {
          youtubeUrl: row.youtubeUrl, order: row.order, isVisible: row.isVisible,
          translations: localizedInput(row.translations, ["title"]),
        },
      }};
    }
    const row = await prisma.siteSetting.findUnique({where: {id: "singleton"}, include: {
      translations: true, deanPhoto: true, videoPoster: true, logoMedia: true, faviconMedia: true,
    }});
    if (!row) return {ok: false, code: "NOT_FOUND"};
    return {ok: true, data: {
      version: row.version,
      media: adminImageMediaPreview(row.deanPhoto),
      secondaryMedia: adminImageMediaPreview(row.videoPoster),
      logoMedia: adminImageMediaPreview(row.logoMedia),
      faviconMedia: adminImageMediaPreview(row.faviconMedia),
      input: {
        deanName: row.deanName, deanPhotoMediaId: row.deanPhotoId, videoUrl: row.videoUrl,
        videoPosterMediaId: row.videoPosterMediaId, email: row.email, phone: row.phone,
        facebookUrl: row.facebookUrl, instagramUrl: row.instagramUrl, youtubeUrl: row.youtubeUrl, xUrl: row.xUrl,
        logoMediaId: row.logoMediaId, faviconMediaId: row.faviconMediaId,
        contentOwnerId: row.contentOwnerId, expiresAt: row.expiresAt?.toISOString() ?? null,
        translations: localizedInput(row.translations, [
          "facultyName", "tagline", "address1", "address2", "deanPosition", "deanMessage", "videoTitle", "videoDesc",
        ]),
      },
    }};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}
