import { ArrowRight } from "lucide-react";
import NextImage from "next/image";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { dummyFacilities } from "@/lib/data/dummy-facilities";

export async function FacilitiesSection({locale}: {locale: AppLocale}) {
  const t = await getTranslations("Home");

  return (
    <section className="bg-slate-50 py-16 md:py-24">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">
              {t("facilitiesEyebrow")}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {t("facilitiesTitle")}
            </h2>
          </div>
          <Link
            href="/profil/fasilitas"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700"
          >
            {t("viewAll")}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dummyFacilities.map((facility) => {
            const title = facility.title[locale] ?? facility.title.id;
            const description = facility.description[locale] ?? facility.description.id;
            return (
              <article
                key={facility.id}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <NextImage
                    src={facility.image}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    unoptimized
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-display text-sm font-semibold text-slate-900">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
