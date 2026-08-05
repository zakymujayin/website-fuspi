import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {AdvantagesSection} from "@/components/public/advantages-section";
import {DeanWelcomeSection} from "@/components/public/dean-welcome-section";
import {FacilitiesSection} from "@/components/public/facilities-section";
import {HeroSlider} from "@/components/public/hero-slider";
import {HomeCtaSection} from "@/components/public/home-cta-section";
import {NewsAnnouncementsEvents} from "@/components/public/news-announcements-events";
import {PartnersSection} from "@/components/public/partners-section";
import {StatsSection} from "@/components/public/stats-section";
import {StudyProgramsSection} from "@/components/public/study-programs-section";
import {VisionMissionSection} from "@/components/public/vision-mission-section";
import {institution} from "@/config/institution";
import type {AppLocale} from "@/i18n/routing";
import {heroSlides} from "@/lib/data/dummy-hero-slides";

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

  return (
    <>
      <HeroSlider slides={heroSlides} locale={locale} />
      <AdvantagesSection />
      <DeanWelcomeSection locale={locale} />
      <StatsSection />
      <VisionMissionSection locale={locale} />
      <StudyProgramsSection />
      <NewsAnnouncementsEvents locale={locale} />
      <FacilitiesSection locale={locale} />
      <PartnersSection />
      <HomeCtaSection />
    </>
  );
}
