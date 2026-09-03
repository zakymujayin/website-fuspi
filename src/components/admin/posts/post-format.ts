import type { AppLocale } from "@/i18n/routing";
import {formatDateTimeDdMmYyyy} from "@/lib/format/date";

/** Intl locale tags for date formatting per active site locale (mirrors docs/12-multibahasa-rtl.md). */
/** Asia/Jakarta date and time (docs/12-multibahasa-rtl.md business-time rule). */
export function formatAdminPostInstant(iso: string, _locale: AppLocale): string {
  void _locale;
  return formatDateTimeDdMmYyyy(iso);
}

/** Uppercase locale codes for the availability indicator, e.g. "ID · EN". */
export function formatAdminPostLocales(locales: readonly string[]): string {
  return locales.map((locale) => locale.toUpperCase()).join(" · ");
}
