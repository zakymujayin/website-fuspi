import type {AppLocale} from "@/i18n/routing";
import {formatDateDdMmYyyy} from "@/lib/format/date";

const WORDS_PER_MINUTE = 200;
const TAG_PATTERN = /<[^>]*>/g;
const WHITESPACE_PATTERN = /\s+/g;

/** Publication date formatted as dd/mm/yyyy in Asia/Jakarta business time. */
export function formatJakartaPublishedDate(date: Date, _locale: AppLocale): string {
  void _locale;
  return formatDateDdMmYyyy(date);
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
