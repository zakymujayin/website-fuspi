import {z} from "zod";

import {
  MediaDeleteInputSchema,
  MediaIdSchema,
  MediaListQuerySchema,
  MediaPersistenceResultSchema,
  MediaUploadIntentSchema,
  MediaValidatedRecordInputSchema,
  PublicMediaViewSchema,
  type MediaMutationFailureCode,
  type MediaPersistenceResult,
} from "@/contracts/media";

export const ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT = 20;
export const ADMIN_MEDIA_PDF_UPLOAD_LIMIT = 1;

const SAFE_TEXT_PATTERN = /^[^\u0000-\u001f\u007f-\u009f]*$/u;
const SafeUploaderNameSchema = z.string().trim().min(1).max(191).refine(
  (value) => SAFE_TEXT_PATTERN.test(value),
  "Invalid uploader label.",
);
const SafeOriginalNameSchema = MediaValidatedRecordInputSchema.shape.originalName.refine(
  (value) => value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\"),
  "Invalid public original filename.",
);

/** Canonical picker query. Uploader/ownership scope is always added from the server session. */
export const AdminMediaListQuerySchema = MediaListQuerySchema;

const RawAdminMediaListQuerySchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.string().regex(/^(?:[1-9]|[1-3]\d|4[0-8])$/u).optional(),
  kind: z.enum(["ALL", "IMAGE", "PDF"]).optional(),
}).strict();

/** Arrays from repeated URL parameters and all unknown selectors are rejected. */
export const AdminMediaListSearchParamsSchema = RawAdminMediaListQuerySchema.transform((value) =>
  AdminMediaListQuerySchema.parse({
    page: value.page ? Number(value.page) : 1,
    pageSize: value.pageSize ? Number(value.pageSize) : 24,
    kind: value.kind ?? "ALL",
  }));

export const AdminMediaItemSchema = PublicMediaViewSchema.safeExtend({
  originalName: SafeOriginalNameSchema,
  createdAt: z.iso.datetime({offset: true}),
  uploaderName: SafeUploaderNameSchema.nullable(),
});

export const AdminMediaListResultSchema = z.object({
  items: z.array(AdminMediaItemSchema).max(48),
  page: z.number().int().min(1).max(10_000),
  pageSize: z.number().int().min(1).max(48),
  total: z.number().int().min(0),
  hasNextPage: z.boolean(),
}).strict().superRefine((value, context) => {
  const identifiers = value.items.map((item) => item.id);
  if (new Set(identifiers).size !== identifiers.length) {
    context.addIssue({code: "custom", path: ["items"], message: "Duplicate Media item."});
  }
  if (value.items.length > value.pageSize || value.total < value.items.length) {
    context.addIssue({code: "custom", path: ["items"], message: "Invalid Media page bounds."});
  }
  if (value.hasNextPage !== value.page * value.pageSize < value.total) {
    context.addIssue({code: "custom", path: ["hasNextPage"], message: "Invalid Media page state."});
  }
});

const CmsImageUploadIntentSchema = MediaUploadIntentSchema.safeExtend({
  policy: z.literal("CMS_IMAGE"),
});
const PublicPdfUploadIntentSchema = MediaUploadIntentSchema.safeExtend({
  policy: z.literal("PUBLIC_PDF"),
});

export const AdminMediaUploadMetadataSchema = z.discriminatedUnion("policy", [
  z.object({
    policy: z.literal("CMS_IMAGE"),
    uploadCount: z.number().int().min(1).max(ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT),
    intents: z.array(CmsImageUploadIntentSchema).min(1).max(ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT),
  }).strict().superRefine((value, context) => {
    if (value.uploadCount !== value.intents.length) {
      context.addIssue({code: "custom", path: ["uploadCount"], message: "Upload count mismatch."});
    }
  }),
  z.object({
    policy: z.literal("PUBLIC_PDF"),
    uploadCount: z.literal(ADMIN_MEDIA_PDF_UPLOAD_LIMIT),
    intents: z.array(PublicPdfUploadIntentSchema).length(ADMIN_MEDIA_PDF_UPLOAD_LIMIT),
  }).strict(),
]);

