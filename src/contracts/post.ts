import {z} from "zod";

import {
  ColumnType as PrismaColumnType,
  ContentStatus as PrismaContentStatus,
  PostType as PrismaPostType,
} from "@/generated/prisma/enums";
import {LocaleSchema} from "@/contracts/platform";
import {PublicMediaViewSchema} from "@/contracts/media";

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const MAX_VERSION = 2_147_483_646;

export const PostIdSchema = z.string().trim().regex(SAFE_IDENTIFIER_PATTERN);
export const PostTypeSchema = z.enum(PrismaPostType);
export const ColumnTypeSchema = z.enum(PrismaColumnType);
export const PostStatusSchema = z.enum(PrismaContentStatus);
export const PostSlugSchema = z.string().trim().min(1).max(191).regex(SLUG_PATTERN);
export const PostInstantSchema = z.iso.datetime({offset: true});

const ShortTextSchema = (maximum: number) => z.string().trim().min(1).max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid content text.");
const OptionalTextSchema = (maximum: number) => z.string().trim().max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid content text.")
  .nullable().optional();

export const PostTranslationInputSchema = z.object({
  title: ShortTextSchema(255),
  excerpt: OptionalTextSchema(500),
  content: z.string().min(1).max(1_000_000)
    .refine((value) => !value.includes("\u0000"), "Invalid rich-text content."),
  metaTitle: OptionalTextSchema(255),
  metaDesc: OptionalTextSchema(500),
  coverCaption: OptionalTextSchema(500),
}).strict();

export const PostTranslationsInputSchema = z.object({
  id: PostTranslationInputSchema,
  en: PostTranslationInputSchema.optional(),
  ar: PostTranslationInputSchema.optional(),
}).strict();

export const PostImageInputSchema = z.object({
  mediaId: PostIdSchema,
  caption: OptionalTextSchema(500),
}).strict();

const PostMutableFieldsShape = {
  type: PostTypeSchema,
  columnType: ColumnTypeSchema.nullable().optional(),
  slug: PostSlugSchema,
  isFeatured: z.boolean(),
  categoryId: PostIdSchema.nullable(),
  coverMediaId: PostIdSchema.nullable(),
  tagIds: z.array(PostIdSchema).max(30)
    .refine((values) => new Set(values).size === values.length, "Duplicate tag identifier."),
  images: z.array(PostImageInputSchema).max(20)
    .refine((values) => new Set(values.map((value) => value.mediaId)).size === values.length, "Duplicate gallery image."),
  translations: PostTranslationsInputSchema,
} as const;

function validatePostType(
  value: {type: z.infer<typeof PostTypeSchema>; columnType?: z.infer<typeof ColumnTypeSchema> | null},
  context: z.RefinementCtx,
) {
  if (value.type === "KOLOM" && !value.columnType) {
    context.addIssue({
      code: "custom",
      path: ["columnType"],
      message: "Column type is required for KOLOM.",
    });
  }
  if (value.type !== "KOLOM" && value.columnType != null) {
    context.addIssue({
      code: "custom",
      path: ["columnType"],
      message: "Column type is only valid for KOLOM.",
    });
  }
}

export const PostInitialPublicationSchema = z.discriminatedUnion("intent", [
  z.object({intent: z.literal("SAVE_DRAFT")}).strict(),
  z.object({intent: z.literal("PUBLISH_NOW")}).strict(),
  z.object({
    intent: z.literal("SCHEDULE"),
    publishedAt: PostInstantSchema,
  }).strict(),
]);

export const PostInitialPublicationDecisionSchema = z.object({
  now: z.date(),
  publication: PostInitialPublicationSchema,
}).strict().superRefine((value, context) => {
  if (
    value.publication.intent === "SCHEDULE"
    && new Date(value.publication.publishedAt).getTime() <= value.now.getTime()
  ) {
    context.addIssue({
      code: "custom",
      path: ["publication", "publishedAt"],
      message: "Scheduled publication must be in the future.",
    });
  }
});

