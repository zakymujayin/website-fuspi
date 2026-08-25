import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { Reveal } from "@/components/public/reveal";
import { Link } from "@/i18n/navigation";
import type { PublicHomeFacility } from "@/features/facility/domain";

type FacilitiesSectionProps = { items: readonly PublicHomeFacility[] };

export async function FacilitiesSection({ items }: FacilitiesSectionProps) {
  const t = await getTranslations("Home");

  if (items.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-br from-slate-50 to-royal-50/40 py-10 md:py-14">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((facility, index) => (
            <Reveal key={facility.id} index={index}>
              <article className="group flex w-full flex-1 flex-col overflow-hidden rounded-xl shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <ImageWithFallback
                    src={facility.image?.url}
                    alt={facility.image?.isDecorative ? "" : (facility.image?.alt ?? facility.caption)}
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
                {/* Plaque-style caption: a solid color bar, not a white panel —
                    keeps color present down to the smallest card. */}
                <div className="bg-gradient-to-r from-navy-900 to-navy-950 px-4 py-3">
                  <h3 className="font-display text-sm font-semibold text-white">{facility.caption}</h3>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
