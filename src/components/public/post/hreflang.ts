import {routing} from "@/i18n/routing";
import type {AppLocale} from "@/i18n/routing";

export type LocaleAlternates = {
  canonical: string;
  languages: Record<string, string>;
};

/**
 * Canonical + ID/EN/AR + `x-default` hreflang alternates for a neutral,
 * locale-independent path such as `/berita` or `/berita/{slug}` (manifest
 * detail requirement 4, docs/12-G). `siteOrigin` must already be validated
 * by `validateSiteOrigin` — pass `null` to degrade to root-relative URLs,
 * which browsers still resolve correctly.
 */
export function buildLocaleAlternates(
  path: string,
  currentLocale: AppLocale,
  siteOrigin: string | null,
): LocaleAlternates {
  const origin = siteOrigin ?? "";
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${origin}/${locale}${path}`;
  }
  languages["x-default"] = `${origin}/${routing.defaultLocale}${path}`;

  return {
    canonical: `${origin}/${currentLocale}${path}`,
    languages,
  };
}
