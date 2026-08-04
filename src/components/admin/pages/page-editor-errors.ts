export const PAGE_EDITOR_FAILURE_CODES = [
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "VERSION_CONFLICT",
  "INVALID_STATE",
  "SLUG_CONFLICT",
  "HIERARCHY_CYCLE",
  "MEDIA_INVALID",
  "PARENT_INVALID",
  "UNAVAILABLE",
] as const;

export type PageEditorFailureCode = (typeof PAGE_EDITOR_FAILURE_CODES)[number];

export function failureMessageKey(code: string): string {
  return (PAGE_EDITOR_FAILURE_CODES as readonly string[]).includes(code)
    ? `error.${code}`
    : "error.UNAVAILABLE";
}

export const FIELD_SCOPED_FAILURES: Partial<Record<PageEditorFailureCode, string>> = {
  SLUG_CONFLICT: "slug",
  HIERARCHY_CYCLE: "parentId",
  PARENT_INVALID: "parentId",
  MEDIA_INVALID: "heroMediaId",
};

export function isFailureCode(value: unknown): value is PageEditorFailureCode {
  return typeof value === "string"
    && (PAGE_EDITOR_FAILURE_CODES as readonly string[]).includes(value);
}
