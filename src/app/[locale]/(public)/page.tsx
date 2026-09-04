import type {Metadata} from "next";
import {connection} from "next/server";
import type {ReactNode} from "react";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AcademicVoicesSection as ColumnsSection} from "@/components/public/academic-voices-section";
import {AchievementsSection} from "@/components/public/achievements-section";
import {DeanWelcomeSection} from "@/components/public/dean-welcome-section";
import {FacilitiesSection} from "@/components/public/facilities-section";
import {FacultyIntroSection} from "@/components/public/faculty-intro-section";
import {HeroSlider} from "@/components/public/hero-slider";
import {HomeCtaSection} from "@/components/public/home-cta-section";
import {HomeNewsroom} from "@/components/public/home-newsroom";
import {HomeQuickAccess} from "@/components/public/home-quick-access";
import {PartnersSection} from "@/components/public/partners-section";
import {ServicesSection} from "@/components/public/services-section";
import {StatsSection} from "@/components/public/stats-section";
import {TestimonialsSection} from "@/components/public/testimonials-section";
import {VideoSection} from "@/components/public/video-section";
import {institution} from "@/config/institution";
import type {PublicContentDetail} from "@/contracts/public-content";
import {listPublicAcademicPeople} from "@/features/academic/people";
import {listPublicHomeAchievements} from "@/features/achievement/domain";
import {listPublicHomeFacilities} from "@/features/facility/domain";
import {
  getPublicHomeSections,
  getPublicSiteSetting,
  listPublicHomeGalleryVideos,
  listPublicHomeSliders,
  listPublicStatistics,
} from "@/features/home-nav/public-query";
import {listPublicContent} from "@/features/public-content/public-list";
import {getPublicContentDetail} from "@/features/public-content/public-query";
import type {AppLocale} from "@/i18n/routing";
import {getPrismaClient} from "@/lib/db/client";
import {listPublicPosts} from "@/lib/content/post-public-queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

