import { getTranslations } from "next-intl/server";
import type { z } from "zod";

import { Container } from "@/components/ui/container";
import { PartnersMarquee } from "@/components/public/partners-marquee";
import type { PublicContentCardSchema } from "@/contracts/public-content";

type PartnerCard = z.infer<typeof PublicContentCardSchema>;

type PartnersSectionProps = { partners: readonly PartnerCard[] };

export async function PartnersSection({ partners }: PartnersSectionProps) {
  const t = await getTranslations("Home");

  if (partners.length === 0) return null;

  return (
    <section className="bg-slate-50 py-12 md:py-16">
      <Container>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {t("partnersTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
            {t("partnersDescription")}
          </p>
        </div>
      </Container>
      <div className="mt-12">
        <PartnersMarquee partners={partners} />
      </div>
    </section>
  );
}
