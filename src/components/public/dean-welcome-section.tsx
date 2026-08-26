import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { DeanAvatarPlate } from "@/components/public/dean-avatar-plate";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { toFocalPoint } from "@/components/public/focal-point";
import { Link } from "@/i18n/navigation";
import type { PublicDean } from "@/features/home-nav/public-query";

function initialsFrom(name: string) {
  const parts = name.replace(/^(Prof\.|Dr\.|H\.|Hj\.|M\.Ag\.|S\.Ag\.)\s*/gi, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

type DeanWelcomeSectionProps = {
  dean: PublicDean;
  title: string;
  ctaLabel: string;
};

export function DeanWelcomeSection({ dean, title, ctaLabel }: DeanWelcomeSectionProps) {
  return (
    // bg matches the hero wave's fill (--background) at both edges so the
    // seam disappears instead of jumping between mismatched near-whites;
    // the royal tint only swells mid-section, never right at the join.
    <section className="relative bg-gradient-to-b from-background via-royal-100/60 to-background py-12 md:py-20">
      <Container>
        {/* Full-bleed portrait, not a boxed card: photo and text panel sit
            flush edge to edge with no radius/shadow shell, so the section
            reads as one editorial spread rather than a floating dashboard
            card. */}
        <div className="grid motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-6 motion-safe:duration-700 motion-safe:ease-out motion-safe:fill-mode-both lg:grid-cols-5 lg:items-stretch">
          <div className="relative min-h-80 lg:col-span-2 lg:min-h-full">
            {dean.photo ? (
              <ImageWithFallback
                src={dean.photo?.url}
                alt={dean.photo?.isDecorative ? "" : (dean.photo?.alt ?? dean.name)}
                className="object-cover"
                sizes="(min-width: 1024px) 30vw, 100vw"
                focalPoint={toFocalPoint(dean.photo)}
              />
            ) : (
              <div className="absolute inset-0">
                <DeanAvatarPlate initials={initialsFrom(dean.name)} name={dean.name} />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center bg-white p-8 lg:col-span-3 lg:p-14">
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{title}</span>
            <blockquote className="mt-3">
              <span aria-hidden className="font-display text-7xl leading-none text-brass-400 md:text-8xl">&ldquo;</span>
              <p className="-mt-6 max-w-[60ch] text-base leading-relaxed text-slate-700 md:-mt-8 md:text-lg md:leading-[1.8]">
                {dean.message}
              </p>
            </blockquote>
            <div className="mt-8">
              <span aria-hidden className="mb-3 block h-0.5 w-10 bg-brass-500" />
              <p className="font-display text-xl font-bold tracking-tight text-slate-900">{dean.name}</p>
              <p className="mt-1 text-sm text-slate-500">{dean.position}</p>
            </div>
            <div className="mt-6">
              <Link
                href="/profil/pimpinan"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-royal-500 to-royal-600 px-5 text-sm font-medium text-white transition-all duration-200 hover:from-royal-600 hover:to-royal-700 active:scale-[0.98]"
              >
                {ctaLabel}
                <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
