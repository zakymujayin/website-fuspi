export type AdminPageStatusFilter = "ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AdminPageSort = "UPDATED_DESC" | "TITLE_ASC";

/** Default page size. One of the frozen `PageListQuerySchema` literals; overridable via `pageSize`. */
export const ADMIN_PAGE_PAGE_SIZE = 10;
/** Mirrors the frozen `SearchTextSchema` bound so the control cannot submit an over-long term. */
export const ADMIN_PAGE_SEARCH_MAX_LENGTH = 100;

const STATUS_FILTERS: readonly AdminPageStatusFilter[] = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];
const SORTS: readonly AdminPageSort[] = ["UPDATED_DESC", "TITLE_ASC"];
const ALLOWED_QUERY_KEYS = new Set(["page", "status", "search", "sort", "pageSize"]);
const PAGE_SIZE_VALUES = new Set(["10", "20", "50"]);

// Mirrors the frozen `RawAdminPageListQuerySchema` page form exactly: 1-4 digits with no leading
// zero, or the literal upper bound "10000" — never a clamp of a larger value.
const STRICT_PAGE_PATTERN = /^(?:[1-9]\d{0,3}|10000)$/;
// The frozen `SearchTextSchema` rejects C0/C1 control characters outright.
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export type AdminPageNormalizedQuery = {
  page: number;
  status: AdminPageStatusFilter;
  search: string;
  sort: AdminPageSort;
  pageSize: 10 | 20 | 50;
};

const ADMIN_PAGE_CANONICAL_QUERY: AdminPageNormalizedQuery = {
  page: 1,
  status: "ALL",
  search: "",
  sort: "UPDATED_DESC",
  pageSize: 10,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Whole-record search param normalization, matching the rule frozen for the Media Library and Post
 * list: this route accepts only `page`, `status`, `search`, `sort`, and `pageSize`. Any unknown
 * key, repeated/array value, a `pageSize` that is not exactly one of the frozen literals, or a
 * member outside its strict form collapses the *entire* query back to canonical defaults rather
 * than partially trusting the rest, so one invalid member can never be used to probe which Pages
 * exist.
 */
export function normalizeAdminPageQuery(raw: RawSearchParams): AdminPageNormalizedQuery {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return ADMIN_PAGE_CANONICAL_QUERY;
  }

  const { page: rawPage, status: rawStatus, search: rawSearch, sort: rawSort, pageSize: rawPageSize } = raw;
  if (
    Array.isArray(rawPage)
    || Array.isArray(rawStatus)
    || Array.isArray(rawSearch)
    || Array.isArray(rawSort)
    || Array.isArray(rawPageSize)
  ) return ADMIN_PAGE_CANONICAL_QUERY;

  if (rawPage !== undefined && !STRICT_PAGE_PATTERN.test(rawPage)) return ADMIN_PAGE_CANONICAL_QUERY;
  if (rawStatus !== undefined && !(STATUS_FILTERS as readonly string[]).includes(rawStatus)) {
    return ADMIN_PAGE_CANONICAL_QUERY;
  }
  if (rawSort !== undefined && !(SORTS as readonly string[]).includes(rawSort)) {
    return ADMIN_PAGE_CANONICAL_QUERY;
  }
  if (rawPageSize !== undefined && !PAGE_SIZE_VALUES.has(rawPageSize)) {
    return ADMIN_PAGE_CANONICAL_QUERY;
  }
  // Trim first: a term of only spaces is "no search", not an invalid one. Anything still over the
  // frozen bound, or carrying control characters, fails the whole record closed.
  const search = rawSearch?.trim() ?? "";
  if (search.length > ADMIN_PAGE_SEARCH_MAX_LENGTH || UNSAFE_TEXT_PATTERN.test(search)) {
    return ADMIN_PAGE_CANONICAL_QUERY;
  }

  return {
    page: rawPage !== undefined ? Number(rawPage) : 1,
    status: rawStatus !== undefined ? (rawStatus as AdminPageStatusFilter) : "ALL",
    search,
    sort: rawSort !== undefined ? (rawSort as AdminPageSort) : "UPDATED_DESC",
    pageSize: rawPageSize !== undefined ? (Number(rawPageSize) as 10 | 20 | 50) : 10,
  };
}

/** Builds the frozen transport query from a normalized UI query. */
export function toAdminPageTransportQuery(query: AdminPageNormalizedQuery) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
    search: query.search,
    sort: query.sort,
  } as const;
}

type AdminPageHrefParts = Partial<Pick<AdminPageNormalizedQuery, "status" | "search" | "sort" | "pageSize">> & {
  page?: number;
};

/**
 * Builds an `/admin/pages` link. Only non-default members are serialized so the canonical view has a
 * bare URL; `@/i18n/navigation`'s `Link` adds the active locale.
 */
export function buildAdminPageHref({
  status = "ALL",
  search = "",
  sort = "UPDATED_DESC",
  page = 1,
  pageSize,
}: AdminPageHrefParts = {}): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (search) params.set("search", search);
  if (sort !== "UPDATED_DESC") params.set("sort", sort);
  if (pageSize && pageSize !== 10) params.set("pageSize", String(pageSize));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/pages?${query}` : "/admin/pages";
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
