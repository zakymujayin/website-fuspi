"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { toFocalPoint } from "@/components/public/focal-point";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PublicHomeSlide } from "@/features/home-nav/public-query";

const AUTOPLAY_MS = 6000;

type HeroSliderProps = {
  slides: readonly PublicHomeSlide[];
};

export function HeroSlider({ slides }: HeroSliderProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goNext = useCallback(() => {
    setActive((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setActive((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = setInterval(goNext, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [slides.length, paused, goNext]);

  if (slides.length === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Hero"
      className="relative min-h-[560px] overflow-hidden md:min-h-[660px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Full-bleed photo, kept sharp: only graded (saturation, contrast,
          brightness) so the set reads as one tone. These formal group
          photos put faces low-mid in the frame with empty ceiling above
          (see slide 1) — text is anchored at the optical center, biased
          above the geometric center, so the title stays clear of faces. */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== active}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            index === active ? "opacity-100" : "opacity-0",
          )}
        >
          <ImageWithFallback
            src={slide.image?.url}
            alt={slide.image?.isDecorative ? "" : (slide.image?.alt ?? slide.title)}
            priority={index === 0}
            className="scale-105 object-cover object-top saturate-[.8] contrast-[1.1] brightness-[.92]"
            sizes="100vw"
            focalPoint={toFocalPoint(slide.image)}
          />
          {/* Color grade: multiplies the brand royal blue over the photo so
              the raw clashing colors (fluorescent ceiling, mismatched
              decor) read as one deliberate tone instead of a flat
              snapshot. */}
          <div
            aria-hidden
            className="absolute inset-0 mix-blend-multiply"
            style={{ backgroundColor: "rgba(24,32,66,0.38)" }}
          />
          {/* Gradient follows the text: dark across the upper half where
              the title/subtitle sit at the optical center, fully clear by
              ~70% so the faces low-mid in the frame keep their presence.
              A light bottom tint keeps the wave/dots readable without
              darkening the people again. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, rgba(24,32,66,0.82) 0%, rgba(24,32,66,0.6) 22%, rgba(24,32,66,0.38) 42%, rgba(24,32,66,0.15) 56%, rgba(24,32,66,0) 70%, rgba(24,32,66,0) 82%, rgba(24,32,66,0.35) 100%)",
            }}
          />
        </div>
      ))}

      {/* Signature seam: a full-width wave, not a single corner cut — reads
          as deliberate at any hero width. The welcome section's background
          matches this same fill color, so the curve lands cleanly with room
          to breathe below it. No accent line on the crest: a soft shadow
          under the curve reads as a floating layer instead, cleaner than a
          hard stroke. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 w-full text-background drop-shadow-[0_-6px_16px_rgba(15,23,42,0.12)] md:h-24"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <path d="M0,60 C480,120 960,0 1440,60 L1440,120 L0,120 Z" fill="currentColor" />
      </svg>

      {/* Anchored at the optical center: the stack is vertically centered,
          then biased up by bottom padding that clears the wave and dots.
          The block lands centered around ~40% of the frame — lower than a
          top anchor, but the title still stays off the faces low-mid in
          the photos. Centering also self-adapts to 1- vs 3-line titles
          and per-locale copy length. */}
      <div className="relative z-10 flex min-h-[560px] flex-col justify-center ps-6 pe-6 pb-24 sm:ps-10 md:min-h-[660px] md:pb-36 md:ps-16 lg:ps-20">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "max-w-xl transition-all duration-700 ease-out md:max-w-2xl",
              index === active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
            aria-hidden={index !== active}
          >
            {index === active ? (
              <>
                <h1 className="font-display text-4xl font-extrabold tracking-tight text-white text-balance motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-6 motion-safe:blur-in-8 motion-safe:duration-700 motion-safe:ease-out motion-safe:fill-mode-both md:text-5xl md:leading-[1.1] lg:text-6xl">
                  {slide.title}
                </h1>
                {slide.subtitle ? (
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-150 motion-safe:ease-out motion-safe:fill-mode-both md:text-lg">
                    {slide.subtitle}
                  </p>
                ) : null}
                {slide.cta && slide.ctaLabel ? (
                  <div className="mt-8 flex flex-wrap gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-300 motion-safe:ease-out motion-safe:fill-mode-both">
                    <CTA href={slide.cta.href}>{slide.ctaLabel}</CTA>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          {/* Chevron zone: mid-height on desktop where the text block keeps
              its left inset; bottom-anchored on mobile, where a vertically
              centered chevron would land on the subtitle or CTA. */}
          <button
            type="button"
            onClick={goPrev}
            aria-label="Slide sebelumnya"
            className="absolute start-0 bottom-24 z-20 ms-4 grid size-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:inset-y-0 md:my-auto"
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Slide berikutnya"
            className="absolute end-0 bottom-24 z-20 me-4 grid size-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_16px_rgba(0,0,0,0.15)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:inset-y-0 md:my-auto"
          >
            <ChevronRight aria-hidden className="size-5" strokeWidth={1.5} />
          </button>

          {/* Cleared above the wave divider (h-14/h-20) with margin, so the
              dots never sit on top of the curve. */}
          <div className="absolute bottom-20 start-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-28" role="tablist">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`Pindah ke slide ${index + 1}`}
                onClick={() => setActive(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                  index === active ? "w-8 bg-brass-400" : "w-1.5 bg-white/40 hover:bg-white/60",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function CTA({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith("http");
  const className =
    "group/cta relative isolate inline-flex h-11 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-r from-brass-500 to-brass-400 px-5 text-sm font-semibold text-navy-900 transition-all duration-200 hover:from-brass-400 hover:to-brass-400 hover:shadow-[0_10px_28px_-10px_var(--brass-500)] active:scale-[0.98]";

  // Sheen sweeps once on hover for feedback, not on a loop; hidden entirely
  // under reduced motion instead of jumping straight to the end state.
  const content = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover/cta:translate-x-full"
        style={{
          backgroundImage:
            "linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 55%) 50%, transparent 70%)",
        }}
      />
      <span className="relative">{children}</span>
    </>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
