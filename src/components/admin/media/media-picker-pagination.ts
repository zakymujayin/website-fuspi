import type {AdminMediaItem} from "@/contracts/media-admin";

const ADMIN_IMAGE_PICKER_PAGE_SIZE = 24;

export type AdminMediaPickerPage = {
  items: readonly AdminMediaItem[];
  page: number;
  hasNextPage: boolean;
};

export function buildAdminImagePickerHref(page: number) {
  const params = new URLSearchParams({
    kind: "IMAGE",
    page: String(page),
    pageSize: String(ADMIN_IMAGE_PICKER_PAGE_SIZE),
  });
  return `/api/admin/media?${params.toString()}`;
}

export function parseAdminMediaPickerPage(data: unknown): AdminMediaPickerPage | null {
  if (typeof data !== "object" || data === null) return null;
  const result = data as {
    items?: unknown;
    page?: unknown;
    hasNextPage?: unknown;
  };
  if (!Array.isArray(result.items)) return null;
  if (typeof result.page !== "number" || !Number.isInteger(result.page) || result.page < 1) {
    return null;
  }
  if (typeof result.hasNextPage !== "boolean") return null;
  return {
    items: result.items as AdminMediaItem[],
    page: result.page,
    hasNextPage: result.hasNextPage,
  };
}

export function mergeAdminMediaPickerItems(
  current: readonly AdminMediaItem[],
  incoming: readonly AdminMediaItem[],
) {
  const seen = new Set(current.map((item) => item.id));
  const merged = [...current];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }
  return merged;
}
