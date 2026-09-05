import {ArrowRight} from "lucide-react";

import {DeanAvatarPlate} from "@/components/public/dean-avatar-plate";
import {toFocalPoint} from "@/components/public/focal-point";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {Container} from "@/components/ui/container";
import type {PublicDean} from "@/features/home-nav/public-query";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";
import {Reveal} from "./reveal";

function initialsFrom(name: string) {
  const parts = name.replace(/^(Prof\.|Dr\.|H\.|Hj\.|M\.Ag\.|S\.Ag\.)\s*/gi, "").trim().split(/\s+/);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function DeanWelcomeSection({dean, title, ctaLabel}: {dean: PublicDean; title: string; ctaLabel: string}) {
  const passages = dean.message.trim().split(/(?<=[.!?؟])\s+/u);
  const quote = passages.length > 1 ? passages[passages.length - 1] : dean.message;
  const introduction = passages.length > 1 ? passages.slice(0, -1).join(" ") : null;
  return (
    <section className={`${styles.section} ${styles.dean}`}>
      <Container>
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
          <Reveal variant="image" className="mx-auto w-full max-w-sm lg:col-span-4">
          <div className={`${styles.deanPortrait} w-full`}>
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-200">
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
          </div>
          </Reveal>

          <div className="lg:col-span-8">
            <Reveal index={1} className="!block">
            <h2 className="font-bold text-slate-900">{title}</h2>
            {introduction ? <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">{introduction}</p> : null}
            <blockquote className="mt-5 border-s-2 border-royal-500 ps-5">
              <p className="max-w-3xl font-serif-display text-[clamp(1.375rem,2vw,1.75rem)] leading-[1.5] text-slate-900">
                “{quote}”
              </p>
            </blockquote>
            </Reveal>
            <Reveal index={2} className="!block">
            <div className="mt-6">
              <p className="text-lg font-bold text-slate-900 md:text-xl">{dean.name}</p>
              <p className="mt-1 text-sm text-slate-600">{dean.position}</p>
            </div>
            </Reveal>
            <Reveal index={3}>
            <Link href="/profil/pimpinan" className="mt-4 inline-flex min-h-11 items-center gap-2 border-b border-royal-500 text-sm font-semibold text-royal-700 transition-colors hover:text-royal-500">
              {ctaLabel}
              <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
