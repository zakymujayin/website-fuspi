import {SafeInternalPathSchema} from "@/contracts/auth";
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

export function createPostPasswordLoginRedirect(
  locale: AppLocale,
  destination: unknown,
) {
  const safeDestination = normalizeAuthRedirect(destination, locale);
  return `/${locale}/login?next=${encodeURIComponent(safeDestination)}`;
}