export const PostCreateInputSchema = z.object({
  ...PostMutableFieldsShape,
  publication: PostInitialPublicationSchema,
}).strict().superRefine(validatePostType);

export const PostUpdateInputSchema = z.object({
  postId: PostIdSchema,
  expectedVersion: z.number().int().positive().max(MAX_VERSION),
  ...PostMutableFieldsShape,
}).strict().superRefine(validatePostType);

export const PostAutosaveInputSchema = z.object({
  intent: z.literal("AUTOSAVE_DRAFT"),
  postId: PostIdSchema,
  expectedVersion: z.number().int().positive().max(MAX_VERSION),
  ...PostMutableFieldsShape,
}).strict().superRefine(validatePostType);

export const PostPublicationMutationInputSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("PUBLISH_NOW"),
    postId: PostIdSchema,
    expectedVersion: z.number().int().positive().max(MAX_VERSION),
  }).strict(),
  z.object({
    intent: z.literal("SCHEDULE"),
    postId: PostIdSchema,
    expectedVersion: z.number().int().positive().max(MAX_VERSION),
    publishedAt: PostInstantSchema,
  }).strict(),
  z.object({
    intent: z.literal("RETURN_TO_DRAFT"),
    postId: PostIdSchema,
    expectedVersion: z.number().int().positive().max(MAX_VERSION),
  }).strict(),
  z.object({
    intent: z.literal("ARCHIVE"),
    postId: PostIdSchema,
    expectedVersion: z.number().int().positive().max(MAX_VERSION),
  }).strict(),
]);

const ALLOWED_TRANSITIONS = {
  DRAFT: new Set(["PUBLISH_NOW", "SCHEDULE", "ARCHIVE"]),
  PUBLISHED: new Set(["SCHEDULE", "RETURN_TO_DRAFT", "ARCHIVE"]),
  ARCHIVED: new Set(["RETURN_TO_DRAFT"]),
} as const;

export const PostPublicationTransitionSchema = z.object({
  currentStatus: PostStatusSchema,
  now: z.date(),
  command: PostPublicationMutationInputSchema,
}).strict().superRefine((value, context) => {
  if (!ALLOWED_TRANSITIONS[value.currentStatus].has(value.command.intent as never)) {
    context.addIssue({
      code: "custom",
      path: ["command", "intent"],
      message: "Invalid post state transition.",
    });
  }
  if (
    value.command.intent === "SCHEDULE"
    && new Date(value.command.publishedAt).getTime() <= value.now.getTime()
  ) {
    context.addIssue({
      code: "custom",
      path: ["command", "publishedAt"],
      message: "Scheduled publication must be in the future.",
    });
  }
});

export const TrustedPostActorScopeSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("ADMIN"),
    userId: PostIdSchema,
    ownership: z.literal("ANY"),
  }).strict(),
  z.object({
    role: z.literal("EDITOR"),
    userId: PostIdSchema,
    ownership: z.literal("OWN"),
  }).strict(),
]);

const PublicPaginationShape = {
  page: z.number().int().min(1).max(10_000).default(1),
  pageSize: z.number().int().min(1).max(24).default(12),
} as const;

export const PublicPostListQuerySchema = z.object({
  locale: LocaleSchema,
  type: PostTypeSchema,
  categorySlug: PostSlugSchema.optional(),
  tagSlug: PostSlugSchema.optional(),
  ...PublicPaginationShape,
}).strict();

export const PublicPostDetailQuerySchema = z.object({
  locale: LocaleSchema,
  type: PostTypeSchema,
  slug: PostSlugSchema,
}).strict();

export const PublicPostVisibilitySchema = z.object({
  status: z.literal("PUBLISHED"),
  publishedAt: z.date(),
  now: z.date(),
}).strict().refine((value) => value.publishedAt.getTime() <= value.now.getTime(), {
  path: ["publishedAt"],
  message: "Future publication is not publicly visible.",
});

