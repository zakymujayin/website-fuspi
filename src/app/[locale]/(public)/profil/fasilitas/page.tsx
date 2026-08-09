import type {Metadata} from "next";
import NextImage from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";
import {dummyFacilities} from "@/lib/data/dummy-facilities";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("facilities")};
}

export default async function FacilitiesPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("facilities")} description={t("facilitiesDesc")} />

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dummyFacilities.map((facility) => {
          const title = facility.title[locale] ?? facility.title.id;
          const description = facility.description[locale] ?? facility.description.id;
          return (
            <article
              key={facility.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <NextImage
                  src={facility.image}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  unoptimized
                />
              </div>
              <div className="p-5">
                <h2 className="font-display text-base font-semibold text-slate-900">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </Container>
  );
}
