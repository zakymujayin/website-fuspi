import type { AppLocale } from "@/i18n/routing";
import {formatDateTimeDdMmYyyy} from "@/lib/format/date";

/** Intl locale tags for date/number formatting per active site locale (mirrors docs/12-multibahasa-rtl.md). */
const INTL_LOCALE_TAG: Record<AppLocale, string> = {
  id: "id-ID",
  en: "en-GB",
  ar: "ar",
};

const BYTE_UNITS = ["B", "KB", "MB", "GB"] as const;
const BYTE_STEP = 1024;

/** Human-readable file size using binary (1024) steps, formatted per locale. */
export function formatAdminMediaBytes(bytes: number, locale: AppLocale): string {
  const tag = INTL_LOCALE_TAG[locale];
  if (bytes < BYTE_STEP) {
    return `${new Intl.NumberFormat(tag).format(bytes)} ${BYTE_UNITS[0]}`;
  }
  let value = bytes / BYTE_STEP;
  let unitIndex = 1;
  while (value >= BYTE_STEP && unitIndex < BYTE_UNITS.length - 1) {
    value /= BYTE_STEP;
    unitIndex += 1;
  }
  const digits = Number.isInteger(value) ? 0 : value < 10 ? 1 : 0;
  const formatted = new Intl.NumberFormat(tag, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${formatted} ${BYTE_UNITS[unitIndex]}`;
}

/** Pixel dimensions formatted per locale, e.g. "1200×800". */
export function formatAdminMediaDimensions(width: number, height: number, locale: AppLocale): string {
  const formatter = new Intl.NumberFormat(INTL_LOCALE_TAG[locale]);
  return `${formatter.format(width)}×${formatter.format(height)}`;
}

/** Asia/Jakarta creation date and time (docs/12-multibahasa-rtl.md business-time rule; manifest data requirement 3). */
export function formatAdminMediaCreatedAt(iso: string, _locale: AppLocale): string {
  void _locale;
  return formatDateTimeDdMmYyyy(iso);
}
