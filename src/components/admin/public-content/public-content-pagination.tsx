"use client";

import {ChevronLeftIcon, ChevronRightIcon} from "lucide-react";

import {Link} from "@/i18n/navigation";

import {buildPaginationItems} from "./public-content-query";

type PublicContentPaginationProps = {
  current: number;
  totalPages: number;
  buildHref: (page: number) => string;
  ariaLabel: string;
  previousLabel: string;
  nextLabel: string;
  pageStatusLabel: string;
  goToPageLabel: (page: number) => string;
};

export function PublicContentPagination({
  current,
  totalPages,
  buildHref,
  ariaLabel,
  previousLabel,
  nextLabel,
  pageStatusLabel,
  goToPageLabel,
}: PublicContentPaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPaginationItems(current, totalPages);

  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center justify-center gap-1 pt-8">
      {current > 1 ? (
        <Link
          href={buildHref(current - 1)}
          aria-label={previousLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ChevronLeftIcon aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-300">
          <ChevronLeftIcon aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </span>
      )}

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="inline-flex h-9 w-9 items-center justify-center text-sm text-slate-400">
            …
          </span>
        ) : item === current ? (
          <span
            key={item}
            aria-current="page"
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-royal-500 px-1 text-sm font-medium text-white"
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-label={goToPageLabel(item)}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 px-1 text-sm text-slate-600 transition-colors hover:bg-slate-100"
          >
            {item}
          </Link>
        ),
      )}

      {current < totalPages ? (
        <Link
          href={buildHref(current + 1)}
          aria-label={nextLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ChevronRightIcon aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      ) : (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-300">
          <ChevronRightIcon aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </span>
      )}

      <span className="ms-4 text-sm text-slate-500">{pageStatusLabel}</span>
    </nav>
  );
}
