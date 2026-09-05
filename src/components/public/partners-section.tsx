import { getTranslations } from "next-intl/server";
import type { z } from "zod";

import { PartnersMarquee } from "@/components/public/partners-marquee";
import type { PublicContentCardSchema } from "@/contracts/public-content";
import {Container} from "@/components/ui/container";
import styles from "./home-design.module.css";
import {Reveal} from "./reveal";
import {HomeSectionHeading} from "./home-section-heading";

type PartnerCard = z.infer<typeof PublicContentCardSchema>;

type PartnersSectionProps = { partners: readonly PartnerCard[] };

/** Compact collaboration band with a static, full-color institutional logo strip. */
export async function PartnersSection({ partners }: PartnersSectionProps) {
  const t = await getTranslations("Home");

  if (partners.length === 0) return null;

  return (
    <section className={`${styles.section} ${styles.band} bg-royal-50`} aria-labelledby="partners-title">
      <Container>
      <HomeSectionHeading id="partners-title" title={t("partnersTitle")} eyebrow={t("partnersLabel")} description={t("partnersDescription")} compact />
      <Reveal variant="fade" className="!block"><PartnersMarquee partners={partners} /></Reveal>
      </Container>
    </section>
  );
}
