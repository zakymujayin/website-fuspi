import {z} from "zod";

export const UploadPolicySchema = z.enum([
  "CMS_IMAGE", "PUBLIC_PDF", "TICKET_ATTACHMENT", "BOOKING_DOCUMENT",
]);
export const WritableStorageClassSchema = z.enum(["PUBLIC", "PRIVATE"]);
export const StorageClassSchema = z.enum(["PUBLIC", "PRIVATE", "PPKS_PRIVATE"]);
export const DetectedUploadMimeSchema = z.enum([
  "image/jpeg", "image/png", "image/webp", "application/pdf",
]);
export const StorageKeySchema = z.string().regex(
  /^\d{4}\/(?:0[1-9]|1[0-2])\/[a-f0-9]{64}\.(?:webp|pdf)$/,
  "Invalid storage key.",
);
export const EncryptedPpksStorageKeySchema = z.string().regex(
  /^\d{4}\/(?:0[1-9]|1[0-2])\/[a-f0-9]{64}\.enc$/,
  "Invalid protected storage key.",
);
export const AnyStorageKeySchema = z.union([StorageKeySchema, EncryptedPpksStorageKeySchema]);
export const Sha256ChecksumSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const ValidatedUploadSchema = z.object({
  storageClass: WritableStorageClassSchema,
  storageKey: StorageKeySchema,
  originalName: z.string().min(1).max(120),
  mimeType: z.enum(["image/webp", "application/pdf"]),
  size: z.number().int().positive(),
  checksumSha256: Sha256ChecksumSchema,
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  bytes: z.instanceof(Uint8Array),
}).strict();

export const ValidatedPpksAttachmentSchema = z.object({
  storageClass: z.literal("PPKS_PRIVATE"),
  storageKey: EncryptedPpksStorageKeySchema,
  originalName: z.enum(["lampiran.webp", "lampiran.pdf"]),
  mimeType: z.enum(["image/webp", "application/pdf"]),
  size: z.number().int().positive().max(5_242_880),
  checksumSha256: Sha256ChecksumSchema,
  bytes: z.instanceof(Uint8Array),
}).strict();

const CanonicalNonceSchema = z.string().refine((value) => {
  const decoded = Buffer.from(value, "base64url");
  return decoded.byteLength === 12 && decoded.toString("base64url") === value;
});
const CanonicalTagSchema = z.string().refine((value) => {
  const decoded = Buffer.from(value, "base64url");
  return decoded.byteLength === 16 && decoded.toString("base64url") === value;
});

export const PpksAttachmentCryptoMetadataSchema = z.object({
  storageKey: EncryptedPpksStorageKeySchema,
  storageClass: z.literal("PPKS_PRIVATE"),
  originalName: z.enum(["lampiran.webp", "lampiran.pdf"]),
  mimeType: z.enum(["image/webp", "application/pdf"]),
  size: z.number().int().positive().max(5_242_880),
  checksumSha256: Sha256ChecksumSchema,
  encryptionNonce: CanonicalNonceSchema,
  encryptionTag: CanonicalTagSchema,
  keyVersion: z.number().int().positive(),
}).strict();

export type UploadPolicy = z.infer<typeof UploadPolicySchema>;
export type StorageClass = z.infer<typeof StorageClassSchema>;
export type WritableStorageClass = z.infer<typeof WritableStorageClassSchema>;
export type ValidatedUpload = z.infer<typeof ValidatedUploadSchema>;
export type ValidatedPpksAttachment = z.infer<typeof ValidatedPpksAttachmentSchema>;
export type PpksAttachmentCryptoMetadata = z.infer<typeof PpksAttachmentCryptoMetadataSchema>;
