import {BookingOnlyAdminRoleSchema, SafeInternalPathSchema} from "@/contracts/auth";
import {routing, type AppLocale} from "@/i18n/routing";

const INTERNAL_ORIGIN = "https://fuspi.invalid";
const AUTH_SEGMENTS = new Set(["login", "change-password"]);

export function parseAppLocale(value: unknown): AppLocale {
  return typeof value === "string" && routing.locales.includes(value as AppLocale)
    ? (value as AppLocale)
    : routing.defaultLocale;
}

export function resolveAuthLocale(
  localeHint: unknown,
  redirectCandidate: unknown,
): AppLocale {
  if (localeHint !== null && localeHint !== undefined) return parseAppLocale(localeHint);
  const safe = SafeInternalPathSchema.safeParse(redirectCandidate);
  if (!safe.success) return routing.defaultLocale;
  const firstSegment = safe.data.split(/[/?#]/u).filter(Boolean)[0];
  return parseAppLocale(firstSegment);
}

export function normalizeAuthRedirect(
  candidate: unknown,
  locale: AppLocale,
): string {
  const fallback = `/${locale}/admin`;
  const safe = SafeInternalPathSchema.safeParse(candidate);
  if (!safe.success) return fallback;

  try {
    if (!SafeInternalPathSchema.safeParse(decodeURIComponent(safe.data)).success) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(safe.data, INTERNAL_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== INTERNAL_ORIGIN) return fallback;

  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && routing.locales.includes(first as AppLocale)) {
    segments[0] = locale;
  } else if (first === "admin") {
    segments.unshift(locale);
  } else {
    return fallback;
  }

  if (AUTH_SEGMENTS.has(segments[1] ?? "")) return fallback;

  const pathname = `/${segments.join("/")}`;
  const normalized = `${pathname}${url.search}${url.hash}`;
  return SafeInternalPathSchema.safeParse(normalized).success ? normalized : fallback;
}

/**
 * Where a role belongs after signing in. Everyone shares one login page, so the
 * split happens here rather than in a second sign-in screen. This wraps
 * `normalizeAuthRedirect` instead of altering it: the open-redirect guard keeps
 * deciding what is safe, and this only re-points a destination the role may not
 * use. A DOSEN aimed at the CMS lands in the lecturer portal instead.
 */
export function resolvePostLoginDestination(
  role: unknown,
  candidate: unknown,
  locale: AppLocale,
): string {
  const destination = normalizeAuthRedirect(candidate, locale);
  if (BookingOnlyAdminRoleSchema.safeParse(role).success) {
    const adminRoot = `/${locale}/admin`;
    return destination === adminRoot || destination.startsWith(`${adminRoot}/`)
      ? `/${locale}/admin/peminjaman`
      : destination;
  }
  if (role !== "DOSEN") return destination;
  const adminRoot = `/${locale}/admin`;
  return destination === adminRoot || destination.startsWith(`${adminRoot}/`)
    ? `/${locale}/portal-dosen`
    : destination;
}

export function createPostPasswordLoginRedirect(
  locale: AppLocale,
  destination: unknown,
) {
  const safeDestination = normalizeAuthRedirect(destination, locale);
  return `/${locale}/login?next=${encodeURIComponent(safeDestination)}`;
}
