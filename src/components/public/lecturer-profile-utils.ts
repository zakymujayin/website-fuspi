/** Splits a free-text expertise field ("Tafsir, Hadis; Ulumul Qur'an") into
 *  trimmed, non-empty tags for chip rendering on the lecturer profile page. */
export function splitExpertiseTags(expertise: string | null): string[] {
  if (!expertise) return [];
  return expertise
    .split(/[,;]/u)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}
