import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {OrgChartViewer} from "@/components/public/org-chart-viewer";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";

/**
 * The chart is an image the faculty maintains itself, served straight from
 * `public/` so its full resolution survives — the media pipeline would cap it
 * at 1600px and leave the small boxes unreadable under magnification.
 * Replacing the chart means replacing this file.
 */
const ORG_CHART_SRC = "/images/struktur/struktur-organisasi.png";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("structure")};
}

export default async function StructurePage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tChart = await getTranslations("OrgChart");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("structure")} description={t("structureDesc")} />

      <div className="mt-10">
        <OrgChartViewer src={ORG_CHART_SRC} alt={tChart("alt")} />
      </div>
    </Container>
  );
}