export const ResolvedPostTranslationSchema = z.object({
  requestedLocale: LocaleSchema,
  resolvedLocale: LocaleSchema,
  isFallback: z.boolean(),
  value: PostTranslationInputSchema,
}).strict().superRefine((value, context) => {
  const exact = value.requestedLocale === value.resolvedLocale;
  const validFallback = value.requestedLocale !== "id" && value.resolvedLocale === "id";
  if ((exact && value.isFallback) || (!exact && (!value.isFallback || !validFallback))) {
    context.addIssue({code: "custom", message: "Invalid locale fallback metadata."});
  }
});

export const PublicPostImageSchema = z.object({
  id: PostIdSchema,
  media: PublicMediaViewSchema,
  caption: z.string().trim().min(1).max(500).nullable(),
}).strict();

export const PublicPostViewSchema = z.object({
  id: PostIdSchema,
  type: PostTypeSchema,
  columnType: ColumnTypeSchema.nullable(),
  slug: PostSlugSchema,
  isFeatured: z.boolean(),
  publishedAt: z.date(),
  authorName: z.string().trim().min(1).max(191).nullable(),
  categorySlug: PostSlugSchema.nullable(),
  cover: PublicMediaViewSchema.nullable(),
  images: z.array(PublicPostImageSchema).max(20),
  translation: ResolvedPostTranslationSchema,
}).strict().superRefine(validatePostType);

export const PublicPostListResultSchema = z.object({
  items: z.array(PublicPostViewSchema).max(24),
  page: z.number().int().min(1).max(10_000),
  pageSize: z.number().int().min(1).max(24),
  total: z.number().int().min(0),
  hasNextPage: z.boolean(),
}).strict().superRefine((value, context) => {
  const identifiers = value.items.map((item) => item.id);
  if (new Set(identifiers).size !== identifiers.length) {
    context.addIssue({code: "custom", path: ["items"], message: "Duplicate post result."});
  }
});

export const PostMutationFailureCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "VERSION_CONFLICT",
  "INVALID_STATE",
  "SLUG_CONFLICT",
  "MEDIA_NOT_FOUND",
  "MEDIA_FORBIDDEN",
  "INTERNAL_ERROR",
]);

export const PostMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    postId: PostIdSchema,
    version: z.number().int().min(1).max(2_147_483_647),
    status: PostStatusSchema,
    publishedAt: z.date().nullable(),
    updatedAt: z.date(),
  }).strict(),
  z.object({
    ok: z.literal(false),
    code: PostMutationFailureCodeSchema,
  }).strict(),
]);

export type PostTranslationInput = z.infer<typeof PostTranslationInputSchema>;
export type PostTranslationsInput = z.infer<typeof PostTranslationsInputSchema>;
export type PostCreateInput = z.infer<typeof PostCreateInputSchema>;
export type PostInitialPublicationDecision = z.infer<typeof PostInitialPublicationDecisionSchema>;
export type PostUpdateInput = z.infer<typeof PostUpdateInputSchema>;
export type PostAutosaveInput = z.infer<typeof PostAutosaveInputSchema>;
export type PostPublicationMutationInput = z.infer<typeof PostPublicationMutationInputSchema>;
export type PostPublicationTransition = z.infer<typeof PostPublicationTransitionSchema>;
export type TrustedPostActorScope = z.infer<typeof TrustedPostActorScopeSchema>;
export type PublicPostListQuery = z.input<typeof PublicPostListQuerySchema>;
export type PublicPostDetailQuery = z.infer<typeof PublicPostDetailQuerySchema>;
export type PublicPostVisibility = z.infer<typeof PublicPostVisibilitySchema>;
export type ResolvedPostTranslation = z.infer<typeof ResolvedPostTranslationSchema>;
export type PublicPostImage = z.infer<typeof PublicPostImageSchema>;
export type PublicPostView = z.infer<typeof PublicPostViewSchema>;
export type PublicPostListResult = z.infer<typeof PublicPostListResultSchema>;
export type PostMutationFailureCode = z.infer<typeof PostMutationFailureCodeSchema>;
export type PostMutationResult = z.infer<typeof PostMutationResultSchema>;
