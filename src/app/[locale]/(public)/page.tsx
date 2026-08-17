import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

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
import {VideosSection} from "@/components/public/videos-section";
import {institution} from "@/config/institution";
import type {AppLocale} from "@/i18n/routing";
import {getPrismaClient} from "@/lib/db/client";
import {listPublicPosts} from "@/lib/content/post-public-queries";
import {listPublicContent} from "@/features/public-content/public-list";
import {listPublicHomeFacilities} from "@/features/facility/domain";
import {
  getPublicHomeSections,
  getPublicSiteSetting,
  listPublicHomeSliders,
  listPublicStatistics,
} from "@/features/home-nav/public-query";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

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

  const prisma = getPrismaClient();
  const uploadBase = process.env.UPLOAD_PUBLIC_URL ?? "/uploads";

  const [
    sliders, siteSetting, statistics, sections,
    newsResult, announcementResult, columnResult, partnershipResult, eventResult,
  ] = await Promise.all([
    listPublicHomeSliders(prisma, locale, uploadBase),
    getPublicSiteSetting(prisma, locale, uploadBase),
    listPublicStatistics(prisma, locale),
    getPublicHomeSections(prisma, locale),
    listPublicPosts(prisma, {locale, type: "BERITA", pageSize: 5}, uploadBase),
    listPublicPosts(prisma, {locale, type: "PENGUMUMAN", pageSize: 5}, uploadBase),
    listPublicPosts(prisma, {locale, type: "KOLOM", pageSize: 4}, uploadBase),
    listPublicContent(prisma, {resource: "PARTNERSHIP", locale, pageSize: 12}),
    listPublicContent(prisma, {resource: "EVENT", locale, pageSize: 4}),
  ]);

  const news = newsResult.ok ? newsResult.data.items : [];
  const announcements = announcementResult.ok ? announcementResult.data.items : [];
  const columns = columnResult.ok ? columnResult.data.items : [];
  const partnerships = "ok" in partnershipResult && partnershipResult.ok ? partnershipResult.items : [];
  const events = "ok" in eventResult && eventResult.ok ? eventResult.items : [];

  const isVisible = (key: Parameters<typeof sections.get>[0]) => sections.get(key)?.isVisible ?? false;
  const facilitySection = sections.get("FACILITY");
  const facilityItems = facilitySection?.isVisible
    ? await listPublicHomeFacilities(prisma, locale, facilitySection.itemLimit, uploadBase)
    : [];

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

      {isVisible("COLUMN") ? <ColumnsSection items={columns} locale={locale} /> : null}

      {facilityItems.length > 0 ? <FacilitiesSection items={facilityItems} /> : null}

      {isVisible("VIDEO") && siteSetting?.video ? <VideosSection video={siteSetting.video} eyebrow={sections.get("VIDEO")?.title ?? ""} /> : null}

      {isVisible("PARTNERSHIP") ? <PartnersSection partners={partnerships} /> : null}

      <HomeCtaSection />
    </>
  );
}
