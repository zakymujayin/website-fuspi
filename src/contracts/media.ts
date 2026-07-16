import {z} from "zod";

import {
  Sha256ChecksumSchema,
  StorageKeySchema,
  UploadPolicySchema,
} from "@/contracts/storage";

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/;
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export const MediaIdSchema = z.string().trim().regex(SAFE_IDENTIFIER_PATTERN);

const MediaAltSchema = z.string().trim().max(500)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid media alternative text.");

function validateAccessibility(
  value: {alt: string; isDecorative: boolean},
  context: z.RefinementCtx,
) {
  if (value.isDecorative && value.alt !== "") {
    context.addIssue({
      code: "custom",
      path: ["alt"],
      message: "Decorative media must use an empty alternative text.",
    });
  }
  if (!value.isDecorative && value.alt.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["alt"],
      message: "Informative media requires alternative text.",
    });
  }
}

export const MediaUploadIntentSchema = z.object({
  policy: UploadPolicySchema.extract(["CMS_IMAGE", "PUBLIC_PDF"]),
  alt: MediaAltSchema,
  isDecorative: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.policy === "CMS_IMAGE") {
    validateAccessibility(value, context);
  } else if (value.alt !== "" || value.isDecorative) {
    context.addIssue({code: "custom", message: "Public PDF accessibility metadata is invalid."});
  }
});

export const MediaValidatedRecordInputSchema = z.object({
  policy: UploadPolicySchema.extract(["CMS_IMAGE", "PUBLIC_PDF"]),
  storageClass: z.literal("PUBLIC"),
  storageKey: StorageKeySchema,
  originalName: z.string().trim().min(1).max(120)
    .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid original filename."),
  mimeType: z.enum(["image/webp", "application/pdf"]),
  size: z.number().int().positive().max(20_971_520),
  checksumSha256: Sha256ChecksumSchema,
  width: z.number().int().positive().max(1_600).nullable(),
  height: z.number().int().positive().max(1_600).nullable(),
  alt: MediaAltSchema,
  isDecorative: z.boolean(),
}).strict().superRefine((value, context) => {
  const isImage = value.policy === "CMS_IMAGE";
  if (isImage) {
    validateAccessibility(value, context);
  } else if (value.alt !== "" || value.isDecorative) {
    context.addIssue({code: "custom", message: "Public PDF accessibility metadata is invalid."});
  }
  if (isImage && (
    value.mimeType !== "image/webp"
    || !value.storageKey.endsWith(".webp")
    || value.size > 5_242_880
    || value.width === null
    || value.height === null
  )) {
    context.addIssue({code: "custom", message: "Invalid CMS image metadata."});
  }
  if (!isImage && (
    value.mimeType !== "application/pdf"
    || !value.storageKey.endsWith(".pdf")
    || value.width !== null
    || value.height !== null
  )) {
    context.addIssue({code: "custom", message: "Invalid public PDF metadata."});
  }
});

export const TrustedMediaActorScopeSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("ADMIN"),
    userId: MediaIdSchema,
    ownership: z.literal("ANY"),
  }).strict(),
  z.object({
    role: z.literal("EDITOR"),
    userId: MediaIdSchema,
    ownership: z.literal("OWN"),
  }).strict(),
]);

export const MediaListQuerySchema = z.object({
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(48).default(24),
  kind: z.enum(["ALL", "IMAGE", "PDF"]).default("ALL"),
}).strict();

export const MediaDeleteInputSchema = z.object({
  mediaId: MediaIdSchema,
}).strict();

export const MediaMutationFailureCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "MEDIA_IN_USE",
  "DATABASE_WRITE_FAILED",
  "STORAGE_COMMIT_FAILED",
  "INTERNAL_ERROR",
]);

export const MediaPersistenceResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    mediaId: MediaIdSchema,
    storageState: z.literal("COMMITTED"),
  }).strict(),
  z.object({
    ok: z.literal(false),
    code: MediaMutationFailureCodeSchema,
    storageState: z.enum(["NOT_STAGED", "DISCARDED"]),
  }).strict(),
]);

const SafePublicMediaUrlSchema = z.string().min(1).max(2_048).refine((value) => {
  if (UNSAFE_TEXT_PATTERN.test(value) || value.includes("\\")) return false;
  try {
    const relative = value.startsWith("/") && !value.startsWith("//");
    const url = new URL(value, "https://contract.invalid");
    const uploadMarker = "/uploads/";
    const uploadIndex = url.pathname.lastIndexOf(uploadMarker);
    const storageKey = uploadIndex >= 0
      ? url.pathname.slice(uploadIndex + uploadMarker.length)
      : "";
    return (relative || url.protocol === "https:")
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && StorageKeySchema.safeParse(storageKey).success;
  } catch {
    return false;
  }
}, "Invalid public media URL.");

export const PublicMediaViewSchema = z.object({
  id: MediaIdSchema,
  url: SafePublicMediaUrlSchema,
  mimeType: z.enum(["image/webp", "application/pdf"]),
  size: z.number().int().positive().max(20_971_520),
  alt: MediaAltSchema,
  isDecorative: z.boolean(),
  width: z.number().int().positive().max(1_600).nullable(),
  height: z.number().int().positive().max(1_600).nullable(),
}).strict().superRefine((value, context) => {
  if (value.mimeType === "image/webp") {
    validateAccessibility(value, context);
    if (value.width === null || value.height === null) {
      context.addIssue({code: "custom", message: "Public image dimensions are required."});
    }
  } else if (
    value.width !== null
    || value.height !== null
    || value.alt !== ""
    || value.isDecorative
  ) {
    context.addIssue({code: "custom", message: "Public PDF metadata is invalid."});
  }
});

export type MediaUploadIntent = z.infer<typeof MediaUploadIntentSchema>;
export type MediaValidatedRecordInput = z.infer<typeof MediaValidatedRecordInputSchema>;
export type TrustedMediaActorScope = z.infer<typeof TrustedMediaActorScopeSchema>;
export type MediaListQuery = z.input<typeof MediaListQuerySchema>;
export type MediaDeleteInput = z.infer<typeof MediaDeleteInputSchema>;
export type MediaMutationFailureCode = z.infer<typeof MediaMutationFailureCodeSchema>;
export type MediaPersistenceResult = z.infer<typeof MediaPersistenceResultSchema>;
export type PublicMediaView = z.infer<typeof PublicMediaViewSchema>;
