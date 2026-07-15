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

export type UploadPolicy = z.infer<typeof UploadPolicySchema>;
export type StorageClass = z.infer<typeof StorageClassSchema>;
export type WritableStorageClass = z.infer<typeof WritableStorageClassSchema>;
export type ValidatedUpload = z.infer<typeof ValidatedUploadSchema>;
