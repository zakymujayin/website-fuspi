export type AdminMediaKindFilter = "ALL" | "IMAGE" | "PDF";

export const ADMIN_MEDIA_PAGE_SIZE = 24;

const KIND_FILTERS: readonly AdminMediaKindFilter[] = ["ALL", "IMAGE", "PDF"];
const ALLOWED_QUERY_KEYS = new Set(["page", "kind"]);

// Mirrors the frozen `AdminMediaListSearchParamsSchema` page form exactly: 1-4 digits with
// no leading zero, or the literal upper bound "10000" — never a clamp of a larger value.
const STRICT_PAGE_PATTERN = /^(?:[1-9]\d{0,3}|10000)$/;

export type AdminMediaNormalizedQuery = {
  page: number;
  kind: AdminMediaKindFilter;
  pageSize: number;
};

const ADMIN_MEDIA_CANONICAL_QUERY: AdminMediaNormalizedQuery = {
  page: 1,
  kind: "ALL",
  pageSize: ADMIN_MEDIA_PAGE_SIZE,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Whole-record search param normalization (manifest data requirement 3). This
 * route accepts only `page` and `kind`, with a fixed `pageSize` — never taken
 * from the URL. Any unknown key, any repeated/array value, or any `page`
 * value outside the frozen strict form collapses the *entire* query back to
 * the canonical default rather than partially trusting the remaining field,
 * so a single invalid member can never leak whether hidden Media exists.
 */
export function normalizeAdminMediaQuery(raw: RawSearchParams): AdminMediaNormalizedQuery {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return ADMIN_MEDIA_CANONICAL_QUERY;
  }

  const rawPage = raw.page;
  const rawKind = raw.kind;
  if (Array.isArray(rawPage) || Array.isArray(rawKind)) return ADMIN_MEDIA_CANONICAL_QUERY;
  if (rawPage !== undefined && !STRICT_PAGE_PATTERN.test(rawPage)) return ADMIN_MEDIA_CANONICAL_QUERY;
  if (rawKind !== undefined && !(KIND_FILTERS as readonly string[]).includes(rawKind)) {
    return ADMIN_MEDIA_CANONICAL_QUERY;
  }

  return {
    page: rawPage !== undefined ? Number(rawPage) : 1,
    kind: rawKind !== undefined ? (rawKind as AdminMediaKindFilter) : "ALL",
    pageSize: ADMIN_MEDIA_PAGE_SIZE,
  };
}

/** Builds a `/admin/media` link that preserves the active filter; the active locale is added by `@/i18n/navigation`'s `Link`. */
export function buildAdminMediaHref(kind: AdminMediaKindFilter, page: number): string {
  const params = new URLSearchParams();
  if (kind !== "ALL") params.set("kind", kind);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/media?${query}` : "/admin/media";
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
