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
 */
export function resolveCoverImageSrc(
  cover: PublicPostView["cover"],
  siteOrigin: string | undefined,
): ResolvedCoverImage {
  if (!cover || cover.mimeType !== "image/webp" || cover.width === null || cover.height === null) {
    return PLACEHOLDER;
  }

  const isRelative = cover.url.startsWith("/") && !cover.url.startsWith("//");
  const localPath = isRelative ? cover.url : resolveAbsoluteToLocalPath(cover.url, siteOrigin);
  if (!localPath) return PLACEHOLDER;

  return {
    kind: "image",
    src: localPath,
    width: cover.width,
    height: cover.height,
    alt: cover.alt,
    isDecorative: cover.isDecorative,
  };
}

function resolveAbsoluteToLocalPath(rawUrl: string, siteOrigin: string | undefined): string | null {
  if (!siteOrigin) return null;
  const coverOrigin = parseOrigin(rawUrl);
  const configuredOrigin = parseOrigin(siteOrigin);
  if (!coverOrigin || !configuredOrigin || coverOrigin !== configuredOrigin) return null;
  return new URL(rawUrl).pathname;
}
