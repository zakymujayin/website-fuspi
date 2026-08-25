import {z} from "zod";

import {
  CmsGovernanceSummarySchema,
  CmsHttpsExternalUrlSchema,
  CmsIdentifierSchema,
  CmsListQuerySchema,
  CmsPageMetadataSchema,
  CmsPublicAssetReferenceSchema,
  CmsTranslationResolutionSchema,
  CmsTranslationWorkflowSchema,
} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {UnitType as PrismaUnitType} from "@/generated/prisma/enums";
import {institution} from "@/config/institution";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SafeText = (maximum: number) => z.string().trim().max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid text.");
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) => SafeText(maximum).nullable();
const SlugSchema = z.string().trim().min(1).max(191).regex(SLUG_PATTERN);
const InstitutionalEmailSchema = z.string().trim().toLowerCase().email().max(320).nullable();
const PhoneSchema = z.string().trim().min(3).max(40).regex(/^\+?[0-9 ()-]+$/u).nullable();
const YearSchema = z.number().int().min(1900).max(2100);
const ExternalLinkSchema = z.object({kind: z.literal("EXTERNAL"), href: CmsHttpsExternalUrlSchema}).strict();

function localizedInput<T extends z.ZodType>(translation: T) {
  return z.object({id: translation, en: translation.optional(), ar: translation.optional()}).strict();
}

const TranslationWorkflowViewSchema = CmsTranslationWorkflowSchema;

export const StudyProgramCodeSchema = z.enum(["IAT", "IH", "AFI", "SAA", "TASPI"]);
const studyProgramIdentity = new Map<string, {code: string; slug: string; name: string; order: number}>(
  institution.studyPrograms.map((program, order) => [program.code, {...program, order}]),
);

const StudyProgramTranslationInputSchema = z.object({
  name: RequiredText(255),
  description: OptionalText(100_000),
  vision: OptionalText(100_000),
  mission: OptionalText(100_000),
  objectives: OptionalText(100_000),
  graduateProfile: OptionalText(100_000),
  careerProspects: OptionalText(100_000),
  learningOutcomes: OptionalText(100_000),
}).strict();

export const StudyProgramInputSchema = z.object({
  code: StudyProgramCodeSchema,
  slug: SlugSchema,
  degree: z.literal("S1"),
  accreditation: OptionalText(120),
  accreditationExpiry: z.iso.datetime({offset: true}).nullable(),
  externalUrl: z.null(),
  email: InstitutionalEmailSchema,
  phone: PhoneSchema,
  logoMediaId: CmsIdentifierSchema.nullable(),
  curriculumDocumentId: CmsIdentifierSchema.nullable(),
  brochureDocumentId: CmsIdentifierSchema.nullable(),
  isActive: z.boolean(),
  order: z.number().int().min(0).max(4),
  contentOwnerId: CmsIdentifierSchema.nullable(),
  translations: localizedInput(StudyProgramTranslationInputSchema),
}).strict().superRefine((value, context) => {
  const expected = studyProgramIdentity.get(value.code);
  if (!expected || value.slug !== expected.slug || value.order !== expected.order) {
    context.addIssue({code: "custom", message: "Study program identity or order is invalid."});
  }
});

const PersonTranslationInputSchema = z.object({
  position: OptionalText(255),
  expertise: OptionalText(500),
  bio: OptionalText(100_000),
  officeHours: OptionalText(255),
}).strict();

const StaffTranslationInputSchema = z.object({position: OptionalText(255), unit: OptionalText(255)}).strict();

export const LecturerInputSchema = z.object({
  name: RequiredText(191),
  slug: SlugSchema,
  nidn: OptionalText(50),
  nip: OptionalText(50),
  orcid: z.string().trim().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/u).nullable(),
  googleScholarUrl: ExternalLinkSchema.nullable(),
  sintaUrl: ExternalLinkSchema.nullable(),
  email: InstitutionalEmailSchema,
  phone: PhoneSchema,
  photoMediaId: CmsIdentifierSchema.nullable(),
  studyProgramId: CmsIdentifierSchema.nullable(),
  order: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  translations: localizedInput(PersonTranslationInputSchema),
}).strict();

export const StaffInputSchema = z.object({
  name: RequiredText(191),
  slug: SlugSchema,
  nip: OptionalText(50),
  email: InstitutionalEmailSchema,
  phone: PhoneSchema,
  photoMediaId: CmsIdentifierSchema.nullable(),
  order: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  translations: localizedInput(StaffTranslationInputSchema),
}).strict();

const ResearchTranslationInputSchema = z.object({title: RequiredText(500), abstract: OptionalText(100_000)}).strict();
const CommunityServiceTranslationInputSchema = z.object({title: RequiredText(500), description: OptionalText(100_000)}).strict();
const UnitTranslationInputSchema = z.object({name: RequiredText(255), description: OptionalText(100_000)}).strict();

