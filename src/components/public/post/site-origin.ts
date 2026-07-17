const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Validates `NEXT_PUBLIC_SITE_URL` as a real HTTP(S) origin exactly once.
 * Every downstream `new URL(path, origin)` call (cover resolution, hreflang,
 * JSON-LD, OG image) must receive this already-validated value instead of
 * the raw env string — a malformed-but-truthy value must never throw.
 */
export function validateSiteOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return HTTP_PROTOCOLS.has(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}
