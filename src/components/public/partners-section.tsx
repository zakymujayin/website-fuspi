import { getTranslations } from "next-intl/server";
import type { z } from "zod";

import { PartnersMarquee } from "@/components/public/partners-marquee";
import type { PublicContentCardSchema } from "@/contracts/public-content";

type PartnerCard = z.infer<typeof PublicContentCardSchema>;

type PartnersSectionProps = { partners: readonly PartnerCard[] };

/**
 * A single compact strip, not a full section with its own heading: a short
 * inline label beside a full-bleed logo scroll, matching a plain
 * institutional "Mitra Kami" band rather than a boxed feature section.
 */
export async function PartnersSection({ partners }: PartnersSectionProps) {
  const t = await getTranslations("Home");

  if (partners.length === 0) return null;

  return (
    <section className="border-y border-slate-300 bg-white py-16 md:py-20" aria-labelledby="partners-title">
      <div className="mb-10 grid gap-4 px-5 sm:px-8 lg:grid-cols-[1fr_2fr] lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">{t("partnersLabel")}</p>
        <div>
          <h2 id="partners-title" className="text-[28px] font-bold tracking-[-0.01em] text-slate-900 md:text-[34px]">{t("partnersTitle")}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{t("partnersDescription")}</p>
        </div>
      </div>
      <PartnersMarquee partners={partners} />
    </section>
  );
}
