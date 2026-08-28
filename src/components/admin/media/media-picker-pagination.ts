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

/** Refetch page 1 of the image picker and return the full list item for `mediaId` (e.g. a just-uploaded file), or null. */
export async function findAdminMediaItemById(mediaId: string): Promise<AdminMediaItem | null> {
  try {
    const response = await fetch(buildAdminImagePickerHref(1), {
      credentials: "same-origin",
      headers: {accept: "application/json"},
    });
    const data: unknown = await response.json().catch(() => null);
    const result = parseAdminMediaPickerPage(data);
    if (!response.ok || !result) return null;
    return result.items.find((item) => item.id === mediaId) ?? null;
  } catch {
    return null;
  }
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
