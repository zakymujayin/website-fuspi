import {sanitizeRichTextHtml} from "@/lib/security/sanitize";

/**
 * Re-sanitizes stored `translation.value.content` immediately before render
 * (manifest data requirement 4). Fails closed to `null` instead of throwing,
 * so callers can render the translated unavailable state.
 */
export function sanitizeStoredContentOrNull(rawHtml: string): string | null {
  try {
    return sanitizeRichTextHtml(rawHtml);
  } catch {
    return null;
  }
}
