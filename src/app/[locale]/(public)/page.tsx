import type {Metadata} from "next";
import {connection} from "next/server";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AchievementsSection} from "@/components/public/achievements-section";
import {AnnouncementsAgendaSection} from "@/components/public/announcements-agenda-section";
import {ColumnsSection} from "@/components/public/columns-section";
import {DeanWelcomeSection} from "@/components/public/dean-welcome-section";
import {FacilitiesSection} from "@/components/public/facilities-section";
import {HeroSlider} from "@/components/public/hero-slider";
import {HomeCtaSection} from "@/components/public/home-cta-section";
import {NewsSection} from "@/components/public/news-section";
import {PartnersSection} from "@/components/public/partners-section";
import {ServicesSection} from "@/components/public/services-section";
import {StatsSection} from "@/components/public/stats-section";
import {VideoSection} from "@/components/public/video-section";
import {institution} from "@/config/institution";
import type {AppLocale} from "@/i18n/routing";
import {getPrismaClient} from "@/lib/db/client";
import {listPublicPosts} from "@/lib/content/post-public-queries";
import {listPublicContent} from "@/features/public-content/public-list";
import {listPublicHomeAchievements} from "@/features/achievement/domain";
import {listPublicHomeFacilities} from "@/features/facility/domain";
import {
  getPublicHomeSections,
  getPublicSiteSetting,
  listPublicHomeGalleryVideos,
  listPublicHomeSliders,
  listPublicStatistics,
} from "@/features/home-nav/public-query";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

export const dynamic = "force-dynamic";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Home"});
  return {
    title: {absolute: `${institution.name} — ${institution.university}`},
    description: t("heroSubtitle"),
    openGraph: {type: "website", siteName: institution.name, url: SITE_URL, description: t("heroSubtitle")},
    alternates: {languages: {id: `${SITE_URL}/id`, en: `${SITE_URL}/en`, ar: `${SITE_URL}/ar`}},
  };
}

