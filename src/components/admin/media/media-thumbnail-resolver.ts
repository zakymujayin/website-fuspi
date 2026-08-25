import type { AdminMediaItem } from "@/contracts/media-admin";

export type ResolvedAdminMediaThumbnail =
  | { kind: "image"; src: string; width: number | null; height: number | null; alt: string; isDecorative: boolean }
  | { kind: "pdf" }
  | { kind: "placeholder" };

const UPLOADS_PREFIX = "/uploads/";

function parseOrigin(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Converts an already-validated `AdminMediaItem.url` into a same-origin,
 * local `/uploads/...` path safe for `next/image`, or falls back to a
 * meaningful placeholder. `next.config.ts` only allow-lists the production
 * upload host, so any URL that cannot be proven same-origin as the
 * server-configured `UPLOAD_PUBLIC_URL` must never reach `next/image`
 * (manifest presentation requirement 4). PDFs never render through
 * `next/image` and always resolve to their own intentional placeholder.
 */
export function resolveAdminMediaThumbnail(
  item: Pick<AdminMediaItem, "url" | "mimeType" | "width" | "height" | "alt" | "isDecorative">,
  uploadPublicUrl: string,
): ResolvedAdminMediaThumbnail {
  if (item.mimeType === "application/pdf") return { kind: "pdf" };

  const isRelative = item.url.startsWith("/") && !item.url.startsWith("//");
  if (isRelative) {
    return item.url.startsWith(UPLOADS_PREFIX)
      ? {
          kind: "image",
          src: item.url,
          width: item.width,
          height: item.height,
          alt: item.alt ?? "",
          isDecorative: item.isDecorative || item.alt === null,
        }
      : { kind: "placeholder" };
  }

  const itemOrigin = parseOrigin(item.url);
  const configuredOrigin = parseOrigin(uploadPublicUrl);
  if (!itemOrigin || !configuredOrigin || itemOrigin !== configuredOrigin) return { kind: "placeholder" };

  let pathname: string;
  try {
    pathname = new URL(item.url).pathname;
  } catch {
    return { kind: "placeholder" };
  }
  if (!pathname.startsWith(UPLOADS_PREFIX)) return { kind: "placeholder" };

  return {
    kind: "image",
    src: pathname,
    width: item.width,
    height: item.height,
    alt: item.alt ?? "",
    isDecorative: item.isDecorative || item.alt === null,
  };
}
