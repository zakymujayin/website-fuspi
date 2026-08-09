/**
 * The frozen navigation data (`nav-items.ts`, owned by the platform lane) mixes
 * site-relative paths with absolute campus-system origins. The shell classifies
 * each destination at render time instead of tagging the data, so external
 * semantics can be hardened without touching the shared contract.
 */
export type NavUrlKind = "internal" | "external" | "unsafe";

const NAVIGABLE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Anything the shell cannot prove is a same-site path or an http(s) origin is
 * `unsafe`: protocol-relative hosts, `javascript:`/`data:` payloads, unparsable
 * values, and non-navigable schemes. Callers must refuse to render those as
 * links rather than passing them to the browser.
 */
export function classifyNavUrl(url: string): NavUrlKind {
  const value = url.trim();

  // `//host` inherits the page protocol and points off-site; it is not a path.
  if (value.startsWith("//")) return "unsafe";
  if (value.startsWith("/")) return "internal";

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return "unsafe";
  }

  return NAVIGABLE_PROTOCOLS.has(parsed.protocol) ? "external" : "unsafe";
}
