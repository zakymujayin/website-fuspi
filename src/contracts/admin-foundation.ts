import {z} from "zod";

import {ActiveDatabaseSessionSchema, AuthRoleSchema} from "@/contracts/auth";
import {
  CmsIdentifierSchema,
  CmsListQuerySchema,
  CmsPageMetadataSchema,
  CmsRawListSearchParamsSchema,
  CmsTranslationWorkflowSchema,
  collectDuplicateAwareSearchParams,
} from "@/contracts/cms";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const SafeNameSchema = z.string().trim().min(1).max(191)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid name.");
const SafeEmailSchema = z.string().trim().toLowerCase().email().max(320);
const TaxonomyNameSchema = z.string().trim().min(1).max(255)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid taxonomy name.");

export const TrustedAdminFoundationActorSchema = ActiveDatabaseSessionSchema.extend({
  role: z.literal("ADMIN"),
  mustChangePassword: z.literal(false),
}).strict();

export const AdminUserListQuerySchema = CmsListQuerySchema.extend({
  role: z.union([z.literal("ALL"), AuthRoleSchema]).default("ALL"),
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
}).strict();

const RawAdminUserListQuerySchema = CmsRawListSearchParamsSchema.extend({
  role: z.union([z.literal("ALL"), AuthRoleSchema]).optional(),
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
}).strict();

export function normalizeAdminUserSearchParams(params: URLSearchParams): AdminUserListQuery {
  const raw = RawAdminUserListQuerySchema.parse(collectDuplicateAwareSearchParams(params));
  return AdminUserListQuerySchema.parse({
    page: raw.page === undefined ? 1 : Number(raw.page),
    pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
    search: raw.search ?? "",
    direction: raw.direction ?? "ASC",
    role: raw.role ?? "ALL",
    active: raw.active ?? "ALL",
  });
}

export const AdminUserSummarySchema = z.object({
  id: CmsIdentifierSchema,
  name: SafeNameSchema,
  email: SafeEmailSchema,
  role: AuthRoleSchema,
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: z.iso.datetime({offset: true}),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

export const AdminUserListResultSchema = z.object({
  items: z.array(AdminUserSummarySchema).max(50),
  page: CmsPageMetadataSchema,
}).strict();

export const AdminUserCreateInputSchema = z.object({
  name: SafeNameSchema,
  email: SafeEmailSchema,
  initialPassword: z.string().min(12).max(128),
  confirmPassword: z.string().min(12).max(128),
  role: AuthRoleSchema,
  isActive: z.boolean().default(true),
  mustChangePassword: z.literal(true).default(true),
}).strict().superRefine((value, context) => {
  if (value.initialPassword !== value.confirmPassword) {
    context.addIssue({code: "custom", path: ["confirmPassword"], message: "Password confirmation does not match."});
  }
  if (value.initialPassword.toLowerCase() === value.email) {
    context.addIssue({code: "custom", path: ["initialPassword"], message: "Initial password cannot equal the email."});
  }
});

export const AdminUserUpdateInputSchema = z.object({
  userId: CmsIdentifierSchema,
  expectedUpdatedAt: z.iso.datetime({offset: true}),
  name: SafeNameSchema,
  email: SafeEmailSchema,
  role: AuthRoleSchema,
  isActive: z.boolean(),
}).strict();

export const AdminUserCommandSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("CREATE"), payload: AdminUserCreateInputSchema}).strict(),
  z.object({action: z.literal("UPDATE"), payload: AdminUserUpdateInputSchema}).strict(),
]);

export const AdminUserFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "EMAIL_CONFLICT",
  "VERSION_CONFLICT",
  "SELF_LOCKOUT",
  "LAST_ADMIN",
  "UNAVAILABLE",
]);

export const AdminUserMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), user: AdminUserSummarySchema}).strict(),
  z.object({ok: z.literal(false), code: AdminUserFailureCodeSchema}).strict(),
]);

export const TaxonomyKindSchema = z.enum(["CATEGORY", "TAG"]);
export const TaxonomySlugSchema = z.string().trim().min(1).max(191).regex(SLUG_PATTERN);
const TaxonomyTranslationInputSchema = z.object({name: TaxonomyNameSchema}).strict();

