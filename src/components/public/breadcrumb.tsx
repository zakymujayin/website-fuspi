import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

import { LOCALE_DIRECTION } from "@/components/public/post/locale";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  /**
   * Actual language `label` is rendered in, when it comes from translated
   * content (e.g. a detail page's title crumb) rather than a shell UI
   * string. Leave unset for shell labels — those already match the page
   * locale via `getTranslations()`.
   */
  resolvedLocale?: AppLocale;
};

type BreadcrumbProps = {
  items: readonly BreadcrumbItem[];
  ariaLabel: string;
  className?: string;
};

/** Shared, accessible breadcrumb trail: chevron separator, `aria-current="page"` on the active crumb, RTL-aware. */
export function Breadcrumb({ items, ariaLabel, className }: BreadcrumbProps) {
  return (
    <nav aria-label={ariaLabel} className={cn("flex flex-wrap items-center gap-2 text-[13px] text-slate-500", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const langDir = item.resolvedLocale
          ? { lang: item.resolvedLocale, dir: LOCALE_DIRECTION[item.resolvedLocale] }
          : {};
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <ChevronRight aria-hidden className="size-3.5 shrink-0 rtl:rotate-180" strokeWidth={1.5} />
            ) : null}
            {isLast || !item.href ? (
              <span
                {...langDir}
                aria-current={isLast ? "page" : undefined}
                className="min-w-0 break-words text-slate-700"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                {...langDir}
                className="min-w-0 break-words transition-colors hover:text-royal-600"
              >
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
