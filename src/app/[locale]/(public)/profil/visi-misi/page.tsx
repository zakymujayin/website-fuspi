import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {VisionMissionSection} from "@/components/public/vision-mission-section";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("visionMission")};
}

export default async function VisionMissionPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <>
      <Container className="py-12 md:py-16">
        <SectionHeading as="h1" title={t("visionMission")} description={t("visionMissionDesc")} />
      </Container>
      <VisionMissionSection locale={locale} />
    </>
  );
}
