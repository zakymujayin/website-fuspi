import {ArrowRight} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Container} from "@/components/ui/container";
import type {PublicHomeFacility} from "@/features/facility/domain";
import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

export async function FacilitiesSection({items}: {items: readonly PublicHomeFacility[]}) {
  const t = await getTranslations("Home");
  const visible = items.slice(0, 5);
  if (visible.length === 0) return null;
  const bento = visible.length === 5;

  return (
    <section className="bg-slate-50 py-16 md:py-24">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-600">{t("facilitiesEyebrow")}</p>
            <h2 className="mt-3 text-[28px] font-bold tracking-[-0.01em] text-slate-900 md:text-[34px]">{t("facilitiesTitle")}</h2>
          </div>
          <Link href="/profil/fasilitas" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-royal-700 hover:text-royal-500">
            {t("viewAll")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>
        <div className={cn("grid grid-flow-dense overflow-hidden rounded-md bg-slate-300", bento ? "grid-cols-2 grid-rows-4 gap-px md:grid-cols-4 md:grid-rows-2" : "gap-px sm:grid-cols-2 lg:grid-cols-4")}>
          {visible.map((facility, index) => (
            <article key={facility.id} className={cn("group relative min-h-64 overflow-hidden bg-slate-200", bento && index === 0 ? "col-span-2 row-span-2 min-h-[32rem] md:min-h-[38rem]" : bento ? "min-h-64 md:min-h-0" : "aspect-[4/3]")}>
              <ImageWithFallback
                src={facility.image?.url}
                alt={facility.image?.isDecorative ? "" : (facility.image?.alt ?? facility.caption)}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                sizes={index === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                focalPoint={toFocalPoint(facility.image)}
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-transparent to-transparent" />
              <h3 className={cn("absolute inset-x-0 bottom-0 p-5 font-bold text-white", index === 0 ? "text-2xl md:p-8 md:text-3xl" : "text-lg")}>{facility.caption}</h3>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
