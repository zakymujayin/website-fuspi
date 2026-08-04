"use client";

import {ArrowRightIcon} from "lucide-react";
import Image from "next/image";

import {Link} from "@/i18n/navigation";

export type PublicContentCardData = {
  id: string;
  resource: string;
  slug: string | null;
  title: string;
  summary: string | null;
  badge: string | null;
  startsAt: string | null;
  endsAt: string | null;
  media: {id: string; url: string; mimeType: string; size: number; alt: string; isDecorative: boolean; width: number | null; height: number | null} | null;
  link: {kind: "INTERNAL" | "EXTERNAL"; href: string} | null;
  translation: {requestedLocale: string; resolvedLocale: string; isFallback: boolean};
};

type PublicContentCardProps = {
  item: PublicContentCardData;
  detailHref: string;
  titleLabel: string;
  badgeLabel?: string;
  readMoreLabel: string;
  hasDetail: boolean;
};

export {PublicContentCardSkeleton} from "./public-content-card-skeleton";

export function PublicContentCard({
  item,
  detailHref,
  titleLabel,
  badgeLabel,
  readMoreLabel,
  hasDetail,
}: PublicContentCardProps) {
  const link = item.link;
  const targetHref = link ? link.href : detailHref;
  const isExternal = link?.kind === "EXTERNAL";

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {item.media ? (
        <div className="aspect-video overflow-hidden">
          <Image
            src={item.media.url}
            alt={item.media.isDecorative ? "" : item.media.alt}
            width={item.media.width ?? 640}
            height={item.media.height ?? 360}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-2 p-5">
        {badgeLabel && item.badge ? (
          <p className="text-xs font-medium uppercase tracking-wide text-royal-600">{item.badge}</p>
        ) : null}

        <h3 className="font-display text-base font-medium leading-snug text-slate-900 line-clamp-2">
          {hasDetail && !isExternal ? (
            <Link href={detailHref} aria-label={`${titleLabel}: ${item.title}`} className="hover:text-royal-600">
              {item.title}
            </Link>
          ) : isExternal ? (
            <a href={targetHref} target="_blank" rel="noopener noreferrer" className="hover:text-royal-600">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </h3>

        {item.summary ? (
          <p className="text-sm leading-relaxed text-slate-500 line-clamp-2">{item.summary}</p>
        ) : null}

        {item.startsAt ? (
          <p className="text-xs text-slate-400">
            {new Date(item.startsAt).toLocaleDateString("id-ID", {year: "numeric", month: "long", day: "numeric"})}
            {item.endsAt ? ` — ${new Date(item.endsAt).toLocaleDateString("id-ID", {year: "numeric", month: "long", day: "numeric"})}` : ""}
          </p>
        ) : null}

        <div className="mt-auto pt-2">
          {isExternal ? (
            <a
              href={targetHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-royal-600 hover:text-royal-700"
            >
              {readMoreLabel}
              <ArrowRightIcon aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </a>
          ) : hasDetail ? (
            <Link
              href={detailHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-royal-600 hover:text-royal-700"
            >
              {readMoreLabel}
              <ArrowRightIcon aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
