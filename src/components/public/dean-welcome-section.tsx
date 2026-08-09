import { ArrowRight } from "lucide-react";
import NextImage from "next/image";

import { Container } from "@/components/ui/container";
import { DeanAvatarPlate } from "@/components/public/dean-avatar-plate";
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
    <section className="bg-white py-12 md:py-16">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="mx-auto max-w-xs">
              {dean.photo ? (
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
                  <NextImage
                    src={dean.photo.url}
                    alt={dean.photo.isDecorative ? "" : dean.photo.alt}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <DeanAvatarPlate initials={initialsFrom(dean.name)} name={dean.name} />
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{title}</span>
            <blockquote className="mt-4 border-s-4 border-royal-200 ps-6">
              <p className="max-w-[58ch] text-sm leading-relaxed text-slate-600 md:text-base md:leading-[1.75]">
                {dean.message}
              </p>
            </blockquote>
            <div className="mt-6 ps-6">
              <p className="font-display text-lg font-semibold text-slate-900">{dean.name}</p>
              <p className="mt-0.5 text-sm text-slate-500">{dean.position}</p>
            </div>
            <div className="mt-6 ps-6">
              <Link
                href="/profil/pimpinan"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-royal-200 hover:bg-royal-50 hover:text-royal-700 active:scale-[0.98]"
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
