export type AdminMediaKindFilter = "ALL" | "IMAGE" | "PDF";

export const ADMIN_MEDIA_PAGE_SIZE = 24;

const MAX_PAGE = 10_000;
const STRICT_INTEGER_PATTERN = /^[0-9]+$/;
const KIND_FILTERS: readonly AdminMediaKindFilter[] = ["ALL", "IMAGE", "PDF"];

type SearchParamValue = string | string[] | undefined;

/**
 * Structural-only normalization of the raw `page` search param. Unknown,
 * repeated/array, empty, negative, and fractional input all fall back to the
 * canonical default of 1 without ever reflecting the untrusted value back
 * into the page (manifest data requirement 3).
 */
export function parseAdminMediaPage(raw: SearchParamValue): number {
  if (Array.isArray(raw) || raw === undefined) return 1;
  if (!STRICT_INTEGER_PATTERN.test(raw)) return 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}

/** Unknown, repeated, or otherwise unrecognized `kind` values fall back to the canonical "ALL" default. */
export function parseAdminMediaKind(raw: SearchParamValue): AdminMediaKindFilter {
  if (typeof raw !== "string") return "ALL";
  return (KIND_FILTERS as readonly string[]).includes(raw) ? (raw as AdminMediaKindFilter) : "ALL";
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
