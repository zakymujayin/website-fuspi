import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Fragment } from "react";

import { Link } from "@/i18n/navigation";

import { buildAdminPostHref, buildPaginationItems, type AdminPostStatusFilter } from "./post-query";

type AdminPostPaginationProps = {
  current: number;
  totalPages: number;
  status: AdminPostStatusFilter;
  ariaLabel: string;
  previousLabel: string;
  nextLabel: string;
  pageStatusLabel: string;
  goToPageLabel: (page: number) => string;
  /** Defaults to `/admin/posts`; the Kolom list passes `/admin/kolom`. */
  basePath?: string;
};

/** Windowed pagination control, preserving the active filter and locale in every link. */
export function AdminPostPagination({
  current,
  totalPages,
  status,
  ariaLabel,
  previousLabel,
  nextLabel,
  pageStatusLabel,
  goToPageLabel,
  basePath,
}: AdminPostPaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPaginationItems(current, totalPages);
  const hasPrevious = current > 1;
  const hasNext = current < totalPages;

  return (
    <nav aria-label={ariaLabel} className="mt-8 flex items-center justify-center gap-1">
      {hasPrevious ? (
        <Link
          href={buildAdminPostHref(status, current - 1, basePath)}
          aria-label={previousLabel}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          <ChevronLeftIcon aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      ) : null}

      <span className="text-sm text-slate-500 md:hidden">{pageStatusLabel}</span>

      <span className="hidden items-center gap-1 md:flex">
        {items.map((item, index) => {
          if (item === "ellipsis") {
            return (
              <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-slate-400">
                …
              </span>
            );
          }
          const isCurrent = item === current;
          return (
            <Fragment key={item}>
              {isCurrent ? (
                <span
                  aria-current="page"
                  className="inline-flex size-9 items-center justify-center rounded-lg bg-royal-500 text-sm font-medium text-white"
                >
                  {item}
                </span>
              ) : (
                <Link
                  href={buildAdminPostHref(status, item, basePath)}
                  aria-label={goToPageLabel(item)}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100"
                >
                  {item}
                </Link>
              )}
            </Fragment>
          );
        })}
      </span>

      {hasNext ? (
        <Link
          href={buildAdminPostHref(status, current + 1, basePath)}
          aria-label={nextLabel}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          <ChevronRightIcon aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      ) : null}
    </nav>
  );
}