export const dynamic = "force-dynamic";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Home"});
  let ogImage: string | null = null;
  try {
    await connection();
    const sliders = await listPublicHomeSliders(
      getPrismaClient(),
      (locale === "en" || locale === "ar" ? locale : "id") as AppLocale,
      process.env.UPLOAD_PUBLIC_URL ?? "/uploads",
    );
    ogImage = sliders[0]?.image?.url ?? null;
  } catch {
    ogImage = null;
  }
  return {
    title: {absolute: `${institution.name} — ${institution.university}`},
    description: t("heroSubtitle"),
    openGraph: {
      type: "website",
      siteName: institution.name,
      url: SITE_URL,
      description: t("heroSubtitle"),
      images: ogImage ? [{url: ogImage, alt: institution.name}] : undefined,
    },
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
    sliders,
    siteSetting,
    statistics,
    sections,
    newsResult,
    announcementResult,
    columnDeanResult,
    columnLecturerResult,
    columnStudentResult,
    partnershipResult,
    eventResult,
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

  type SectionKey = Parameters<typeof sections.get>[0];
  const isVisible = (key: SectionKey) => sections.get(key)?.isVisible ?? false;
  const orderOf = (keys: readonly SectionKey[], fallback: number) => {
    const orders = keys.flatMap((key) => {
      const section = sections.get(key);
      return section?.isVisible ? [section.order] : [];
    });
    return orders.length ? Math.min(...orders) : fallback;
  };

  const facilitySection = sections.get("FACILITY");
  const achievementSection = sections.get("ACHIEVEMENT");
  const gallerySection = sections.get("VIDEO_GALLERY");
  const [
    facilityItems,
    achievementItems,
    galleryVideos,
    programsResult,
    lecturersResult,
    testimonialList,
  ] = await Promise.all([
    facilitySection?.isVisible ? listPublicHomeFacilities(prisma, locale, facilitySection.itemLimit, uploadBase) : Promise.resolve([]),
    achievementSection?.isVisible ? listPublicHomeAchievements(prisma, locale, achievementSection.itemLimit, uploadBase) : Promise.resolve([]),
    gallerySection?.isVisible ? listPublicHomeGalleryVideos(prisma, locale, gallerySection.itemLimit) : Promise.resolve([]),
    (isVisible("INTRO") || isVisible("PRODI"))
      ? listPublicAcademicPeople(prisma, {resource: "STUDY_PROGRAM", page: 1, pageSize: 10, search: "", direction: "ASC", active: "ACTIVE", studyProgramId: null, year: null}, locale, uploadBase)
      : Promise.resolve({ok: true as const, data: {items: [], page: {page: 1, pageSize: 10, total: 0, pageCount: 0}}}),
    isVisible("COLUMN")
      ? listPublicAcademicPeople(prisma, {resource: "LECTURER", page: 1, pageSize: 10, search: "", direction: "ASC", active: "ACTIVE", studyProgramId: null, year: null}, locale, uploadBase)
      : Promise.resolve({ok: true as const, data: {items: [], page: {page: 1, pageSize: 10, total: 0, pageCount: 0}}}),
    isVisible("TESTIMONIAL")
      ? listPublicContent(prisma, {resource: "TESTIMONIAL", locale, page: 1, pageSize: 10})
      : Promise.resolve({ok: true as const, items: [], page: {page: 1, pageSize: 10, total: 0, pageCount: 0}}),
  ]);

  const testimonialDetails = testimonialList.ok
    ? await Promise.all(testimonialList.items.slice(0, 6).map((item) => getPublicContentDetail(prisma, {resource: "TESTIMONIAL", id: item.id, locale}, new Date(), uploadBase)))
    : [];
  const testimonials = testimonialDetails.flatMap((result) =>
    result.ok && result.data.resource === "TESTIMONIAL"
      ? [result.data as Extract<PublicContentDetail, {resource: "TESTIMONIAL"}>]
      : [],
  ).sort((a, b) => a.order - b.order);

  const news = newsResult.ok ? newsResult.data.items : [];
  const announcements = announcementResult.ok ? announcementResult.data.items : [];
  const events = eventResult.ok ? eventResult.items.slice(0, 4) : [];
  const partnerships = partnershipResult.ok ? partnershipResult.items : [];
  const programs = programsResult.ok ? programsResult.data.items : [];
  const lecturers = lecturersResult.ok ? lecturersResult.data.items : [];
  const columnGroups = [
    {role: "DEKAN" as const, items: columnDeanResult.ok ? columnDeanResult.data.items : []},
    {role: "DOSEN" as const, items: columnLecturerResult.ok ? columnLecturerResult.data.items : []},
    {role: "MAHASISWA" as const, items: columnStudentResult.ok ? columnStudentResult.data.items : []},
  ];

  const profileVideo = siteSetting?.video ?? null;
  const showProfileInGallery = siteSetting?.showProfileVideoInGallery ?? false;
  const videoFeatured = profileVideo && (isVisible("VIDEO") || (isVisible("VIDEO_GALLERY") && showProfileInGallery)) ? profileVideo : null;
  const videoItems = isVisible("VIDEO_GALLERY") ? galleryVideos : [];
  const videoTitle = videoItems.length > 0 ? (gallerySection?.title ?? t("videoGalleryTitle")) : (sections.get("VIDEO")?.title ?? t("videosTitle"));

  const rendered: Array<{id: string; order: number; node: ReactNode}> = [
    {id: "hero", order: orderOf(["HERO"], 10), node: isVisible("HERO") && sliders.length > 0 ? <HeroSlider slides={sliders} /> : null},
    {id: "quick", order: orderOf(["QUICKLINK"], 20), node: isVisible("QUICKLINK") ? <HomeQuickAccess /> : null},
    {id: "dean", order: orderOf(["DEAN"], 30), node: isVisible("DEAN") && siteSetting?.dean ? <DeanWelcomeSection dean={siteSetting.dean} title={sections.get("DEAN")?.title || t("deanWelcome")} ctaLabel={sections.get("DEAN")?.ctaLabel || t("deanCta")} /> : null},
    {id: "stats", order: orderOf(["STATS"], 40), node: isVisible("STATS") ? <StatsSection items={statistics} title={sections.get("STATS")?.title} description={sections.get("STATS")?.subtitle} /> : null},
    {id: "intro", order: orderOf(["INTRO", "PRODI"], 50), node: (isVisible("INTRO") || isVisible("PRODI")) ? <FacultyIntroSection programs={programs} title={sections.get("INTRO")?.title} description={sections.get("INTRO")?.subtitle} /> : null},
    {id: "services", order: orderOf(["SERVICE"], 60), node: isVisible("SERVICE") ? <ServicesSection /> : null},
    {id: "newsroom", order: orderOf(["NEWS", "ANNOUNCEMENT", "AGENDA"], 70), node: (isVisible("NEWS") || isVisible("ANNOUNCEMENT") || isVisible("AGENDA")) ? <HomeNewsroom news={isVisible("NEWS") ? news : []} announcements={isVisible("ANNOUNCEMENT") ? announcements : []} events={isVisible("AGENDA") ? events : []} locale={locale} /> : null},
    {id: "achievements", order: orderOf(["ACHIEVEMENT"], 80), node: achievementItems.length > 0 ? <AchievementsSection items={achievementItems} locale={locale} title={achievementSection?.title || t("achievementsTitle")} description={achievementSection?.subtitle ?? null} ctaLabel={achievementSection?.ctaLabel || t("viewAll")} /> : null},
    {id: "facilities", order: orderOf(["FACILITY"], 90), node: facilityItems.length > 0 ? <FacilitiesSection items={facilityItems} /> : null},
    {id: "voices", order: orderOf(["COLUMN"], 100), node: isVisible("COLUMN") ? <ColumnsSection groups={columnGroups} lecturers={lecturers} locale={locale} /> : null},
    {id: "testimonials", order: orderOf(["TESTIMONIAL"], 110), node: testimonials.length > 0 ? <TestimonialsSection items={testimonials} /> : null},
    {id: "video", order: orderOf(["VIDEO", "VIDEO_GALLERY"], 120), node: videoFeatured || videoItems.length > 0 ? <VideoSection eyebrow={videoFeatured && videoItems.length > 0 ? (sections.get("VIDEO")?.title ?? "") : ""} title={videoTitle} subtitle={videoItems.length > 0 ? gallerySection?.subtitle : null} featured={videoFeatured} videos={videoItems} /> : null},
    {id: "partners", order: orderOf(["PARTNERSHIP"], 130), node: isVisible("PARTNERSHIP") ? <PartnersSection partners={partnerships} /> : null},
    {id: "cta", order: orderOf(["CTA"], 140), node: (sections.get("CTA")?.isVisible ?? true) ? <HomeCtaSection /> : null},
  ];

  return <>{rendered.filter((section) => section.node).sort((a, b) => a.order - b.order).map((section) => <div key={section.id}>{section.node}</div>)}</>;
}
