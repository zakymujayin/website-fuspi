import type {AppLocale} from "@/i18n/routing";

import {INTL_LOCALE_TAG} from "./locale";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const WORDS_PER_MINUTE = 200;
const TAG_PATTERN = /<[^>]*>/g;
const WHITESPACE_PATTERN = /\s+/g;

/** Publication date formatted in Asia/Jakarta business time (docs/12-multibahasa-rtl.md, docs/19). */
export function formatJakartaPublishedDate(date: Date, locale: AppLocale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE_TAG[locale], {
    timeZone: JAKARTA_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** ~200 words/minute estimate from sanitized article HTML (docs/19-C). */
export function estimateReadingMinutes(sanitizedHtml: string): number {
  const text = sanitizedHtml.replace(TAG_PATTERN, " ").replace(WHITESPACE_PATTERN, " ").trim();
  if (text.length === 0) return 1;
  const wordCount = text.split(" ").length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/**
 * Presentational de-hyphenation of the frozen `categorySlug` value — no name
 * lookup, no invented label. The contract does not provide a translated
 * category name (manifest: "do not fabricate ... category names").
 */
export function humanizeCategorySlug(slug: string): string {
  return slug.replace(/-/g, " ");
}
