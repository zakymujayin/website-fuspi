/** Every failure code the frozen `AdminPostTransportFailureCodeSchema` can return. */
export const POST_EDITOR_FAILURE_CODES = [
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "VERSION_CONFLICT",
  "INVALID_STATE",
  "SLUG_CONFLICT",
  "MEDIA_INVALID",
  "UNAVAILABLE",
] as const;

export type PostEditorFailureCode = (typeof POST_EDITOR_FAILURE_CODES)[number];

/**
 * Maps a transport failure to a translation key. Anything unrecognised — including a future code
 * added to the contract — collapses to the generic message, so a raw code can never surface in the
 * UI. `SLUG_CONFLICT` is attached to the slug field; the rest are form-level.
 */
export function failureMessageKey(code: string): string {
  return (POST_EDITOR_FAILURE_CODES as readonly string[]).includes(code)
    ? `error.${code}`
    : "error.UNAVAILABLE";
}

/** Codes that belong beside a specific control rather than in the form-level alert. */
export const FIELD_SCOPED_FAILURES: Partial<Record<PostEditorFailureCode, string>> = {
  SLUG_CONFLICT: "slug",
};

export function isFailureCode(value: unknown): value is PostEditorFailureCode {
  return typeof value === "string"
    && (POST_EDITOR_FAILURE_CODES as readonly string[]).includes(value);
}
