import type { AppLocale } from "@/i18n/routing";

/** Intl locale tags for date formatting per active site locale (mirrors docs/12-multibahasa-rtl.md). */
const INTL_LOCALE_TAG: Record<AppLocale, string> = {
  id: "id-ID",
  en: "en-US",
  ar: "ar",
};

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

/** Asia/Jakarta date and time (docs/12-multibahasa-rtl.md business-time rule). */
export function formatAdminPostInstant(iso: string, locale: AppLocale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE_TAG[locale], {
    timeZone: JAKARTA_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Uppercase locale codes for the availability indicator, e.g. "ID · EN". */
export function formatAdminPostLocales(locales: readonly string[]): string {
  return locales.map((locale) => locale.toUpperCase()).join(" · ");
}
