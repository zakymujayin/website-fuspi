import {z} from "zod";

import {
  ContentStatus as PrismaContentStatus,
} from "@/generated/prisma/enums";
import {LocaleSchema} from "@/contracts/platform";

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const MAX_VERSION = 2_147_483_646;

export const PageIdSchema = z.string().trim().regex(SAFE_IDENTIFIER_PATTERN);
export const PageStatusSchema = z.enum(PrismaContentStatus);
export const PageSlugSchema = z.string().trim().min(1).max(191).regex(SLUG_PATTERN);

const ShortTextSchema = (maximum: number) => z.string().trim().min(1).max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid content text.");
const OptionalTextSchema = (maximum: number) => z.string().trim().max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid content text.")
  .nullable().optional();

export const PageTranslationInputSchema = z.object({
  title: ShortTextSchema(255),
  content: z.string().min(1).max(1_000_000)
    .refine((value) => !value.includes("\u0000"), "Invalid rich-text content."),
  metaTitle: OptionalTextSchema(255),
  metaDesc: OptionalTextSchema(500),
}).strict();

export const PageTranslationsInputSchema = z.object({
  id: PageTranslationInputSchema,
  en: PageTranslationInputSchema.optional(),
  ar: PageTranslationInputSchema.optional(),
}).strict();

const PageMutableFieldsShape = {
  slug: PageSlugSchema,
  parentId: PageIdSchema.nullable(),
  heroMediaId: PageIdSchema.nullable(),
  order: z.number().int().min(0).max(2_147_483_647),
  translations: PageTranslationsInputSchema,
} as const;

export const PageInitialPublicationSchema = z.discriminatedUnion("intent", [
  z.object({intent: z.literal("SAVE_DRAFT")}).strict(),
  z.object({intent: z.literal("PUBLISH_NOW")}).strict(),
]);

export const PageCreateInputSchema = z.object({
  ...PageMutableFieldsShape,
  publication: PageInitialPublicationSchema,
}).strict();

export const PageUpdateInputSchema = z.object({
  pageId: PageIdSchema,
  expectedVersion: z.number().int().positive().max(MAX_VERSION),
  ...PageMutableFieldsShape,
}).strict().superRefine((value, ctx) => {
  if (value.parentId && value.parentId === value.pageId) {
    ctx.addIssue({
      code: "custom",
      path: ["parentId"],
      message: "A page cannot be its own parent.",
    });
  }
});

export const PagePublicationMutationInputSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("PUBLISH_NOW"),
    pageId: PageIdSchema,
    expectedVersion: z.number().int().positive().max(MAX_VERSION),
  }).strict(),
  z.object({
    intent: z.literal("RETURN_TO_DRAFT"),
    pageId: PageIdSchema,
    expectedVersion: z.number().int().positive().max(MAX_VERSION),
  }).strict(),
  z.object({
    intent: z.literal("ARCHIVE"),
    pageId: PageIdSchema,
    expectedVersion: z.number().int().positive().max(MAX_VERSION),
  }).strict(),
]);

const ALLOWED_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  DRAFT: new Set(["PUBLISH_NOW", "ARCHIVE"]),
  PUBLISHED: new Set(["RETURN_TO_DRAFT", "ARCHIVE"]),
  ARCHIVED: new Set(["RETURN_TO_DRAFT"]),
};

export const PagePublicationTransitionSchema = z.object({
  currentStatus: PageStatusSchema,
  command: PagePublicationMutationInputSchema,
}).strict().superRefine((value, ctx) => {
  if (!ALLOWED_TRANSITIONS[value.currentStatus]?.has(value.command.intent)) {
    ctx.addIssue({
      code: "custom",
      path: ["command", "intent"],
      message: "Invalid page state transition.",
    });
  }
});

const SearchTextSchema = z.string().trim().max(100).refine(
  (value) => !UNSAFE_TEXT_PATTERN.test(value),
  "Invalid search text.",
);

