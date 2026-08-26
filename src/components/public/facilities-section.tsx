import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { toFocalPoint } from "@/components/public/focal-point";
import { Reveal } from "@/components/public/reveal";
import { Link } from "@/i18n/navigation";
import type { PublicHomeFacility } from "@/features/facility/domain";
import { cn } from "@/lib/utils";

type FacilitiesSectionProps = { items: readonly PublicHomeFacility[] };

/* Cycling aspect ratios, not one size repeated: an organic gallery-wall
 * rhythm without making any single tile "the big one" - the variation is
 * per-position, not per-importance. */
const ASPECT = ["aspect-[3/4]", "aspect-[4/3]", "aspect-square", "aspect-[4/3]"] as const;

export async function FacilitiesSection({ items }: FacilitiesSectionProps) {
  const t = await getTranslations("Home");

  if (items.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-br from-royal-50 to-royal-100/50 py-10 md:py-14">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="section-rule font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
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

        {/* Gapless gallery wall, not spaced-out equal cards: rounded corners
            live on the outer frame only, tiles butt against each other like
            a real photo wall, and aspect ratios cycle for rhythm instead of
            every tile being an identical 4:3 box. */}
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-2xl lg:grid-cols-4">
          {items.map((facility, index) => (
            <Reveal key={facility.id} index={index}>
              <article className={cn("group relative flex w-full flex-1 overflow-hidden", ASPECT[index % ASPECT.length])}>
                <ImageWithFallback
                  src={facility.image?.url}
                  alt={facility.image?.isDecorative ? "" : (facility.image?.alt ?? facility.caption)}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  focalPoint={toFocalPoint(facility.image)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/10 to-transparent" />
                <h3 className="absolute inset-x-0 bottom-0 px-4 py-3 font-display text-sm font-semibold text-white">
                  {facility.caption}
                </h3>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
