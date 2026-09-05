"use client";

import {ArrowLeft, ArrowRight, Pause, Play} from "lucide-react";
import {useTranslations} from "next-intl";
import {useEffect, useRef, useState} from "react";

import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Container} from "@/components/ui/container";
import type {PublicContentDetail} from "@/contracts/public-content";
import {HomeSectionHeading} from "./home-section-heading";
import styles from "./home-design.module.css";

type Testimonial = Extract<PublicContentDetail, {resource: "TESTIMONIAL"}>;

export function TestimonialsSection({items}: {items: readonly Testimonial[]}) {
  const t = useTranslations("Home");
  const [active, setActive] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const regionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(preference.matches);
    const syncVisibility = () => setPageHidden(document.hidden);
    syncMotion();
    syncVisibility();
    preference.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    const observer = window.IntersectionObserver ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {threshold: .2}) : null;
    if (regionRef.current) observer?.observe(regionRef.current);
    return () => {
      observer?.disconnect();
      preference.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);
  const playing = items.length > 1 && !manualPause && !hovered && !focused && !reducedMotion && visible && !pageHidden;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % items.length), 7000);
    return () => window.clearInterval(timer);
  }, [playing, items.length]);
  if (items.length === 0) return null;
  const current = active % items.length;
  const item = items[current];
  const select = (index: number) => {setActive(index); setManualPause(true);};
  const previous = () => select((current - 1 + items.length) % items.length);
  const next = () => select((current + 1) % items.length);

  return (
    <section ref={regionRef} className={`${styles.section} ${styles.alumni}`} aria-labelledby="testimonials-title" data-autoplay={playing ? "playing" : "paused"}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => {if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);}}>
      <Container>
        <HomeSectionHeading
          id="testimonials-title"
          title={t("testimonialsTitle")}
          description={t("testimonialsDescription")}
        />
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="grid grid-cols-2 lg:col-span-4 lg:block" aria-label={t("testimonialsEyebrow")}>
            {items.map((alumnus, index) => (
              <button key={alumnus.id} type="button" aria-pressed={current === index} aria-controls="alumni-story" onClick={() => select(index)} className={styles.alumniChoice}>
                <span className="hidden text-lg font-semibold leading-snug text-slate-900 lg:block">{alumnus.translation.currentRole || alumnus.name}</span>
                <span className="block text-base font-medium leading-6 text-slate-700 lg:mt-2 lg:text-sm lg:font-normal">{[alumnus.name, alumnus.graduationYear].filter(Boolean).join(" · ")}</span>
              </button>
            ))}
          </div>
          <div id="alumni-story" className="flex flex-col justify-between rounded-md bg-navy-950 p-6 text-white sm:p-8 lg:col-span-8 lg:p-10">
            <div className="grid">
            {items.map((story, index) => (
            <blockquote key={story.id} aria-hidden={index !== current} className={styles.alumniStory} lang={story.translation.resolvedLocale} dir={story.translation.resolvedLocale === "ar" ? "rtl" : "ltr"}>
              <div className="flex items-center gap-5 border-b border-slate-600 pb-5">
                {story.photo ? (
                  <span className="relative h-32 w-28 shrink-0 overflow-hidden rounded-sm border border-slate-400 bg-navy-800">
                    <ImageWithFallback src={story.photo.url} alt={story.photo.isDecorative ? "" : (story.photo.alt ?? story.name)} className="object-cover" sizes="112px" />
                  </span>
                ) : null}
                <cite className="not-italic">
                  <span className="block text-xl font-bold text-white">{story.name}</span>
                  {(story.translation.currentRole || story.graduationYear) ? <span className="mt-2 block text-sm leading-6 text-slate-200">{[story.translation.currentRole, story.graduationYear].filter(Boolean).join(" · ")}</span> : null}
                </cite>
              </div>
              <div className="mt-6 max-w-3xl font-serif-display text-[clamp(1.375rem,2vw,1.75rem)] leading-[1.5] text-white [&_p]:inline" dangerouslySetInnerHTML={{__html: story.translation.quote}} />
            </blockquote>
            ))}
            </div>
            {items.length > 1 ? (
              <div className="mt-8 flex items-center justify-between gap-4">
                <p role="status" aria-live={playing ? "off" : "polite"} className="text-sm tabular-nums text-slate-200">{String(current + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}<span className="sr-only"> — {item.name}</span></p>
                <div className="flex gap-2">
                  <button type="button" onClick={previous} aria-label={t("previousTestimonial")} className="grid size-11 place-items-center rounded-md border border-slate-400 text-white transition-colors hover:bg-navy-800"><ArrowLeft aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.5} /></button>
                  <button type="button" onClick={() => setManualPause(value => !value)} disabled={reducedMotion} aria-label={manualPause || reducedMotion ? t("heroPlaySlideshow") : t("heroPauseSlideshow")} className="grid size-11 place-items-center rounded-md border border-slate-400 text-white transition-colors hover:bg-navy-800 disabled:cursor-default">
                    {manualPause || reducedMotion ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
                  </button>
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
