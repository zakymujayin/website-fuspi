"use client";

import {ArrowLeft, ArrowRight} from "lucide-react";
import {useTranslations} from "next-intl";
import {useState} from "react";

import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Container} from "@/components/ui/container";
import type {PublicContentDetail} from "@/contracts/public-content";
import styles from "./home-design.module.css";

type Testimonial = Extract<PublicContentDetail, {resource: "TESTIMONIAL"}>;

export function TestimonialsSection({items}: {items: readonly Testimonial[]}) {
  const t = useTranslations("Home");
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;
  const item = items[active];
  const previous = () => setActive((index) => (index - 1 + items.length) % items.length);
  const next = () => setActive((index) => (index + 1) % items.length);

  return (
    <section className={`${styles.section} ${styles.alumni}`} aria-labelledby="testimonials-title">
      <Container>
        <div className="mb-8 grid gap-5 lg:grid-cols-2 lg:items-end">
            <h2 id="testimonials-title" className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-slate-900 md:text-[34px]">{t("testimonialsTitle")}</h2>
            <p className="max-w-xl text-lg leading-7 text-slate-700">{t("testimonialsDescription")}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="grid grid-cols-2 lg:col-span-4 lg:block" aria-label={t("testimonialsEyebrow")}>
            {items.map((alumnus, index) => (
              <button key={alumnus.id} type="button" aria-pressed={active === index} aria-controls="alumni-story" onClick={() => setActive(index)} className={styles.alumniChoice}>
                <span className="hidden text-lg font-semibold leading-snug text-slate-900 lg:block">{alumnus.translation.currentRole || alumnus.name}</span>
                <span className="block text-base font-medium leading-6 text-slate-700 lg:mt-2 lg:text-sm lg:font-normal">{[alumnus.name, alumnus.graduationYear].filter(Boolean).join(" · ")}</span>
              </button>
            ))}
          </div>
          <div id="alumni-story" className="flex flex-col justify-between rounded-md bg-navy-950 p-6 text-white sm:p-8 lg:col-span-8 lg:p-10">
            <blockquote key={item.id} lang={item.translation.resolvedLocale} dir={item.translation.resolvedLocale === "ar" ? "rtl" : "ltr"}>
              <div className="flex items-center gap-5 border-b border-slate-600 pb-5">
                {item.photo ? (
                  <span className="relative h-28 w-24 shrink-0 overflow-hidden rounded-sm bg-navy-800">
                    <ImageWithFallback src={item.photo.url} alt={item.photo.isDecorative ? "" : (item.photo.alt ?? item.name)} className="object-cover" sizes="96px" />
                  </span>
                ) : null}
                <cite className="not-italic">
                  <span className="block text-xl font-bold text-white">{item.name}</span>
                  {(item.translation.currentRole || item.graduationYear) ? <span className="mt-2 block text-sm leading-6 text-slate-200">{[item.translation.currentRole, item.graduationYear].filter(Boolean).join(" · ")}</span> : null}
                </cite>
              </div>
              <div className="mt-6 max-w-3xl font-serif-display text-[clamp(1.375rem,2vw,1.75rem)] leading-[1.5] text-white [&_p]:inline" dangerouslySetInnerHTML={{__html: item.translation.quote}} />
            </blockquote>
            {items.length > 1 ? (
              <div className="mt-8 flex items-center justify-between gap-4">
                <p role="status" aria-live="polite" className="text-sm tabular-nums text-slate-200">{String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}<span className="sr-only"> — {item.name}</span></p>
                <div className="flex gap-2">
                  <button type="button" onClick={previous} aria-label={t("previousTestimonial")} className="grid size-11 place-items-center rounded-md border border-slate-400 text-white transition-colors hover:bg-navy-800"><ArrowLeft aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.5} /></button>
                  <button type="button" onClick={next} aria-label={t("nextTestimonial")} className="grid size-11 place-items-center rounded-md border border-slate-400 text-white transition-colors hover:bg-navy-800"><ArrowRight aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.5} /></button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