export const TaxonomyTranslationsInputSchema = z.object({
  id: TaxonomyTranslationInputSchema,
  en: TaxonomyTranslationInputSchema.optional(),
  ar: TaxonomyTranslationInputSchema.optional(),
}).strict();

const TaxonomyTranslationViewSchema = TaxonomyTranslationInputSchema.extend({
  workflow: CmsTranslationWorkflowSchema,
}).strict();

export const TaxonomyTranslationsViewSchema = z.object({
  id: TaxonomyTranslationViewSchema,
  en: TaxonomyTranslationViewSchema.nullable(),
  ar: TaxonomyTranslationViewSchema.nullable(),
}).strict();

export const TaxonomyListQuerySchema = CmsListQuerySchema.extend({
  kind: z.union([z.literal("ALL"), TaxonomyKindSchema]).default("ALL"),
}).strict();

const RawTaxonomyListQuerySchema = CmsRawListSearchParamsSchema.extend({
  kind: z.union([z.literal("ALL"), TaxonomyKindSchema]).optional(),
}).strict();

export function normalizeTaxonomySearchParams(params: URLSearchParams): TaxonomyListQuery {
  const raw = RawTaxonomyListQuerySchema.parse(collectDuplicateAwareSearchParams(params));
  return TaxonomyListQuerySchema.parse({
    page: raw.page === undefined ? 1 : Number(raw.page),
    pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
    search: raw.search ?? "",
    direction: raw.direction ?? "ASC",
    kind: raw.kind ?? "ALL",
  });
}

export const TaxonomySummarySchema = z.object({
  id: CmsIdentifierSchema,
  kind: TaxonomyKindSchema,
  slug: TaxonomySlugSchema,
  translations: TaxonomyTranslationsViewSchema,
  usageCount: z.number().int().min(0).max(2_147_483_647),
}).strict();

export const TaxonomyListResultSchema = z.object({
  items: z.array(TaxonomySummarySchema).max(50),
  page: CmsPageMetadataSchema,
}).strict();

export const TaxonomyCreateInputSchema = z.object({
  kind: TaxonomyKindSchema,
  slug: TaxonomySlugSchema,
  translations: TaxonomyTranslationsInputSchema,
}).strict();

export const TaxonomyUpdateInputSchema = TaxonomyCreateInputSchema.extend({
  taxonomyId: CmsIdentifierSchema,
}).strict();

export const TaxonomyDeleteInputSchema = z.object({
  taxonomyId: CmsIdentifierSchema,
  kind: TaxonomyKindSchema,
}).strict();

export const TaxonomyCommandSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("CREATE"), payload: TaxonomyCreateInputSchema}).strict(),
  z.object({action: z.literal("UPDATE"), payload: TaxonomyUpdateInputSchema}).strict(),
  z.object({action: z.literal("DELETE"), payload: TaxonomyDeleteInputSchema}).strict(),
]);

export const TaxonomyFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "SLUG_CONFLICT",
  "IN_USE",
  "UNAVAILABLE",
]);

export const TaxonomyMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), taxonomy: TaxonomySummarySchema.nullable()}).strict(),
  z.object({ok: z.literal(false), code: TaxonomyFailureCodeSchema}).strict(),
]);

export type AdminUserListQuery = z.infer<typeof AdminUserListQuerySchema>;
export type AdminUserSummary = z.infer<typeof AdminUserSummarySchema>;
export type AdminUserCommand = z.infer<typeof AdminUserCommandSchema>;
export type AdminUserMutationResult = z.infer<typeof AdminUserMutationResultSchema>;
export type TaxonomyKind = z.infer<typeof TaxonomyKindSchema>;
export type TaxonomyListQuery = z.infer<typeof TaxonomyListQuerySchema>;
export type TaxonomySummary = z.infer<typeof TaxonomySummarySchema>;
export type TaxonomyCommand = z.infer<typeof TaxonomyCommandSchema>;
export type TaxonomyMutationResult = z.infer<typeof TaxonomyMutationResultSchema>;
