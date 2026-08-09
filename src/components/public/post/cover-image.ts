import type {PublicPostView} from "@/contracts/post";

export type ResolvedCoverImage =
  | {
      kind: "image";
      src: string;
      width: number;
      height: number;
      alt: string;
      isDecorative: boolean;
    }
  | {kind: "placeholder"};

const PLACEHOLDER: ResolvedCoverImage = {kind: "placeholder"};
const UPLOADS_PREFIX = "/uploads/";

function parseOrigin(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

/**
 * Converts an already-validated `PublicMediaView.url` into a same-origin
 * local `/uploads/...` path safe for `next/image`, or falls back to an
 * accessible placeholder. `next.config.ts` only allow-lists one remote image
 * host, so any URL that cannot be proven same-origin as the configured
 * public site must never reach `next/image` (docs manifest, list requirement 3).
 * `siteOrigin` must already be validated by `validateSiteOrigin`.
 */
export function resolveCoverImageSrc(
  cover: PublicPostView["cover"],
  siteOrigin: string | null,
): ResolvedCoverImage {
  if (!cover || cover.mimeType !== "image/webp" || cover.width === null || cover.height === null) {
    return PLACEHOLDER;
  }

  const isRelative = cover.url.startsWith("/") && !cover.url.startsWith("//");
  const localPath = isRelative ? cover.url : resolveAbsoluteToLocalPath(cover.url, siteOrigin);
  if (!localPath || !localPath.startsWith(UPLOADS_PREFIX)) return PLACEHOLDER;

  return {
    kind: "image",
    src: localPath,
    width: cover.width,
    height: cover.height,
    alt: cover.alt,
    isDecorative: cover.isDecorative,
  };
}

function resolveAbsoluteToLocalPath(rawUrl: string, siteOrigin: string | null): string | null {
  if (!siteOrigin) return null;
  const coverOrigin = parseOrigin(rawUrl);
  if (!coverOrigin || coverOrigin !== siteOrigin) return null;
  return new URL(rawUrl).pathname;
}
