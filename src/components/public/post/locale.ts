import {routing} from "@/i18n/routing";
import type {AppLocale} from "@/i18n/routing";

/** Intl locale tags for date/number formatting per active site locale. */
export const INTL_LOCALE_TAG: Record<AppLocale, string> = {
  id: "id-ID",
  en: "en-US",
  ar: "ar",
};

/** Narrows an untyped route `locale` param, defaulting to `id` (defensive; the locale layout already 404s on truly invalid values). */
export function resolveAppLocale(locale: string): AppLocale {
  return (routing.locales as readonly string[]).includes(locale)
    ? (locale as AppLocale)
    : routing.defaultLocale;
}
