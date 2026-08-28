import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { buildAdminPageHref, type AdminPageStatusFilter } from "./page-query";

type AdminPageFilterTabsProps = {
  active: AdminPageStatusFilter;
  ariaLabel: string;
  labels: Record<AdminPageStatusFilter, string>;
  search: string;
  sort: "UPDATED_DESC" | "TITLE_ASC";
  pageSize: 10 | 20 | 50;
};

const FILTERS: readonly AdminPageStatusFilter[] = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];

export function AdminPageFilterTabs({ active, ariaLabel, labels, search, sort, pageSize }: AdminPageFilterTabsProps) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = filter === active;
        return (
          <Link
            key={filter}
            href={buildAdminPageHref({ status: filter, search, sort, page: 1, pageSize })}
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
