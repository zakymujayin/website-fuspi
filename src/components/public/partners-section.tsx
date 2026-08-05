import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { dummyPartners } from "@/lib/data/dummy-partners";

export async function PartnersSection() {
  const t = await getTranslations("Home");

  return (
    <section className="bg-white py-14 md:py-20">
      <Container>
        <div className="text-center">
          <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
            {t("partnersTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
            {t("partnersDescription")}
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {dummyPartners.map((partner) => (
            <a
              key={partner.id}
              href={partner.website}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-20 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all duration-200 hover:border-royal-200 hover:bg-white hover:shadow-sm"
            >
              <span className="text-center text-xs font-medium text-slate-400 transition-colors group-hover:text-royal-700">
                {partner.name}
              </span>
            </a>
          ))}
        </div>
      </Container>
    </section>
  );
}
