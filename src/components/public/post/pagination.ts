const STRICT_INTEGER_PATTERN = /^[0-9]+$/;
const MAX_PAGE = 10_000;

/**
 * Structural-only validation of the raw `page` search param. Invalid, empty,
 * repeated/array, zero, negative, and fractional input all fall back to 1
 * without ever reflecting the untrusted value back into the page.
 */
export function parsePageCandidate(raw: string | string[] | undefined): number {
  if (Array.isArray(raw) || raw === undefined) return 1;
  if (!STRICT_INTEGER_PATTERN.test(raw)) return 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}

/** Clamps a structurally-valid page candidate once the real total is known. */
export function clampPageToTotalPages(page: number, totalPages: number): number {
  const boundedTotalPages = Math.max(1, totalPages);
  return Math.min(Math.max(page, 1), boundedTotalPages);
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