const AdminMediaAltSchema = MediaUploadIntentSchema.shape.alt;

export const AdminMediaMetadataUpdatePayloadSchema = z.object({
  mediaId: MediaIdSchema,
  alt: AdminMediaAltSchema,
  isDecorative: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.isDecorative && value.alt !== "") {
    context.addIssue({
      code: "custom",
      path: ["alt"],
      message: "Decorative Media must use an empty alternative text.",
    });
  }
  if (!value.isDecorative && value.alt.length === 0) {
    context.addIssue({
      code: "custom",
      path: ["alt"],
      message: "Informative Media requires alternative text.",
    });
  }
});

export const AdminMediaDeletePayloadSchema = MediaDeleteInputSchema;

export const AdminMediaTransportCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("UPDATE_METADATA"),
    payload: AdminMediaMetadataUpdatePayloadSchema,
  }).strict(),
  z.object({
    action: z.literal("DELETE"),
    payload: AdminMediaDeletePayloadSchema,
  }).strict(),
]);

export const AdminMediaTransportFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "MEDIA_IN_USE",
  "UPLOAD_FAILED",
  "UNAVAILABLE",
]);

export const AdminMediaMutationResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    mediaId: MediaIdSchema,
  }).strict(),
  z.object({
    ok: z.literal(false),
    code: AdminMediaTransportFailureCodeSchema,
  }).strict(),
]);

const MEDIA_FAILURE_MAPPING = {
  UNAUTHENTICATED: "SESSION_INVALID",
  FORBIDDEN: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  MEDIA_IN_USE: "MEDIA_IN_USE",
  DATABASE_WRITE_FAILED: "UNAVAILABLE",
  STORAGE_COMMIT_FAILED: "UPLOAD_FAILED",
  INTERNAL_ERROR: "UNAVAILABLE",
} as const satisfies Record<
  MediaMutationFailureCode,
  z.infer<typeof AdminMediaTransportFailureCodeSchema>
>;

export function toAdminMediaMutationResponse(rawResult: unknown): AdminMediaMutationResponse {
  const result = MediaPersistenceResultSchema.parse(rawResult) as MediaPersistenceResult;
  if (result.ok) {
    return AdminMediaMutationResponseSchema.parse({ok: true, mediaId: result.mediaId});
  }
  return AdminMediaMutationResponseSchema.parse({
    ok: false,
    code: MEDIA_FAILURE_MAPPING[result.code],
  });
}

export const AdminMediaPersistenceInvariantDispositionSchema = z.object({
  publicResponse: z.object({
    ok: z.literal(false),
    code: z.literal("UNAVAILABLE"),
  }).strict(),
  operationalAlert: z.object({
    code: z.literal("MEDIA_PERSISTENCE_INVARIANT"),
    severity: z.literal("CRITICAL"),
  }).strict(),
}).strict();

/** Call only after catching the server-only MediaPersistenceInvariantError class. */
export function adminMediaPersistenceInvariantDisposition():
z.infer<typeof AdminMediaPersistenceInvariantDispositionSchema> {
  return AdminMediaPersistenceInvariantDispositionSchema.parse({
    publicResponse: {ok: false, code: "UNAVAILABLE"},
    operationalAlert: {code: "MEDIA_PERSISTENCE_INVARIANT", severity: "CRITICAL"},
  });
}

export type AdminMediaListQuery = z.infer<typeof AdminMediaListQuerySchema>;
export type AdminMediaItem = z.infer<typeof AdminMediaItemSchema>;
export type AdminMediaListResult = z.infer<typeof AdminMediaListResultSchema>;
export type AdminMediaUploadMetadata = z.infer<typeof AdminMediaUploadMetadataSchema>;
export type AdminMediaTransportCommand = z.infer<typeof AdminMediaTransportCommandSchema>;
export type AdminMediaMutationResponse = z.infer<typeof AdminMediaMutationResponseSchema>;
