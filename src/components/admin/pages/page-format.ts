import type { AppLocale } from "@/i18n/routing";
import {formatDateTimeDdMmYyyy} from "@/lib/format/date";

/** Asia/Jakarta date and time (docs/12-multibahasa-rtl.md business-time rule). */
export function formatAdminPageInstant(iso: string, _locale: AppLocale): string {
  void _locale;
  return formatDateTimeDdMmYyyy(iso);
}

/** Ordinal position, formatted for the active locale so Arabic digits follow the locale. */
export function formatAdminPageOrder(order: number, locale: AppLocale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en-GB").format(order);
}
