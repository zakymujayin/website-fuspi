import {z} from "zod";

import {
  CmsGovernanceSummarySchema,
  CmsIdentifierSchema,
  CmsListQuerySchema,
  CmsPageMetadataSchema,
  CmsPublicAssetReferenceSchema,
  CmsTranslationResolutionSchema,
  CmsTranslationWorkflowSchema,
} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {FacilityType as PrismaFacilityType} from "@/generated/prisma/enums";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SafeText = (maximum: number) => z.string().trim().max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid text.");
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) => SafeText(maximum).nullable();
const SlugSchema = z.string().trim().min(1).max(191).regex(SLUG_PATTERN);
const VersionSchema = z.number().int().positive().max(2_147_483_647);

function localizedInput<T extends z.ZodType>(translation: T) {
  return z.object({id: translation, en: translation.optional(), ar: translation.optional()}).strict();
}

const FacilityTranslationInputSchema = z.object({
  name: RequiredText(500),
  description: OptionalText(100_000),
}).strict();

export const FacilityInputSchema = z.object({
  slug: SlugSchema,
  type: z.enum(PrismaFacilityType),
  isActive: z.boolean(),
  order: z.number().int().min(0).max(10_000),
  coverMediaId: CmsIdentifierSchema.nullable(),
  contentOwnerId: CmsIdentifierSchema.nullable(),
  translations: localizedInput(FacilityTranslationInputSchema),
}).strict();

export const FacilityResourceSchema = z.literal("FACILITY");

export const FacilityListQuerySchema = CmsListQuerySchema.extend({
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
}).strict();

export const FacilityCommandSchema = z.union([
  z.object({action: z.literal("CREATE"), payload: FacilityInputSchema}).strict(),
  z.object({action: z.literal("UPDATE"), mutation: z.object({
    id: CmsIdentifierSchema, expectedVersion: VersionSchema,
  }).strict(), payload: FacilityInputSchema}).strict(),
  z.object({action: z.literal("DELETE"), id: CmsIdentifierSchema}).strict(),
]);

export const FacilityAdminViewSchema = z.object({
  id: CmsIdentifierSchema,
  slug: SlugSchema,
  type: z.enum(PrismaFacilityType),
  isActive: z.boolean(),
  order: z.number().int().min(0).max(10_000),
  version: VersionSchema,
  translations: z.array(CmsTranslationWorkflowSchema).min(1).max(3),
  governance: CmsGovernanceSummarySchema.nullable(),
  assets: z.array(CmsPublicAssetReferenceSchema).max(3),
}).strict();

export const FacilityListResultSchema = z.object({
  items: z.array(FacilityAdminViewSchema).max(50),
  page: CmsPageMetadataSchema,
}).strict();

export const FacilityFailureCodeSchema = z.enum([
  "SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "VALIDATION_FAILED",
  "NOT_FOUND", "VERSION_CONFLICT", "SLUG_CONFLICT", "MEDIA_INVALID",
  "IN_USE", "UNAVAILABLE",
]);

export const FacilityMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), id: CmsIdentifierSchema, version: VersionSchema}).strict(),
  z.object({ok: z.literal(false), code: FacilityFailureCodeSchema}).strict(),
]);

export const PublicFacilityItemSchema = z.object({
  id: CmsIdentifierSchema,
  slug: SlugSchema,
  type: z.enum(PrismaFacilityType),
  order: z.number().int().min(0).max(10_000),
  cover: PublicMediaViewSchema.nullable(),
  translation: CmsTranslationResolutionSchema.extend({
    name: RequiredText(500),
    description: OptionalText(100_000),
  }).strict(),
}).strict();

export const PublicFacilityListResultSchema = z.object({
  items: z.array(PublicFacilityItemSchema).max(50),
  page: CmsPageMetadataSchema,
}).strict();

export const FacilityLoadResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), data: FacilityAdminViewSchema}).strict(),
  z.object({ok: z.literal(false), code: FacilityFailureCodeSchema.exclude([
    "CSRF_INVALID", "VERSION_CONFLICT", "SLUG_CONFLICT", "MEDIA_INVALID", "IN_USE",
  ])}).strict(),
]);

export type FacilityInput = z.infer<typeof FacilityInputSchema>;
export type FacilityCommand = z.infer<typeof FacilityCommandSchema>;
export type FacilityMutationResult = z.infer<typeof FacilityMutationResultSchema>;