export const ResearchInputSchema = z.object({
  slug: SlugSchema,
  year: YearSchema,
  documentUrl: ExternalLinkSchema.nullable(),
  lecturerIds: z.array(CmsIdentifierSchema).max(100).refine((ids) => new Set(ids).size === ids.length),
  translations: localizedInput(ResearchTranslationInputSchema),
}).strict();

export const CommunityServiceInputSchema = z.object({
  slug: SlugSchema,
  year: YearSchema,
  location: OptionalText(255),
  documentUrl: ExternalLinkSchema.nullable(),
  lecturerIds: z.array(CmsIdentifierSchema).max(100).refine((ids) => new Set(ids).size === ids.length),
  translations: localizedInput(CommunityServiceTranslationInputSchema),
}).strict();

export const UnitInputSchema = z.object({
  slug: SlugSchema,
  type: z.enum(PrismaUnitType),
  email: InstitutionalEmailSchema,
  phone: PhoneSchema,
  externalUrl: ExternalLinkSchema.nullable(),
  isActive: z.boolean(),
  contentOwnerId: CmsIdentifierSchema.nullable(),
  translations: localizedInput(UnitTranslationInputSchema),
}).strict();

export const AcademicResourceSchema = z.enum(["STUDY_PROGRAM", "LECTURER", "STAFF", "RESEARCH", "COMMUNITY_SERVICE", "UNIT"]);
export const AcademicListQuerySchema = CmsListQuerySchema.extend({
  resource: AcademicResourceSchema,
  active: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  studyProgramId: CmsIdentifierSchema.nullable().default(null),
  year: YearSchema.nullable().default(null),
}).strict();

const createCommands = [
  z.object({action: z.literal("CREATE"), resource: z.literal("STUDY_PROGRAM"), payload: StudyProgramInputSchema}).strict(),
  z.object({action: z.literal("CREATE"), resource: z.literal("LECTURER"), payload: LecturerInputSchema}).strict(),
  z.object({action: z.literal("CREATE"), resource: z.literal("STAFF"), payload: StaffInputSchema}).strict(),
  z.object({action: z.literal("CREATE"), resource: z.literal("RESEARCH"), payload: ResearchInputSchema}).strict(),
  z.object({action: z.literal("CREATE"), resource: z.literal("COMMUNITY_SERVICE"), payload: CommunityServiceInputSchema}).strict(),
  z.object({action: z.literal("CREATE"), resource: z.literal("UNIT"), payload: UnitInputSchema}).strict(),
] as const;

const UpdateBaseSchema = z.object({id: CmsIdentifierSchema, expectedVersion: z.number().int().positive().nullable()}).strict();
export const AcademicCommandSchema = z.union([
  ...createCommands,
  ...createCommands.map((schema) => schema.extend({action: z.literal("UPDATE"), mutation: UpdateBaseSchema}).strict()),
  z.object({action: z.literal("DELETE"), resource: AcademicResourceSchema, id: CmsIdentifierSchema}).strict(),
]);

const ResolvedNameSchema = CmsTranslationResolutionSchema.extend({name: RequiredText(255)}).strict();
export const PublicAcademicDirectoryItemSchema = z.object({
  id: CmsIdentifierSchema,
  resource: AcademicResourceSchema,
  slug: SlugSchema,
  name: RequiredText(500),
  secondaryText: OptionalText(500),
  institutionalEmail: InstitutionalEmailSchema,
  photo: PublicMediaViewSchema.nullable(),
  studyProgram: ResolvedNameSchema.nullable(),
}).strict();

export const AcademicAdminViewSchema = z.object({
  id: CmsIdentifierSchema,
  resource: AcademicResourceSchema,
  slug: SlugSchema,
  version: z.number().int().positive().nullable(),
  isActive: z.boolean().nullable(),
  translations: z.array(TranslationWorkflowViewSchema).min(1).max(3),
  governance: CmsGovernanceSummarySchema.nullable(),
  assets: z.array(CmsPublicAssetReferenceSchema).max(3),
}).strict();

export const AcademicListResultSchema = z.object({items: z.array(AcademicAdminViewSchema).max(50), page: CmsPageMetadataSchema}).strict();
export const AcademicFailureCodeSchema = z.enum(["SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "VALIDATION_FAILED", "NOT_FOUND", "VERSION_CONFLICT", "SLUG_CONFLICT", "IDENTITY_CONFLICT", "MEDIA_INVALID", "DOCUMENT_INVALID", "RELATION_INVALID", "IN_USE", "UNAVAILABLE"]);
export const AcademicMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), id: CmsIdentifierSchema, resource: AcademicResourceSchema, version: z.number().int().positive().nullable()}).strict(),
  z.object({ok: z.literal(false), code: AcademicFailureCodeSchema}).strict(),
]);

export type AcademicListQuery = z.infer<typeof AcademicListQuerySchema>;
export type AcademicCommand = z.infer<typeof AcademicCommandSchema>;
export type AcademicMutationResult = z.infer<typeof AcademicMutationResultSchema>;
