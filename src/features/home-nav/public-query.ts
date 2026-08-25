import type {HomeSectionKey} from "@/contracts/home-nav";
import {configuredLink, mediaView, resolve, type Locale, type PublicContentDatabase} from "@/features/public-content/shared";

export type PublicHomeSlide = {
  id: string;
  image: NonNullable<ReturnType<typeof mediaView>>;
  cta: ReturnType<typeof configuredLink>;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
};

export async function listPublicHomeSliders(
  prisma: PublicContentDatabase,
  locale: Locale,
  uploadBase = "/uploads",
): Promise<PublicHomeSlide[]> {
  const rows = await prisma.homeSlider.findMany({
    where: {isVisible: true},
    orderBy: [{order: "asc"}, {id: "asc"}],
    include: {translations: true, imageMedia: true},
  });
  const slides: PublicHomeSlide[] = [];
  for (const row of rows) {
    const image = mediaView(row.imageMedia, uploadBase);
    const text = resolve(row.translations, locale);
    if (!image || !text || !text.title) continue;
    slides.push({
      id: row.id, image, cta: row.ctaUrl ? configuredLink(row.ctaUrl) ?? null : null,
      title: text.title, subtitle: text.subtitle, ctaLabel: text.ctaLabel,
    });
  }
  return slides;
}

export type PublicStatisticItem = {id: string; value: string; suffix: string | null; icon: string | null; label: string};

export async function listPublicStatistics(prisma: PublicContentDatabase, locale: Locale): Promise<PublicStatisticItem[]> {
  const rows = await prisma.statistic.findMany({
    where: {isVisible: true}, orderBy: [{order: "asc"}, {id: "asc"}], include: {translations: true},
  });
  const items: PublicStatisticItem[] = [];
  for (const row of rows) {
    const text = resolve(row.translations, locale);
    if (!text) continue;
    items.push({id: row.id, value: row.value, suffix: row.suffix, icon: row.icon, label: text.label});
  }
  return items;
}

export type PublicDean = {name: string; position: string; message: string; photo: NonNullable<ReturnType<typeof mediaView>> | null};
export type PublicHomeVideo = {url: string; poster: NonNullable<ReturnType<typeof mediaView>>; title: string; description: string | null};
type PublicSiteMedia = NonNullable<ReturnType<typeof mediaView>>;
export type PublicSiteSetting = {
  facultyName: string; tagline: string | null; addresses: string[]; email: string | null; phone: string | null;
  socialLinks: {facebook: string | null; instagram: string | null; youtube: string | null; x: string | null};
  dean: PublicDean | null; video: PublicHomeVideo | null;
  logo: PublicSiteMedia | null; accreditationLogo: PublicSiteMedia | null;
  bluLogo: PublicSiteMedia | null; favicon: PublicSiteMedia | null;
};

export async function getPublicSiteSetting(
  prisma: PublicContentDatabase,
  locale: Locale,
  uploadBase = "/uploads",
): Promise<PublicSiteSetting | null> {
  const row = await prisma.siteSetting.findUnique({
    where: {id: "singleton"},
    include: {
      translations: true, deanPhoto: true, videoPoster: true, logoMedia: true,
      accreditationLogoMedia: true, bluLogoMedia: true, faviconMedia: true,
    },
  });
  if (!row) return null;
  const text = resolve(row.translations, locale);
  if (!text) return null;

  const deanPhoto = mediaView(row.deanPhoto, uploadBase);
  const dean = row.deanName && text.deanPosition && text.deanMessage
    ? {name: row.deanName, position: text.deanPosition, message: text.deanMessage, photo: deanPhoto}
    : null;

  const videoPoster = mediaView(row.videoPoster, uploadBase);
  const video = row.videoUrl && videoPoster && text.videoTitle
    ? {url: row.videoUrl, poster: videoPoster, title: text.videoTitle, description: text.videoDesc}
    : null;

  return {
    facultyName: text.facultyName, tagline: text.tagline,
    addresses: [text.address1, text.address2].filter((value): value is string => Boolean(value)),
    email: row.email, phone: row.phone,
    socialLinks: {facebook: row.facebookUrl, instagram: row.instagramUrl, youtube: row.youtubeUrl, x: row.xUrl},
    dean, video,
    logo: mediaView(row.logoMedia, uploadBase),
    accreditationLogo: mediaView(row.accreditationLogoMedia, uploadBase),
    bluLogo: mediaView(row.bluLogoMedia, uploadBase),
    favicon: mediaView(row.faviconMedia, uploadBase),
  };
}

export type PublicHomeGalleryVideo = {id: string; youtubeUrl: string; title: string};

export async function listPublicHomeGalleryVideos(
  prisma: PublicContentDatabase,
  locale: Locale,
  limit?: number,
): Promise<PublicHomeGalleryVideo[]> {
  const rows = await prisma.homeVideo.findMany({
    where: {isVisible: true},
    orderBy: [{order: "asc"}, {id: "asc"}],
    include: {translations: true},
    ...(limit ? {take: limit} : {}),
  });
  const items: PublicHomeGalleryVideo[] = [];
  for (const row of rows) {
    const text = resolve(row.translations, locale);
    if (!text) continue;
    items.push({id: row.id, youtubeUrl: row.youtubeUrl, title: text.title});
  }
  return items;
}

export type PublicHomeSectionMeta = {
  key: HomeSectionKey; isVisible: boolean; order: number; itemLimit: number;
  title: string; subtitle: string | null; cta: ReturnType<typeof configuredLink>; ctaLabel: string | null;
};

export async function getPublicHomeSections(
  prisma: PublicContentDatabase,
  locale: Locale,
): Promise<Map<HomeSectionKey, PublicHomeSectionMeta>> {
  const rows = await prisma.homeSection.findMany({orderBy: [{order: "asc"}, {id: "asc"}], include: {translations: true}});
  const map = new Map<HomeSectionKey, PublicHomeSectionMeta>();
  for (const row of rows) {
    const text = resolve(row.translations, locale);
    if (!text) continue;
    map.set(row.key as HomeSectionKey, {
      key: row.key as HomeSectionKey, isVisible: row.isVisible, order: row.order, itemLimit: row.itemLimit,
      title: text.title, subtitle: text.subtitle, cta: row.ctaUrl ? configuredLink(row.ctaUrl) ?? null : null,
      ctaLabel: text.ctaLabel,
    });
  }
  return map;
}