export const PageListQuerySchema = z.object({
  page: z.number().int().min(1).max(10_000),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
  status: z.union([z.literal("ALL"), PageStatusSchema]),
  search: SearchTextSchema,
  sort: z.enum(["UPDATED_DESC", "TITLE_ASC"]),
}).strict();

export const PageSummarySchema = z.object({
  id: PageIdSchema,
  slug: PageSlugSchema,
  title: ShortTextSchema(255),
  titleLocale: z.literal("id"),
  availableLocales: z.array(LocaleSchema).min(1).max(3)
    .superRefine((locales, ctx) => {
      if (locales[0] !== "id" || new Set(locales).size !== locales.length) {
        ctx.addIssue({
          code: "custom",
          message: "Available locales must contain unique locales beginning with Indonesian.",
        });
      }
    }),
  status: PageStatusSchema,
  version: z.number().int().positive().max(2_147_483_647),
  order: z.number().int().min(0),
  parentId: PageIdSchema.nullable(),
  parentTitle: ShortTextSchema(255).nullable(),
  hasChildren: z.boolean(),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

export const PageListResultSchema = z.object({
  items: z.array(PageSummarySchema).max(50),
  page: z.number().int().min(1).max(10_000),
  pageSize: z.union([z.literal(10), z.literal(20), z.literal(50)]),
  total: z.number().int().min(0),
  hasNextPage: z.boolean(),
}).strict().superRefine((value, ctx) => {
  const identifiers = value.items.map((item) => item.id);
  if (new Set(identifiers).size !== identifiers.length) {
    ctx.addIssue({code: "custom", path: ["items"], message: "Duplicate Page item."});
  }
  if (value.items.length > value.pageSize || value.total < value.items.length) {
    ctx.addIssue({code: "custom", path: ["items"], message: "Invalid Page page bounds."});
  }
  if (value.hasNextPage !== value.page * value.pageSize < value.total) {
    ctx.addIssue({code: "custom", path: ["hasNextPage"], message: "Invalid Page page state."});
  }
});

export const PageDetailViewSchema = z.object({
  id: PageIdSchema,
  slug: PageSlugSchema,
  status: PageStatusSchema,
  order: z.number().int().min(0),
  version: z.number().int().positive().max(2_147_483_647),
  parentId: PageIdSchema.nullable(),
  heroMediaId: PageIdSchema.nullable(),
  translations: PageTranslationsInputSchema,
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

export const PageMutationFailureCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "VERSION_CONFLICT",
  "INVALID_STATE",
  "SLUG_CONFLICT",
  "HIERARCHY_CYCLE",
  "MEDIA_NOT_FOUND",
  "MEDIA_FORBIDDEN",
  "PARENT_NOT_FOUND",
  "INTERNAL_ERROR",
]);

export const PageMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    pageId: PageIdSchema,
    version: z.number().int().min(1).max(2_147_483_647),
    status: PageStatusSchema,
    updatedAt: z.date(),
  }).strict(),
  z.object({
    ok: z.literal(false),
    code: PageMutationFailureCodeSchema,
  }).strict(),
]);

export const PageDeleteInputSchema = z.object({
  pageId: PageIdSchema,
  expectedVersion: z.number().int().positive().max(MAX_VERSION),
}).strict();

export type PageTranslationInput = z.infer<typeof PageTranslationInputSchema>;
export type PageTranslationsInput = z.infer<typeof PageTranslationsInputSchema>;
export type PageCreateInput = z.infer<typeof PageCreateInputSchema>;
export type PageUpdateInput = z.infer<typeof PageUpdateInputSchema>;
export type PagePublicationMutationInput = z.infer<typeof PagePublicationMutationInputSchema>;
export type PageListQuery = z.infer<typeof PageListQuerySchema>;
export type PageSummary = z.infer<typeof PageSummarySchema>;
export type PageListResult = z.infer<typeof PageListResultSchema>;
export type PageDetailView = z.infer<typeof PageDetailViewSchema>;
export type PageMutationFailureCode = z.infer<typeof PageMutationFailureCodeSchema>;
export type PageMutationResult = z.infer<typeof PageMutationResultSchema>;
