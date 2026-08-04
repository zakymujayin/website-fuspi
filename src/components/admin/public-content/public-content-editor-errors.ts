export const PUBLIC_CONTENT_FAILURE_CODES = [
  "SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "VALIDATION_FAILED", "NOT_FOUND",
  "VERSION_CONFLICT", "SLUG_CONFLICT", "INVALID_STATE", "MEDIA_INVALID", "DOCUMENT_INVALID",
  "RELATION_INVALID", "IN_USE", "UNAVAILABLE",
] as const;

export type PublicContentFailureCode = (typeof PUBLIC_CONTENT_FAILURE_CODES)[number];

export function isPublicContentFailureCode(value: unknown): value is PublicContentFailureCode {
  return typeof value === "string" && (PUBLIC_CONTENT_FAILURE_CODES as readonly string[]).includes(value);
}

type FailureMessageKey = `error.${PublicContentFailureCode}`;

export function publicContentFailureMessageKey(code: string): FailureMessageKey {
  const safe = isPublicContentFailureCode(code) ? code : "UNAVAILABLE";
  return `error.${safe}` as FailureMessageKey;
}
