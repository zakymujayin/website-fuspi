import {z} from "zod";

import {PublicMediaViewSchema} from "@/contracts/media";
import {LocaleSchema} from "@/contracts/platform";
import {
  PostAutosaveInputSchema,
  PostCreateInputSchema,
  PostIdSchema,
  PostMutationResultSchema,
  PostPublicationMutationInputSchema,
  PostSlugSchema,
  PostStatusSchema,
  PostTranslationsInputSchema,
  PostUpdateInputSchema,
  type PostAutosaveInput,
  type PostCreateInput,
  type PostMutationFailureCode,
  type PostMutationResult,
  type PostUpdateInput,
} from "@/contracts/post";

export const ADMIN_POST_AUTOSAVE_INTERVAL_MS = 30_000;

const MAX_VERSION = 2_147_483_646;
const SAFE_TEXT_PATTERN = /^[^\u0000-\u001f\u007f-\u009f]*$/u;
const SearchTextSchema = z.string().trim().max(100).refine(
  (value) => SAFE_TEXT_PATTERN.test(value),
  "Invalid admin search text.",
);
const SafeLabelSchema = z.string().trim().min(1).max(255).refine(
  (value) => SAFE_TEXT_PATTERN.test(value),
  "Invalid admin label.",
);
const SafePersonNameSchema = z.string().trim().min(1).max(191).refine(
  (value) => SAFE_TEXT_PATTERN.test(value),
  "Invalid person label.",
);
const NullableInstantSchema = z.union([z.iso.datetime({offset: true}), z.null()]);

export const AdminPostSortSchema = z.enum([
  "UPDATED_DESC",
  "PUBLISHED_DESC",
  "TITLE_ASC",
]);

/** Canonical server-side query after raw URL search parameters have been normalized. */
export const AdminPostListQuerySchema = z.object({
  page: z.number().int().min(1).max(10_000),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
  type: z.enum(["BERITA", "PENGUMUMAN", "KOLOM", "ALL"]).default("BERITA"),
  status: z.union([z.literal("ALL"), PostStatusSchema]),
  search: SearchTextSchema,
  sort: AdminPostSortSchema,
}).strict();

const RawAdminPostListQuerySchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  type: z.enum(["BERITA", "PENGUMUMAN", "KOLOM", "ALL"]).optional(),
  status: z.enum(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  search: SearchTextSchema.optional(),
  sort: AdminPostSortSchema.optional(),
}).strict();

/**
 * Raw query contract. Loaders must pass an object whose values are singular strings or undefined.
 * Repeated parameters represented as arrays, arbitrary selectors, and unknown keys fail closed.
 */
export const AdminPostListSearchParamsSchema = RawAdminPostListQuerySchema.transform((value) =>
  AdminPostListQuerySchema.parse({
    page: value.page ? Number(value.page) : 1,
    pageSize: value.pageSize ? Number(value.pageSize) : 20,
    type: value.type ?? "BERITA",
    status: value.status ?? "ALL",
    search: value.search ?? "",
    sort: value.sort ?? "UPDATED_DESC",
  }));

export const AdminPostPublicationStateSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "SCHEDULED",
  "ARCHIVED",
]);

export const AdminPostCapabilitiesSchema = z.object({
  update: z.boolean(),
  publish: z.boolean(),
  delete: z.boolean(),
}).strict();

const AdminPostCategorySchema = z.object({
  id: PostIdSchema,
  label: SafeLabelSchema,
}).strict();

const AdminPostAuthorSchema = z.object({
  name: SafePersonNameSchema,
}).strict();

const AvailableLocalesSchema = z.array(LocaleSchema).min(1).max(3)
  .superRefine((locales, context) => {
    if (locales[0] !== "id" || new Set(locales).size !== locales.length) {
      context.addIssue({
        code: "custom",
        message: "Available translations must contain unique locales beginning with Indonesian.",
      });
    }
  });

