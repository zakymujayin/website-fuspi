import { getTranslations } from "next-intl/server";
import type { z } from "zod";

import { Container } from "@/components/ui/container";
import { PartnersWall } from "@/components/public/partners-wall";
import type { PublicContentCardSchema } from "@/contracts/public-content";

type PartnerCard = z.infer<typeof PublicContentCardSchema>;

type PartnersSectionProps = { partners: readonly PartnerCard[] };

export async function PartnersSection({ partners }: PartnersSectionProps) {
  const t = await getTranslations("Home");

  if (partners.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-b from-white to-royal-50/50 py-16 md:py-20">
      <Container>
        <div className="text-center">
          <h2 className="section-rule font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl [&::after]:mx-auto">
            {t("partnersTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
            {t("partnersDescription")}
          </p>
        </div>
        <div className="mt-12">
          <PartnersWall partners={partners} />
        </div>
      </Container>
    </section>
  );
}
