"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import NextImage from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Container } from "@/components/ui/container";
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
      className="relative min-h-[520px] overflow-hidden md:min-h-[620px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== active}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            index === active ? "opacity-100" : "opacity-0",
          )}
        >
          <NextImage
            src={slide.image.url}
            alt={slide.image.isDecorative ? "" : slide.image.alt}
            fill
            priority={index === 0}
            className="object-cover"
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/80 via-navy-900/50 to-navy-900/30" />
        </div>
      ))}

      <Container className="relative z-10 flex h-full min-h-[520px] flex-col justify-center py-16 md:min-h-[620px] md:py-24">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "max-w-3xl transition-all duration-700 ease-out",
              index === active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
            aria-hidden={index !== active}
          >
            {index === active ? (
              <>
                <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl md:leading-tight">
                  {slide.title}
                </h1>
                {slide.subtitle ? (
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-200 md:text-lg">
                    {slide.subtitle}
                  </p>
                ) : null}
                {slide.cta && slide.ctaLabel ? (
                  <div className="mt-8 flex flex-wrap gap-3">
                    <CTA href={slide.cta.href}>{slide.ctaLabel}</CTA>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </Container>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Slide sebelumnya"
            className="absolute inset-y-0 start-0 z-20 my-auto ms-4 grid size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Slide berikutnya"
            className="absolute inset-y-0 end-0 z-20 my-auto me-4 grid size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ChevronRight aria-hidden className="size-5" strokeWidth={1.5} />
          </button>

          <div className="absolute bottom-6 start-1/2 z-20 flex -translate-x-1/2 gap-2" role="tablist">
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
                  index === active ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60",
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
  const className = "inline-flex h-11 items-center justify-center rounded-lg bg-royal-500 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-royal-600 active:scale-[0.98]";

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
