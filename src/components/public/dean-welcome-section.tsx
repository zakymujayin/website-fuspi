import { ArrowRight } from "lucide-react";

import { Container } from "@/components/ui/container";
import { DeanAvatarPlate } from "@/components/public/dean-avatar-plate";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
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
    <section className="bg-gradient-to-b from-royal-50 to-white py-12 md:py-16">
      <Container>
        {/* One unified card, not a separate frame floating behind the photo —
            the common "leadership message" pattern on university sites. */}
        <div className="grid overflow-hidden rounded-2xl bg-white shadow-lg lg:grid-cols-5">
          <div className="relative min-h-64 lg:col-span-2 lg:min-h-full">
            {dean.photo ? (
              <ImageWithFallback
                src={dean.photo?.url}
                alt={dean.photo?.isDecorative ? "" : (dean.photo?.alt ?? dean.name)}
                className="object-cover"
                sizes="(min-width: 1024px) 30vw, 100vw"
              />
            ) : (
              <div className="absolute inset-0">
                <DeanAvatarPlate initials={initialsFrom(dean.name)} name={dean.name} />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center p-8 lg:col-span-3 lg:p-12">
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{title}</span>
            <blockquote className="mt-2">
              <span aria-hidden className="font-display text-6xl leading-none text-royal-200">&ldquo;</span>
              <p className="-mt-4 max-w-[58ch] text-sm leading-relaxed text-slate-700 md:text-base md:leading-[1.75]">
                {dean.message}
              </p>
            </blockquote>
            <div className="mt-6 flex items-center gap-3 border-s-4 border-brass-500 ps-4">
              <div>
                <p className="font-display text-lg font-semibold text-slate-900">{dean.name}</p>
                <p className="mt-0.5 text-sm text-slate-500">{dean.position}</p>
              </div>
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
