export type AdminPostStatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Fixed page size. Mirrors the frozen `AdminPostListQuerySchema` default and is never URL-driven. */
export const ADMIN_POST_PAGE_SIZE = 20;
/** v1 list is newest-updated first. Sort and search are contract-supported but intentionally not exposed yet. */
export const ADMIN_POST_SORT = "UPDATED_DESC";

const STATUS_FILTERS: readonly AdminPostStatusFilter[] = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];
const ALLOWED_QUERY_KEYS = new Set(["page", "status"]);

// Mirrors the frozen `RawAdminPostListQuerySchema` page form exactly: 1-4 digits with no leading
// zero, or the literal upper bound "10000" — never a clamp of a larger value.
const STRICT_PAGE_PATTERN = /^(?:[1-9]\d{0,3}|10000)$/;

export type AdminPostNormalizedQuery = {
  page: number;
  status: AdminPostStatusFilter;
  pageSize: number;
};

const ADMIN_POST_CANONICAL_QUERY: AdminPostNormalizedQuery = {
  page: 1,
  status: "ALL",
  pageSize: ADMIN_POST_PAGE_SIZE,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Whole-record search param normalization, matching the Media Library rule frozen in M3: this
 * route accepts only `page` and `status`, with a fixed `pageSize`. Any unknown key, repeated/array
 * value, or `page` outside the strict form collapses the *entire* query back to canonical defaults
 * rather than partially trusting the remaining field, so one invalid member can never be used to
 * probe whether hidden Posts exist.
 */
export function normalizeAdminPostQuery(raw: RawSearchParams): AdminPostNormalizedQuery {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return ADMIN_POST_CANONICAL_QUERY;
  }

  const rawPage = raw.page;
  const rawStatus = raw.status;
  if (Array.isArray(rawPage) || Array.isArray(rawStatus)) return ADMIN_POST_CANONICAL_QUERY;
  if (rawPage !== undefined && !STRICT_PAGE_PATTERN.test(rawPage)) return ADMIN_POST_CANONICAL_QUERY;
  if (rawStatus !== undefined && !(STATUS_FILTERS as readonly string[]).includes(rawStatus)) {
    return ADMIN_POST_CANONICAL_QUERY;
  }

  return {
    page: rawPage !== undefined ? Number(rawPage) : 1,
    status: rawStatus !== undefined ? (rawStatus as AdminPostStatusFilter) : "ALL",
    pageSize: ADMIN_POST_PAGE_SIZE,
  };
}

/** Builds the frozen transport query from a normalized UI query. */
export function toAdminPostTransportQuery(query: AdminPostNormalizedQuery, type?: "BERITA" | "KOLOM") {
  const transportQuery = {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
    search: "",
    sort: ADMIN_POST_SORT,
  } as const;
  return type ? {...transportQuery, type} : transportQuery;
}

/** Builds an `/admin/posts` link preserving the active filter; `@/i18n/navigation`'s `Link` adds the locale. */
export function buildAdminPostHref(status: AdminPostStatusFilter, page: number): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/posts?${query}` : "/admin/posts";
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
