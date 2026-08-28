export type FacilityActiveFilter = "ALL" | "ACTIVE" | "INACTIVE";

/** Mirrors the frozen facility raw-list `search` bound so the control cannot submit an over-long term. */
export const FACILITY_SEARCH_MAX_LENGTH = 120;

/**
 * Builds an admin fasilitas-list link preserving the active filter; `@/i18n/navigation`'s `Link`
 * adds the locale. Only non-canonical members are serialized — in the fixed order active, search,
 * pageSize, page — so page size 10, an empty search, and page 1 leave a bare URL.
 */
export function buildFacilityHref(parts: {
  active?: FacilityActiveFilter;
  search?: string;
  page?: number;
  pageSize?: 10 | 20 | 50;
}): string {
  const params = new URLSearchParams();
  if (parts.active && parts.active !== "ALL") params.set("active", parts.active);
  if (parts.search) params.set("search", parts.search);
  if (parts.pageSize && parts.pageSize !== 10) params.set("pageSize", String(parts.pageSize));
  if (parts.page && parts.page > 1) params.set("page", String(parts.page));
  const query = params.toString();
  return query ? `/admin/fasilitas?${query}` : "/admin/fasilitas";
}

export function totalPagesFor(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Windowed pagination items — first, last, and neighbours of the current page. */
export function buildPaginationItems(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 1) return [1];

  const pages = new Set<number>([1, totalPages]);
  for (let page = current - 1; page <= current + 1; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  let previous: number | null = null;
  for (const page of sorted) {
    if (previous !== null && page - previous > 1) items.push("ellipsis");
    items.push(page);
    previous = page;
  }
  return items;
}
