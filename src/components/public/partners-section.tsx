import { getTranslations } from "next-intl/server";
import type { z } from "zod";

import { PartnersMarquee } from "@/components/public/partners-marquee";
import type { PublicContentCardSchema } from "@/contracts/public-content";
import {Container} from "@/components/ui/container";
import styles from "./home-design.module.css";

type PartnerCard = z.infer<typeof PublicContentCardSchema>;

type PartnersSectionProps = { partners: readonly PartnerCard[] };

/** Compact collaboration band with a static, full-color institutional logo strip. */
export async function PartnersSection({ partners }: PartnersSectionProps) {
  const t = await getTranslations("Home");

  if (partners.length === 0) return null;

  return (
    <section className={`${styles.section} border-y border-slate-200 bg-royal-50 !py-12`} aria-labelledby="partners-title">
      <Container>
      <div className="mb-7 grid items-end gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-royal-800">{t("partnersLabel")}</p>
          <h2 id="partners-title" className="!text-[clamp(1.5rem,2.2vw,1.875rem)] font-bold text-slate-900">{t("partnersTitle")}</h2>
        </div>
        <p className="max-w-xl text-base leading-7 text-slate-700">{t("partnersDescription")}</p>
      </div>
      <PartnersMarquee partners={partners} />
      </Container>
    </section>
  );
}
