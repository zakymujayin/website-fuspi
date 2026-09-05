import {ArrowRight} from "lucide-react";

import {DeanAvatarPlate} from "@/components/public/dean-avatar-plate";
import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Container} from "@/components/ui/container";
import type {PublicDean} from "@/features/home-nav/public-query";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";

function initialsFrom(name: string) {
  const parts = name.replace(/^(Prof\.|Dr\.|H\.|Hj\.|M\.Ag\.|S\.Ag\.)\s*/gi, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function DeanWelcomeSection({dean, title, ctaLabel}: {dean: PublicDean; title: string; ctaLabel: string}) {
  return (
    <section className={`${styles.section} bg-slate-50`}>
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-md bg-slate-200 lg:col-span-4">
            {dean.photo ? (
              <ImageWithFallback
                src={dean.photo.url}
                alt={dean.photo.isDecorative ? "" : (dean.photo.alt ?? dean.name)}
                className="object-cover"
                sizes="(min-width: 1024px) 38vw, 100vw"
                focalPoint={toFocalPoint(dean.photo)}
              />
            ) : (
              <DeanAvatarPlate initials={initialsFrom(dean.name)} name={dean.name} />
            )}
            <span aria-hidden className="absolute inset-y-0 start-0 w-1.5 bg-royal-500" />
          </div>

          <div className="lg:col-span-8">
            <h2 className="font-bold text-slate-900">{title}</h2>
            <blockquote className="mt-5">
              <p className="max-w-3xl font-serif-display text-[clamp(1.375rem,2vw,1.75rem)] leading-[1.5] text-slate-900">
                “{dean.message}”
              </p>
            </blockquote>
            <div className="mt-8 border-s-2 border-royal-500 ps-5">
              <p className="text-lg font-bold text-slate-900 md:text-xl">{dean.name}</p>
              <p className="mt-1 text-sm text-slate-600">{dean.position}</p>
            </div>
            <Link href="/profil/pimpinan" className="mt-8 inline-flex min-h-11 items-center gap-2 border-b border-royal-500 text-sm font-semibold text-royal-700 transition-colors hover:text-royal-500">
              {ctaLabel}
              <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
