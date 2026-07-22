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
