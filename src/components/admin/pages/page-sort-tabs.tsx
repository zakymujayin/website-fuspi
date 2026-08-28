import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { buildAdminPageHref, type AdminPageSort, type AdminPageStatusFilter } from "./page-query";

type AdminPageSortTabsProps = {
  active: AdminPageSort;
  ariaLabel: string;
  labels: Record<AdminPageSort, string>;
  status: AdminPageStatusFilter;
  search: string;
  pageSize: 10 | 20 | 50;
};

const SORTS: readonly AdminPageSort[] = ["UPDATED_DESC", "TITLE_ASC"];

export function AdminPageSortTabs({ active, ariaLabel, labels, status, search, pageSize }: AdminPageSortTabsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500" id="admin-page-sort-label">
        {ariaLabel}
      </span>
      <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
        {SORTS.map((sort) => {
          const isActive = sort === active;
          return (
            <Link
              key={sort}
              href={buildAdminPageHref({ status, search, sort, page: 1, pageSize })}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-100 text-slate-900"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-100",
              )}
            >
              {labels[sort]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
