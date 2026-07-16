import {routing} from "@/i18n/routing";
import type {AppLocale} from "@/i18n/routing";

export type LocaleAlternates = {
  canonical: string;
  languages: Record<string, string>;
};

function safeOrigin(siteOrigin: string | undefined): string {
  if (!siteOrigin) return "";
  try {
    return new URL(siteOrigin).origin;
  } catch {
    return "";
  }
}

/**
 * Canonical + ID/EN/AR + `x-default` hreflang alternates for a neutral,
 * locale-independent path such as `/berita` or `/berita/{slug}` (manifest
 * detail requirement 4, docs/12-G). Degrades to root-relative URLs when no
 * absolute site origin is configured, which browsers still resolve correctly.
 */
export function buildLocaleAlternates(
  path: string,
  currentLocale: AppLocale,
  siteOrigin: string | undefined,
): LocaleAlternates {
  const origin = safeOrigin(siteOrigin);
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