export default async function HomePage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  await connection();
  const t = await getTranslations("Home");

  const prisma = getPrismaClient();
  const uploadBase = process.env.UPLOAD_PUBLIC_URL ?? "/uploads";

  const [
    sliders, siteSetting, statistics, sections,
    newsResult, announcementResult, columnDeanResult, columnLecturerResult, columnStudentResult,
    partnershipResult, eventResult,
  ] = await Promise.all([
    listPublicHomeSliders(prisma, locale, uploadBase),
    getPublicSiteSetting(prisma, locale, uploadBase),
    listPublicStatistics(prisma, locale),
    getPublicHomeSections(prisma, locale),
    listPublicPosts(prisma, {locale, type: "BERITA", pageSize: 5}, uploadBase),
    listPublicPosts(prisma, {locale, type: "PENGUMUMAN", pageSize: 5}, uploadBase),
    listPublicPosts(prisma, {locale, type: "KOLOM", columnType: "DEKAN", pageSize: 5}, uploadBase),
    listPublicPosts(prisma, {locale, type: "KOLOM", columnType: "DOSEN", pageSize: 5}, uploadBase),
    listPublicPosts(prisma, {locale, type: "KOLOM", columnType: "MAHASISWA", pageSize: 5}, uploadBase),
    listPublicContent(prisma, {resource: "PARTNERSHIP", locale, pageSize: 10}),
    listPublicContent(prisma, {resource: "EVENT", locale, pageSize: 10}),
  ]);

  const news = newsResult.ok ? newsResult.data.items : [];
  const announcements = announcementResult.ok ? announcementResult.data.items : [];
  const columnGroups = [
    {role: "DEKAN" as const, items: columnDeanResult.ok ? columnDeanResult.data.items : []},
    {role: "DOSEN" as const, items: columnLecturerResult.ok ? columnLecturerResult.data.items : []},
    {role: "MAHASISWA" as const, items: columnStudentResult.ok ? columnStudentResult.data.items : []},
  ];
  const partnerships = "ok" in partnershipResult && partnershipResult.ok ? partnershipResult.items : [];
  // pageSize is clamped to the shared 10/20/50 contract; the homepage widget
  // only ever shows the first four upcoming events.
  const events = "ok" in eventResult && eventResult.ok ? eventResult.items.slice(0, 4) : [];

  const isVisible = (key: Parameters<typeof sections.get>[0]) => sections.get(key)?.isVisible ?? false;
  const facilitySection = sections.get("FACILITY");
  const facilityItems = facilitySection?.isVisible
    ? await listPublicHomeFacilities(prisma, locale, facilitySection.itemLimit, uploadBase)
    : [];
  const achievementSection = sections.get("ACHIEVEMENT");
  const achievementItems = achievementSection?.isVisible
    ? await listPublicHomeAchievements(prisma, locale, achievementSection.itemLimit, uploadBase)
    : [];
  const videoGallerySection = sections.get("VIDEO_GALLERY");
  const galleryVideos = videoGallerySection?.isVisible
    ? await listPublicHomeGalleryVideos(prisma, locale, videoGallerySection.itemLimit)
    : [];
  const showProfileInGallery = siteSetting?.showProfileVideoInGallery ?? false;

  // The profile video and the gallery are two independent home-section keys but
  // render as one section — a lead player over a grid — so it never looks half-empty.
  const profileVideo = siteSetting?.video ?? null;
  const videoFeatured = profileVideo
    && (isVisible("VIDEO") || (isVisible("VIDEO_GALLERY") && showProfileInGallery))
    ? profileVideo
    : null;
  const videoGridItems = isVisible("VIDEO_GALLERY") ? galleryVideos : [];
  const videoHasContent = Boolean(videoFeatured) || videoGridItems.length > 0;
  const videoDevPlaceholder =
    !videoHasContent && isVisible("VIDEO") && process.env.NODE_ENV !== "production";
  const videoTitle = videoGridItems.length > 0
    ? (videoGallerySection?.title ?? t("videoGalleryTitle"))
    : (sections.get("VIDEO")?.title ?? t("videoGalleryTitle"));

  return (
    <>
      {isVisible("HERO") && sliders.length > 0 ? <HeroSlider slides={sliders} /> : null}

      {isVisible("DEAN") && siteSetting?.dean ? (
        <DeanWelcomeSection
          dean={siteSetting.dean}
          title={sections.get("DEAN")?.title ?? ""}
          ctaLabel={sections.get("DEAN")?.ctaLabel ?? ""}
        />
      ) : null}

      {isVisible("STATS") ? <StatsSection items={statistics} /> : null}

      {isVisible("SERVICE") ? <ServicesSection /> : null}

      {isVisible("NEWS") ? <NewsSection items={news} locale={locale} /> : null}

      {(isVisible("ANNOUNCEMENT") || isVisible("AGENDA")) ? (
        <AnnouncementsAgendaSection
          locale={locale}
          announcements={isVisible("ANNOUNCEMENT") ? announcements : []}
          events={isVisible("AGENDA") ? events : []}
        />
      ) : null}

      {achievementItems.length > 0 ? (
        <AchievementsSection
          items={achievementItems}
          locale={locale}
          title={achievementSection?.title ?? ""}
          description={achievementSection?.subtitle ?? null}
          ctaLabel={achievementSection?.ctaLabel ?? ""}
        />
      ) : null}

      {facilityItems.length > 0 ? <FacilitiesSection items={facilityItems} /> : null}

      {isVisible("COLUMN") ? <ColumnsSection groups={columnGroups} locale={locale} /> : null}

      {videoHasContent || videoDevPlaceholder ? (
        <VideoSection
          eyebrow={videoFeatured && videoGridItems.length > 0 ? (sections.get("VIDEO")?.title ?? "") : ""}
          title={videoTitle}
          subtitle={videoGridItems.length > 0 ? (videoGallerySection?.subtitle ?? null) : null}
          featured={videoFeatured}
          videos={videoGridItems}
          placeholder={videoDevPlaceholder}
        />
      ) : null}

      {isVisible("PARTNERSHIP") ? <PartnersSection partners={partnerships} /> : null}

      <HomeCtaSection />
    </>
  );
}
