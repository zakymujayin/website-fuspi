"use client";

import {ArrowRight, ChevronLeft, ChevronRight, Pause, Play} from "lucide-react";
import {useTranslations} from "next-intl";
import {useCallback, useEffect, useState} from "react";

import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import type {PublicHomeSlide} from "@/features/home-nav/public-query";
import {Link} from "@/i18n/navigation";
import {cn} from "@/lib/utils";

const AUTOPLAY_MS = 8000;

function HeroLink({href, children, secondary = false}: {href: string; children: React.ReactNode; secondary?: boolean}) {
  const className = cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-md px-7 text-sm font-semibold transition-colors duration-200 motion-safe:active:scale-[0.98]",
    secondary
      ? "border border-white/55 bg-transparent text-white hover:border-white hover:bg-white/10"
      : "bg-white text-royal-700 hover:bg-royal-50",
  );
  const content = <>{children}<ArrowRight data-icon aria-hidden className="rtl:rotate-180" strokeWidth={1.5} /></>;
  return href.startsWith("http") ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
  ) : (
    <Link href={href} className={className}>{content}</Link>
  );
}

export function HeroSlider({slides}: {slides: readonly PublicHomeSlide[]}) {
  const t = useTranslations("Home");
  const [active, setActive] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [interactionPause, setInteractionPause] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const goNext = useCallback(() => setActive((index) => (index + 1) % slides.length), [slides.length]);
  const goPrev = useCallback(() => setActive((index) => (index - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (slides.length <= 1 || manualPause || interactionPause || reducedMotion) return;
    const timer = window.setInterval(goNext, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [goNext, interactionPause, manualPause, reducedMotion, slides.length]);

  useEffect(() => {
    const update = () => setInteractionPause(document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  if (slides.length === 0) return null;
  const slide = slides[active];
  const primaryHref = slide.cta?.href ?? "/profil";
  const primaryLabel = slide.ctaLabel ?? t("heroCtaPrimary");

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("heroRegion")}
      className="relative isolate min-h-[calc(100svh-7rem)] overflow-hidden bg-navy-950"
      onMouseEnter={() => setInteractionPause(true)}
      onMouseLeave={() => setInteractionPause(false)}
      onFocusCapture={() => setInteractionPause(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPause(false);
      }}
    >
      {slides.map((item, index) => (
        <div key={item.id} aria-hidden={index !== active} className={cn("absolute inset-0 transition-opacity duration-1000", index === active ? "opacity-100" : "opacity-0")}>
          <ImageWithFallback
            src={item.image?.url}
            alt={item.image?.isDecorative ? "" : (item.image?.alt ?? item.title)}
            priority={index === 0}
            loading={index === 0 ? undefined : "lazy"}
            sizes="100vw"
            className="object-cover saturate-[.85] contrast-[1.06]"
            focalPoint={toFocalPoint(item.image)}
          />
        </div>
      ))}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,42,.72)_0%,rgba(8,15,42,.52)_48%,rgba(8,15,42,.90)_100%)]" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(14,21,51,.18)_78%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-7rem)] max-w-[1280px] items-center justify-center px-5 py-24 sm:px-8 lg:px-10">
        <div className="w-full max-w-4xl text-center text-white">
          <p className="mx-auto mb-6 w-fit border-y border-white/25 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
            {t("heroEyebrow")}
          </p>
          <h1 key={`title-${slide.id}`} className="mx-auto max-w-4xl text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-[-0.015em] text-balance text-white motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-5 motion-safe:duration-700">
            {slide.title}
          </h1>
          {slide.subtitle ? (
            <p key={`subtitle-${slide.id}`} className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/85 md:text-lg md:leading-8">
              {slide.subtitle}
            </p>
          ) : null}
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <HeroLink href={primaryHref}>{primaryLabel}</HeroLink>
            <HeroLink href="/prodi" secondary>{t("heroCtaSecondary")}</HeroLink>
          </div>
          <p aria-live="polite" className="sr-only">{slide.title}</p>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-5 z-20 mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <p className="text-xs tabular-nums tracking-[0.18em] text-white/75">
            {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={goPrev} aria-label={t("heroSlidePrevious")} className="grid size-11 place-items-center rounded-md border border-white/35 text-white transition-colors hover:bg-white hover:text-navy-950 motion-safe:active:scale-[0.97]">
              <ChevronLeft aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.5} />
            </button>
            <button type="button" onClick={() => setManualPause((value) => !value)} aria-label={manualPause ? t("heroPlaySlideshow") : t("heroPauseSlideshow")} className="grid size-11 place-items-center rounded-md border border-white/35 text-white transition-colors hover:bg-white hover:text-navy-950 motion-safe:active:scale-[0.97]">
              {manualPause ? <Play aria-hidden className="size-4" strokeWidth={1.5} /> : <Pause aria-hidden className="size-4" strokeWidth={1.5} />}
            </button>
            <button type="button" onClick={goNext} aria-label={t("heroSlideNext")} className="grid size-11 place-items-center rounded-md border border-white/35 text-white transition-colors hover:bg-white hover:text-navy-950 motion-safe:active:scale-[0.97]">
              <ChevronRight aria-hidden className="size-5 rtl:rotate-180" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
