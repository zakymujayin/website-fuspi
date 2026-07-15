import {z} from "zod";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const LOWERCASE_SHA256_PATTERN = /^[a-f0-9]{64}$/;

function isCanonicalBase64Url(value: string, expectedBytes?: number): boolean {
  if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) {
    return false;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    return (expectedBytes === undefined || decoded.byteLength === expectedBytes)
      && decoded.toString("base64url") === value;
  } catch {
    return false;
  }
}

const CanonicalCiphertextSchema = z.string()
  .min(1)
  .max(1_398_102)
  .refine((value) => isCanonicalBase64Url(value), "Invalid protected payload.");

const CanonicalNonceSchema = z.string()
  .refine((value) => isCanonicalBase64Url(value, 12), "Invalid protected payload.");

const CanonicalAuthenticationTagSchema = z.string()
  .refine((value) => isCanonicalBase64Url(value, 16), "Invalid protected payload.");

export const AesGcmEnvelopeSchema = z.object({
  ciphertext: CanonicalCiphertextSchema,
  nonce: CanonicalNonceSchema,
  tag: CanonicalAuthenticationTagSchema,
  keyVersion: z.number().int().positive(),
}).strict();

export const ProtectedDataPurposeSchema = z.enum([
  "PPKS_TICKET",
  "PPKS_REPLY",
  "PPKS_ATTACHMENT",
  "SENSITIVE_OUTBOX",
  "PRIVACY_REQUEST",
]);

const ContextSegmentSchema = z.string()
  .trim()
  .min(1)
  .max(191)
  .refine((value) => !/[\u0000-\u001f\u007f-\u009f]/u.test(value), "Invalid protected data context.");

export const ProtectedDataContextSchema = z.object({
  purpose: ProtectedDataPurposeSchema,
  resourceId: ContextSegmentSchema,
  field: ContextSegmentSchema,
}).strict();

export const TrackingTokenPurposeSchema = z.enum([
  "TICKET",
  "BOOKING",
  "PRIVACY_REQUEST",
  "ACCESSIBILITY_REPORT",
]);

export const TrackingTokenSchema = z.string()
  .length(43)
  .refine((value) => isCanonicalBase64Url(value, 32), "Invalid tracking token.");

export const HmacSha256DigestSchema = z.string().regex(LOWERCASE_SHA256_PATTERN);

export type AesGcmEnvelope = z.infer<typeof AesGcmEnvelopeSchema>;
export type ProtectedDataContext = z.infer<typeof ProtectedDataContextSchema>;
export type TrackingTokenPurpose = z.infer<typeof TrackingTokenPurposeSchema>;
