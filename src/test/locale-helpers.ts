import { routing, type AppLocale } from "@/i18n/routing";

export const SUPPORTED_LOCALES = routing.locales as readonly string[];
export const DEFAULT_LOCALE = routing.defaultLocale;

export const RTL_LOCALES = new Set(["ar"]);
export const LTR_LOCALES = new Set(["id", "en"]);

export type LocaleDirection = "rtl" | "ltr";

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale);
}

export function isLtrLocale(locale: string): boolean {
  return !isRtlLocale(locale);
}

export function getLocaleDirection(locale: string): LocaleDirection {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

export function getHtmlAttributes(locale: string): { lang: string; dir: LocaleDirection } {
  return {
    lang: locale,
    dir: getLocaleDirection(locale),
  };
}

export function localePermutations(): readonly AppLocale[] {
  return SUPPORTED_LOCALES as readonly AppLocale[];
}

export function assertValidLocale(locale: string): asserts locale is AppLocale {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    throw new Error(`Invalid locale: ${locale}. Expected one of: ${SUPPORTED_LOCALES.join(", ")}`);
  }
}

export function generateLocalePairs(): Array<[AppLocale, AppLocale]> {
  const locales = SUPPORTED_LOCALES as unknown as AppLocale[];
  const pairs: Array<[AppLocale, AppLocale]> = [];
  for (const from of locales) {
    for (const to of locales) {
      pairs.push([from, to]);
    }
  }
  return pairs;
}

export function withAllLocales<T>(fn: (locale: AppLocale) => T): Map<AppLocale, T> {
  const results = new Map<AppLocale, T>();
  for (const locale of SUPPORTED_LOCALES as unknown as AppLocale[]) {
    results.set(locale, fn(locale));
  }
  return results;
}
