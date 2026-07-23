import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { buildAdminPostHref, type AdminPostStatusFilter } from "./post-query";

type AdminPostFilterTabsProps = {
  active: AdminPostStatusFilter;
  ariaLabel: string;
  labels: Record<AdminPostStatusFilter, string>;
};

const FILTERS: readonly AdminPostStatusFilter[] = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];

/** Status filter links; switching filter always resets to page 1 and preserves the active locale. */
export function AdminPostFilterTabs({ active, ariaLabel, labels }: AdminPostFilterTabsProps) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = filter === active;
        return (
          <Link
            key={filter}
            href={buildAdminPostHref(filter, 1)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-royal-500 text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-100",
            )}
          >
            {labels[filter]}
          </Link>
        );
      })}
    </nav>
  );
}
