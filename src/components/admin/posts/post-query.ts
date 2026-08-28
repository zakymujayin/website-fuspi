export type AdminPostStatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Default page size. One of the frozen `AdminPostListQuerySchema` literals; overridable via `pageSize`. */
export const ADMIN_POST_PAGE_SIZE = 10;
/** Mirrors the frozen `SearchTextSchema` bound so the control cannot submit an over-long term. */
export const ADMIN_POST_SEARCH_MAX_LENGTH = 100;
/** v1 list is newest-updated first. Sort is contract-supported but intentionally not exposed yet. */
export const ADMIN_POST_SORT = "UPDATED_DESC";

const STATUS_FILTERS: readonly AdminPostStatusFilter[] = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];
const ALLOWED_QUERY_KEYS = new Set(["page", "status", "search", "pageSize"]);
const PAGE_SIZE_VALUES = new Set(["10", "20", "50"]);

// Mirrors the frozen `RawAdminPostListQuerySchema` page form exactly: 1-4 digits with no leading
// zero, or the literal upper bound "10000" — never a clamp of a larger value.
const STRICT_PAGE_PATTERN = /^(?:[1-9]\d{0,3}|10000)$/;
// The frozen `SearchTextSchema` rejects C0/C1 control characters outright.
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export type AdminPostNormalizedQuery = {
  page: number;
  status: AdminPostStatusFilter;
  search: string;
  pageSize: 10 | 20 | 50;
};

const ADMIN_POST_CANONICAL_QUERY: AdminPostNormalizedQuery = {
  page: 1,
  status: "ALL",
  search: "",
  pageSize: 10,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Whole-record search param normalization, matching the Media Library rule frozen in M3: this
 * route accepts only `page`, `status`, `search`, and `pageSize`. Any unknown key, repeated/array
 * value, `page` outside the strict form, a `pageSize` that is not exactly one of the frozen
 * literals, or a `search` term over the bound or carrying control characters collapses the
 * *entire* query back to canonical defaults rather than partially trusting the remaining fields,
 * so one invalid member can never be used to probe whether hidden Posts exist.
 */
export function normalizeAdminPostQuery(raw: RawSearchParams): AdminPostNormalizedQuery {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return ADMIN_POST_CANONICAL_QUERY;
  }

  const { page: rawPage, status: rawStatus, search: rawSearch, pageSize: rawPageSize } = raw;
  if (
    Array.isArray(rawPage)
    || Array.isArray(rawStatus)
    || Array.isArray(rawSearch)
    || Array.isArray(rawPageSize)
  ) return ADMIN_POST_CANONICAL_QUERY;

  if (rawPage !== undefined && !STRICT_PAGE_PATTERN.test(rawPage)) return ADMIN_POST_CANONICAL_QUERY;
  if (rawStatus !== undefined && !(STATUS_FILTERS as readonly string[]).includes(rawStatus)) {
    return ADMIN_POST_CANONICAL_QUERY;
  }
  if (rawPageSize !== undefined && !PAGE_SIZE_VALUES.has(rawPageSize)) {
    return ADMIN_POST_CANONICAL_QUERY;
  }
  // Trim first: a term of only spaces is "no search", not an invalid one. Anything still over the
  // frozen bound, or carrying control characters, fails the whole record closed.
  const search = rawSearch?.trim() ?? "";
  if (search.length > ADMIN_POST_SEARCH_MAX_LENGTH || UNSAFE_TEXT_PATTERN.test(search)) {
    return ADMIN_POST_CANONICAL_QUERY;
  }

  return {
    page: rawPage !== undefined ? Number(rawPage) : 1,
    status: rawStatus !== undefined ? (rawStatus as AdminPostStatusFilter) : "ALL",
    search,
    pageSize: rawPageSize !== undefined ? (Number(rawPageSize) as 10 | 20 | 50) : 10,
  };
}

/** Builds the frozen transport query from a normalized UI query. */
export function toAdminPostTransportQuery(
  query: AdminPostNormalizedQuery,
  type?: "BERITA" | "PENGUMUMAN" | "KOLOM",
) {
  const transportQuery = {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
    search: query.search,
    sort: ADMIN_POST_SORT,
  } as const;
  return type ? {...transportQuery, type} : transportQuery;
}

/**
 * Builds an admin post-list link preserving the active filter; `@/i18n/navigation`'s `Link` adds
 * the locale. `basePath` lets the shared list chrome serve `/admin/posts`, `/admin/pengumuman`,
 * and `/admin/kolom` without each one drifting back to `/admin/posts`. Only non-canonical members
 * are serialized, so page size 10 and an empty search leave a bare URL.
 */
export function buildAdminPostHref(
  status: AdminPostStatusFilter,
  page: number,
  basePath = "/admin/posts",
  extra: { search?: string; pageSize?: 10 | 20 | 50 } = {},
): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (extra.search) params.set("search", extra.search);
  if (extra.pageSize && extra.pageSize !== 10) params.set("pageSize", String(extra.pageSize));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
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