function validatePublicationState(
  value: {
    status: z.infer<typeof PostStatusSchema>;
    publicationState: z.infer<typeof AdminPostPublicationStateSchema>;
    publishedAt: string | null;
  },
  context: z.RefinementCtx,
) {
  const allowedState = (
    (value.status === "DRAFT" && value.publicationState === "DRAFT")
    || (value.status === "ARCHIVED" && value.publicationState === "ARCHIVED")
    || (
      value.status === "PUBLISHED"
      && (value.publicationState === "PUBLISHED" || value.publicationState === "SCHEDULED")
    )
  );
  if (!allowedState) {
    context.addIssue({
      code: "custom",
      path: ["publicationState"],
      message: "Publication state does not match Post status.",
    });
  }
  if (value.status === "DRAFT" && value.publishedAt !== null) {
    context.addIssue({
      code: "custom",
      path: ["publishedAt"],
      message: "Draft Post cannot have a publication instant.",
    });
  }
  if (value.status === "PUBLISHED" && value.publishedAt === null) {
    context.addIssue({
      code: "custom",
      path: ["publishedAt"],
      message: "Published Post requires a publication instant.",
    });
  }
}

export const AdminPostSummarySchema = z.object({
  id: PostIdSchema,
  slug: PostSlugSchema,
  title: SafeLabelSchema,
  titleLocale: z.literal("id"),
  availableLocales: AvailableLocalesSchema,
  status: PostStatusSchema,
  publicationState: AdminPostPublicationStateSchema,
  version: z.number().int().positive().max(2_147_483_647),
  isFeatured: z.boolean(),
  publishedAt: NullableInstantSchema,
  updatedAt: z.iso.datetime({offset: true}),
  category: AdminPostCategorySchema.nullable(),
  author: AdminPostAuthorSchema.nullable(),
  capabilities: AdminPostCapabilitiesSchema,
}).strict().superRefine(validatePublicationState);

export const AdminPostListResultSchema = z.object({
  items: z.array(AdminPostSummarySchema).max(50),
  page: z.number().int().min(1).max(10_000),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
  type: z.enum(["BERITA", "PENGUMUMAN", "KOLOM", "ALL"]).default("BERITA"),
  total: z.number().int().min(0),
  hasNextPage: z.boolean(),
}).strict().superRefine((value, context) => {
  const identifiers = value.items.map((item) => item.id);
  if (new Set(identifiers).size !== identifiers.length) {
    context.addIssue({code: "custom", path: ["items"], message: "Duplicate Post item."});
  }
  if (value.items.length > value.pageSize || value.total < value.items.length) {
    context.addIssue({code: "custom", path: ["items"], message: "Invalid Post page bounds."});
  }
  if (value.hasNextPage !== value.page * value.pageSize < value.total) {
    context.addIssue({code: "custom", path: ["hasNextPage"], message: "Invalid Post page state."});
  }
});

export const AdminPostEditorViewSchema = z.object({
  id: PostIdSchema,
  type: z.literal("BERITA"),
  columnType: z.null(),
  slug: PostSlugSchema,
  isFeatured: z.boolean(),
  categoryId: PostIdSchema.nullable(),
  coverMediaId: PostIdSchema.nullable(),
  tagIds: z.array(PostIdSchema).max(30)
    .refine((values) => new Set(values).size === values.length, "Duplicate tag identifier."),
  translations: PostTranslationsInputSchema,
  status: PostStatusSchema,
  publicationState: AdminPostPublicationStateSchema,
  version: z.number().int().positive().max(2_147_483_647),
  publishedAt: NullableInstantSchema,
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
  cover: PublicMediaViewSchema.nullable(),
  capabilities: AdminPostCapabilitiesSchema,
}).strict().superRefine((value, context) => {
  validatePublicationState(value, context);
  if (value.cover === null && value.coverMediaId !== null) {
    context.addIssue({code: "custom", path: ["cover"], message: "Missing safe cover view."});
  }
  if (value.cover !== null && value.cover.id !== value.coverMediaId) {
    context.addIssue({code: "custom", path: ["cover"], message: "Mismatched cover view."});
  }
});

const AdminPostMutableFieldsShape = {
  slug: PostCreateInputSchema.shape.slug,
  isFeatured: PostCreateInputSchema.shape.isFeatured,
  categoryId: PostCreateInputSchema.shape.categoryId,
  coverMediaId: PostCreateInputSchema.shape.coverMediaId,
  tagIds: PostCreateInputSchema.shape.tagIds,
  translations: PostCreateInputSchema.shape.translations,
} as const;

