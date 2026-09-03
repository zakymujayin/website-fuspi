import {routing} from "@/i18n/routing";
import type {AppLocale} from "@/i18n/routing";

/** Intl locale tags for date/number formatting per active site locale. */
export const INTL_LOCALE_TAG: Record<AppLocale, string> = {
  id: "id-ID",
  en: "en-GB",
  ar: "ar",
};

/** Narrows an untyped route `locale` param, defaulting to `id` (defensive; the locale layout already 404s on truly invalid values). */
export function resolveAppLocale(locale: string): AppLocale {
  return (routing.locales as readonly string[]).includes(locale)
    ? (locale as AppLocale)
    : routing.defaultLocale;
}

/**
 * Real writing direction per resolved *content* locale — used to mark up a
 * translation region with its own `lang`/`dir`, independent of the page's
 * requested locale. Indonesian-fallback content on an Arabic page must keep
 * `lang="id" dir="ltr"`, never inherit the document's `dir="rtl"`.
 */
export const LOCALE_DIRECTION: Record<AppLocale, "ltr" | "rtl"> = {
  id: "ltr",
  en: "ltr",
  ar: "rtl",
};
