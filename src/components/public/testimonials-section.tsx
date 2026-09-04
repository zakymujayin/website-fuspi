"use client";

import {ArrowLeft, ArrowRight} from "lucide-react";
import {useTranslations} from "next-intl";
import {useState} from "react";

import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Container} from "@/components/ui/container";
import type {PublicContentDetail} from "@/contracts/public-content";

type Testimonial = Extract<PublicContentDetail, {resource: "TESTIMONIAL"}>;

export function TestimonialsSection({items}: {items: readonly Testimonial[]}) {
  const t = useTranslations("Home");
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;
  const item = items[active];
  const previous = () => setActive((index) => (index - 1 + items.length) % items.length);
  const next = () => setActive((index) => (index + 1) % items.length);

  return (
    <section className="bg-white py-16 md:py-24" aria-labelledby="testimonials-title">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 id="testimonials-title" className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-slate-900 md:text-[34px]">{t("testimonialsTitle")}</h2>
            <p className="mt-4 max-w-sm text-base leading-7 text-slate-600">{t("testimonialsDescription")}</p>
          </div>
          <div className="lg:col-span-8">
            <blockquote key={item.id} lang={item.translation.resolvedLocale} dir={item.translation.resolvedLocale === "ar" ? "rtl" : "ltr"} className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
              <div className="max-w-4xl font-serif-display text-[clamp(1.5rem,3vw,2.25rem)] leading-[1.35] text-slate-900 [&_p]:inline" dangerouslySetInnerHTML={{__html: item.translation.quote}} />
              <footer className="mt-8 flex items-center gap-4 border-t border-slate-300 pt-5">
                {item.photo ? (
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-slate-200">
                    <ImageWithFallback src={item.photo.url} alt={item.photo.isDecorative ? "" : (item.photo.alt ?? item.name)} className="object-cover" sizes="56px" />
                  </span>
                ) : null}
                <cite className="not-italic">
                  <span className="block font-bold text-slate-900">{item.name}</span>
                  {(item.translation.currentRole || item.graduationYear) ? <span className="mt-1 block text-xs text-slate-500">{[item.translation.currentRole, item.graduationYear].filter(Boolean).join(" · ")}</span> : null}
                </cite>
              </footer>
            </blockquote>
            {items.length > 1 ? (
              <div className="mt-8 flex items-center justify-between gap-4">
                <p role="status" aria-live="polite" className="text-xs tabular-nums tracking-[0.14em] text-slate-500">{String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={previous} aria-label={t("previousTestimonial")} className="grid size-11 place-items-center rounded-md border border-slate-300 text-slate-700 transition-colors hover:border-royal-500 hover:bg-royal-500 hover:text-white motion-safe:active:scale-[0.97]"><ArrowLeft aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.5} /></button>
                  <button type="button" onClick={next} aria-label={t("nextTestimonial")} className="grid size-11 place-items-center rounded-md border border-slate-300 text-slate-700 transition-colors hover:border-royal-500 hover:bg-royal-500 hover:text-white motion-safe:active:scale-[0.97]"><ArrowRight aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.5} /></button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
