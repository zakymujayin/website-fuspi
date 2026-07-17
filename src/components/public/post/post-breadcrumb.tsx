import { ChevronRight } from "lucide-react";
import { Fragment } from "react";

import { Link } from "@/i18n/navigation";

export type PostBreadcrumbItem = {
  label: string;
  href?: string;
};

type PostBreadcrumbProps = {
  items: readonly PostBreadcrumbItem[];
  ariaLabel: string;
};

/**
 * Visual breadcrumb trail (docs/17-J). The matching `BreadcrumbList` JSON-LD
 * is rendered separately by the route via `buildBreadcrumbJsonLd` +
 * `PostJsonLd`, keeping this component presentation-only and easy to test.
 */
export function PostBreadcrumb({ items, ariaLabel }: PostBreadcrumbProps) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={`${item.label}-${index}`}>
            {index > 0 ? (
              <ChevronRight aria-hidden className="size-3.5 rtl:rotate-180" strokeWidth={1.5} />
            ) : null}
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? "page" : undefined}
                className="min-w-0 break-words text-slate-700"
              >
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="min-w-0 break-words transition-colors hover:text-royal-600">
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
