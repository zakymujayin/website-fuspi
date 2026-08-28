import type {PublicContentResource} from "@/contracts/public-content";

export const PUBLIC_CONTENT_RESOURCES = [
  "SERVICE", "PARTNERSHIP", "SCHOLARSHIP", "ACHIEVEMENT", "STUDENT_ACTIVITY",
  "DOCUMENT", "ALBUM", "EVENT", "FAQ", "TESTIMONIAL",
] as const;

export const PUBLIC_CONTENT_ADMIN_PAGE_SIZE = 20;
export const PUBLIC_CONTENT_SEARCH_MAX_LENGTH = 100;

const ALLOWED_QUERY_KEYS = new Set(["page", "visibility", "translationStatus", "category", "year", "search", "direction"]);

const STRICT_PAGE_PATTERN = /^(?:[1-9]\d{0,3}|10000)$/;
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export type PublicContentAdminNormalizedQuery = {
  page: number;
  resource: PublicContentResource;
  visibility: "ALL" | "PUBLIC" | "HIDDEN" | "EXPIRED";
  translationStatus: string | null;
  category: string | null;
  year: number | null;
  search: string;
  direction: "asc" | "desc";
  pageSize: 10 | 20 | 50;
};

const CANONICAL_QUERY = {
  page: 1,
  visibility: "ALL" as const,
  translationStatus: null,
  category: null,
  year: null,
  search: "",
  direction: "asc" as const,
  pageSize: 20 as const,
};

export function normalizePublicContentAdminQuery(
  raw: Record<string, string | string[] | undefined>,
  resource: PublicContentResource,
): PublicContentAdminNormalizedQuery {
  for (const key of Object.keys(raw)) {
    if (key === "resource") continue;
    if (!ALLOWED_QUERY_KEYS.has(key)) return {...CANONICAL_QUERY, resource};
  }

  const {page: rawPage, visibility: rawVis, translationStatus: rawTs, category: rawCat, year: rawYear, search: rawSearch, direction: rawDir} = raw;

  if (Array.isArray(rawPage) || Array.isArray(rawVis) || Array.isArray(rawTs) || Array.isArray(rawCat) || Array.isArray(rawYear) || Array.isArray(rawSearch) || Array.isArray(rawDir)) {
    return {...CANONICAL_QUERY, resource};
  }

  if (rawPage !== undefined && !STRICT_PAGE_PATTERN.test(rawPage)) return {...CANONICAL_QUERY, resource};
  if (rawVis !== undefined && !(["ALL", "PUBLIC", "HIDDEN", "EXPIRED"] as const).includes(rawVis as typeof CANONICAL_QUERY.visibility)) {
    return {...CANONICAL_QUERY, resource};
  }
  if (rawDir !== undefined && !(["asc", "desc"] as const).includes(rawDir as "asc" | "desc")) {
    return {...CANONICAL_QUERY, resource};
  }

  const search = rawSearch?.trim() ?? "";
  if (search.length > PUBLIC_CONTENT_SEARCH_MAX_LENGTH || UNSAFE_TEXT_PATTERN.test(search)) {
    return {...CANONICAL_QUERY, resource};
  }

  const year = rawYear !== undefined ? Number(rawYear) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
    return {...CANONICAL_QUERY, resource};
  }

  return {
    resource,
    page: rawPage !== undefined ? Number(rawPage) : 1,
    visibility: (rawVis as typeof CANONICAL_QUERY.visibility) ?? "ALL",
    translationStatus: rawTs ?? null,
    category: rawCat?.trim() || null,
    year,
    search,
    direction: (rawDir as "asc" | "desc") ?? "asc",
    pageSize: 20,
  };
}

export function toPublicContentAdminTransportQuery(query: PublicContentAdminNormalizedQuery) {
  return {
    resource: query.resource,
    page: query.page,
    pageSize: query.pageSize,
    visibility: query.visibility,
    translationStatus: query.translationStatus as never,
    category: query.category,
    year: query.year,
    search: query.search,
    // The UI query keeps `direction` lowercase for URL building; the frozen transport contract
    // (`CmsSortDirectionSchema`) expects "ASC" | "DESC".
    direction: query.direction.toUpperCase() as "ASC" | "DESC",
  } as const;
}

export function buildPublicContentAdminHref(
  resource: string,
  {visibility = "ALL", search = "", direction = "desc", page = 1}: {
    visibility?: string;
    search?: string;
    direction?: string;
    page?: number;
  } = {},
): string {
  const params = new URLSearchParams();
  if (visibility !== "ALL") params.set("visibility", visibility);
  if (search) params.set("search", search);
  if (direction !== "desc") params.set("direction", direction);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/${resource}?${query}` : `/admin/${resource}`;
}

export function totalPagesFor(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

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

export const PUBLIC_CONTENT_SLUG_MAP: Record<PublicContentResource, string> = {
  SERVICE: "layanan",
  PARTNERSHIP: "kerjasama",
  SCHOLARSHIP: "beasiswa",
  ACHIEVEMENT: "prestasi",
  STUDENT_ACTIVITY: "kegiatan",
  DOCUMENT: "dokumen",
  ALBUM: "album",
  EVENT: "agenda",
  FAQ: "faq",
  TESTIMONIAL: "testimoni",
};

export const PUBLIC_CONTENT_LABEL_KEYS: Record<PublicContentResource, string> = {
  SERVICE: "service",
  PARTNERSHIP: "partnership",
  SCHOLARSHIP: "scholarship",
  ACHIEVEMENT: "achievement",
  STUDENT_ACTIVITY: "studentActivity",
  DOCUMENT: "document",
  ALBUM: "album",
  EVENT: "event",
  FAQ: "faq",
  TESTIMONIAL: "testimonial",
};
