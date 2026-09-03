import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { buildAdminMediaHref, type AdminMediaKindFilter } from "./media-query";

type AdminMediaFilterTabsProps = {
  active: AdminMediaKindFilter;
  ariaLabel: string;
  labels: Record<AdminMediaKindFilter, string>;
};

const FILTERS: readonly AdminMediaKindFilter[] = ["ALL", "IMAGE", "PDF"];

/** ALL/IMAGE/PDF filter links; switching filter always resets to page 1 and preserves the active locale. */
export function AdminMediaFilterTabs({ active, ariaLabel, labels }: AdminMediaFilterTabsProps) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = filter === active;
        return (
          <Link
            key={filter}
            href={buildAdminMediaHref(filter, 1)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500",
              isActive
                ? "bg-navy-800 text-white shadow-sm"
                : "border border-slate-300 bg-white text-slate-600 hover:border-royal-300 hover:bg-royal-50 hover:text-royal-700",
            )}
          >
            {labels[filter]}
          </Link>
        );
      })}
    </nav>
  );
}