export const AdminPostCreatePayloadSchema = z.object({
  ...AdminPostMutableFieldsShape,
  publication: PostCreateInputSchema.shape.publication,
}).strict();
export const AdminPostUpdatePayloadSchema = z.object({
  postId: PostUpdateInputSchema.shape.postId,
  expectedVersion: PostUpdateInputSchema.shape.expectedVersion,
  ...AdminPostMutableFieldsShape,
}).strict();
export const AdminPostAutosavePayloadSchema = z.object({
  intent: PostAutosaveInputSchema.shape.intent,
  postId: PostAutosaveInputSchema.shape.postId,
  expectedVersion: PostAutosaveInputSchema.shape.expectedVersion,
  ...AdminPostMutableFieldsShape,
}).strict();

export const AdminPostDeletePayloadSchema = z.object({
  postId: PostIdSchema,
  expectedVersion: z.number().int().positive().max(MAX_VERSION),
}).strict();

export const AdminPostTransportCommandSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("CREATE"), payload: AdminPostCreatePayloadSchema}).strict(),
  z.object({action: z.literal("UPDATE"), payload: AdminPostUpdatePayloadSchema}).strict(),
  z.object({action: z.literal("AUTOSAVE"), payload: AdminPostAutosavePayloadSchema}).strict(),
  z.object({action: z.literal("PUBLICATION"), payload: PostPublicationMutationInputSchema}).strict(),
  z.object({action: z.literal("DELETE"), payload: AdminPostDeletePayloadSchema}).strict(),
]);

export const AdminPostTransportFailureCodeSchema = z.enum([
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
]);

export const AdminPostMutationResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    postId: PostIdSchema,
    version: z.number().int().positive().max(2_147_483_647),
    status: PostStatusSchema,
    publishedAt: NullableInstantSchema,
    updatedAt: z.iso.datetime({offset: true}),
  }).strict(),
  z.object({
    ok: z.literal(false),
    code: AdminPostTransportFailureCodeSchema,
  }).strict(),
]);

export function toBeritaCreateInput(
  value: z.infer<typeof AdminPostCreatePayloadSchema>,
): PostCreateInput {
  return PostCreateInputSchema.parse({...value, type: "BERITA", columnType: null});
}

export function toBeritaUpdateInput(
  value: z.infer<typeof AdminPostUpdatePayloadSchema>,
): PostUpdateInput {
  return PostUpdateInputSchema.parse({...value, type: "BERITA", columnType: null});
}

export function toBeritaAutosaveInput(
  value: z.infer<typeof AdminPostAutosavePayloadSchema>,
): PostAutosaveInput {
  return PostAutosaveInputSchema.parse({...value, type: "BERITA", columnType: null});
}

const POST_FAILURE_MAPPING = {
  UNAUTHENTICATED: "SESSION_INVALID",
  FORBIDDEN: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  INVALID_STATE: "INVALID_STATE",
  SLUG_CONFLICT: "SLUG_CONFLICT",
  MEDIA_NOT_FOUND: "MEDIA_INVALID",
  MEDIA_FORBIDDEN: "MEDIA_INVALID",
  INTERNAL_ERROR: "UNAVAILABLE",
} as const satisfies Record<
  PostMutationFailureCode,
  z.infer<typeof AdminPostTransportFailureCodeSchema>
>;

export function toAdminPostMutationResponse(rawResult: unknown): AdminPostMutationResponse {
  const result = PostMutationResultSchema.parse(rawResult) as PostMutationResult;
  if (result.ok) {
    return AdminPostMutationResponseSchema.parse({
      ...result,
      publishedAt: result.publishedAt?.toISOString() ?? null,
      updatedAt: result.updatedAt.toISOString(),
    });
  }

  return AdminPostMutationResponseSchema.parse({
    ok: false,
    code: POST_FAILURE_MAPPING[result.code],
  });
}

export type AdminPostListQuery = z.infer<typeof AdminPostListQuerySchema>;
export type AdminPostListResult = z.infer<typeof AdminPostListResultSchema>;
export type AdminPostEditorView = z.infer<typeof AdminPostEditorViewSchema>;
export type AdminPostTransportCommand = z.infer<typeof AdminPostTransportCommandSchema>;
export type AdminPostMutationResponse = z.infer<typeof AdminPostMutationResponseSchema>;
