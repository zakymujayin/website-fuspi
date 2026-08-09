import { ChevronLeft, ChevronRight } from "lucide-react";
import { Fragment } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { buildPaginationItems } from "./pagination";

type PostPaginationProps = {
  current: number;
  totalPages: number;
  basePath: string;
  ariaLabel: string;
  previousLabel: string;
  nextLabel: string;
  pageStatusLabel: string;
  goToPageLabel: (page: number) => string;
};

function pageHref(basePath: string, page: number): string {
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

/** Windowed pagination control (docs/17-I): `‹ 1 2 [3] 4 5 … 12 ›`, simplified on mobile. */
export function PostPagination({
  current,
  totalPages,
  basePath,
  ariaLabel,
  previousLabel,
  nextLabel,
  pageStatusLabel,
  goToPageLabel,
}: PostPaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPaginationItems(current, totalPages);
  const hasPrevious = current > 1;
  const hasNext = current < totalPages;

  return (
    <nav aria-label={ariaLabel} className="mt-8 flex items-center justify-center gap-1">
      {hasPrevious ? (
        <Link
          href={pageHref(basePath, current - 1)}
          aria-label={previousLabel}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
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
                  href={pageHref(basePath, item)}
                  aria-label={goToPageLabel(item)}
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100",
                  )}
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
          href={pageHref(basePath, current + 1)}
          aria-label={nextLabel}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          <ChevronRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      ) : null}
    </nav>
  );
}
