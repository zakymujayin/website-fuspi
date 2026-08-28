import { getTranslations } from "next-intl/server";
import type { z } from "zod";

import { PartnersMarquee } from "@/components/public/partners-marquee";
import type { PublicContentCardSchema } from "@/contracts/public-content";

type PartnerCard = z.infer<typeof PublicContentCardSchema>;

type PartnersSectionProps = { partners: readonly PartnerCard[] };

/**
 * A single compact strip, not a full section with its own heading: a short
 * inline label beside a full-bleed logo scroll, matching a plain
 * institutional "Partner Kami" band rather than a boxed feature section.
 */
export async function PartnersSection({ partners }: PartnersSectionProps) {
  const t = await getTranslations("Home");

  if (partners.length === 0) return null;

  return (
    <section className="border-t-2 border-brass-500 bg-white py-14 md:py-16">
      <div className="flex items-center gap-10">
        <span className="shrink-0 whitespace-nowrap ps-4 text-base font-semibold text-slate-900 sm:ps-6 md:text-lg">
          {t("partnersLabel")}
        </span>
        <PartnersMarquee partners={partners} />
      </div>
    </section>
  );
}
