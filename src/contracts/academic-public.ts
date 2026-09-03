import {z} from "zod";

import {AcademicResourceSchema, StudyProgramCodeSchema} from "@/contracts/academic";
import {
  CmsHttpsExternalUrlSchema,
  CmsIdentifierSchema,
  CmsPublicDocumentViewSchema,
  CmsTranslationResolutionSchema,
} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {LocaleSchema} from "@/contracts/platform";
import {UnitType as PrismaUnitType} from "@/generated/prisma/enums";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SlugSchema = z.string().trim().min(1).max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const SafeText = (maximum: number) => z.string().trim().max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid public text.");
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) => SafeText(maximum).nullable();
const InstitutionalEmailSchema = z.string().trim().toLowerCase().email().max(320).nullable();
const ResolvedBaseSchema = CmsTranslationResolutionSchema;

export const AcademicPublicDetailQuerySchema = z.object({
  resource: AcademicResourceSchema,
  slug: SlugSchema,
  locale: LocaleSchema,
}).strict();

export const PublicStudyProgramReferenceSchema = z.object({
  id: CmsIdentifierSchema,
  slug: SlugSchema,
  code: StudyProgramCodeSchema,
  translation: ResolvedBaseSchema.extend({name: RequiredText(255)}).strict(),
}).strict();

export const PublicAcademicPersonReferenceSchema = z.object({
  id: CmsIdentifierSchema,
  slug: SlugSchema,
  name: RequiredText(191),
  photo: PublicMediaViewSchema.nullable(),
}).strict();

const DetailBaseSchema = z.object({
  id: CmsIdentifierSchema,
  slug: SlugSchema,
}).strict();

export const PublicStudyProgramDetailSchema = DetailBaseSchema.extend({
  resource: z.literal("STUDY_PROGRAM"),
  code: StudyProgramCodeSchema,
  degree: z.literal("S1"),
  accreditation: OptionalText(120),
  accreditationAgency: OptionalText(120).optional(),
  accreditationDecreeNumber: OptionalText(255).optional(),
  accreditationExpiry: z.iso.datetime({offset: true}).nullable(),
  accreditationCertificate: PublicMediaViewSchema.nullable().optional(),
  institutionalEmail: InstitutionalEmailSchema,
  logo: PublicMediaViewSchema.nullable(),
  curriculumDocument: CmsPublicDocumentViewSchema.nullable(),
  brochureDocument: CmsPublicDocumentViewSchema.nullable(),
  translation: ResolvedBaseSchema.extend({
    name: RequiredText(255),
    description: OptionalText(100_000),
    vision: OptionalText(100_000),
    mission: OptionalText(100_000),
    objectives: OptionalText(100_000),
    graduateProfile: OptionalText(100_000),
    careerProspects: OptionalText(100_000),
    learningOutcomes: OptionalText(100_000),
  }).strict(),
}).strict();

export const PublicLecturerDetailSchema = DetailBaseSchema.extend({
  resource: z.literal("LECTURER"),
  name: RequiredText(191),
  institutionalEmail: InstitutionalEmailSchema,
  photo: PublicMediaViewSchema.nullable(),
  studyProgram: PublicStudyProgramReferenceSchema.nullable(),
  googleScholarUrl: CmsHttpsExternalUrlSchema.nullable(),
  sintaUrl: CmsHttpsExternalUrlSchema.nullable(),
  translation: ResolvedBaseSchema.extend({
    position: OptionalText(255),
    expertise: OptionalText(500),
    bio: OptionalText(100_000),
    officeHours: OptionalText(255),
  }).strict(),
}).strict();

export const PublicStaffDetailSchema = DetailBaseSchema.extend({
  resource: z.literal("STAFF"),
  name: RequiredText(191),
  institutionalEmail: InstitutionalEmailSchema,
  photo: PublicMediaViewSchema.nullable(),
  translation: ResolvedBaseSchema.extend({
    position: OptionalText(255),
    unit: OptionalText(255),
  }).strict(),
}).strict();

export const PublicResearchDetailSchema = DetailBaseSchema.extend({
  resource: z.literal("RESEARCH"),
  year: z.number().int().min(1900).max(2100),
  documentUrl: CmsHttpsExternalUrlSchema.nullable(),
  lecturers: z.array(PublicAcademicPersonReferenceSchema).max(100),
  translation: ResolvedBaseSchema.extend({
    title: RequiredText(500),
    abstract: OptionalText(100_000),
  }).strict(),
}).strict();

export const PublicCommunityServiceDetailSchema = DetailBaseSchema.extend({
  resource: z.literal("COMMUNITY_SERVICE"),
  year: z.number().int().min(1900).max(2100),
  location: OptionalText(255),
  documentUrl: CmsHttpsExternalUrlSchema.nullable(),
  lecturers: z.array(PublicAcademicPersonReferenceSchema).max(100),
  translation: ResolvedBaseSchema.extend({
    title: RequiredText(500),
    description: OptionalText(100_000),
  }).strict(),
}).strict();

export const PublicUnitDetailSchema = DetailBaseSchema.extend({
  resource: z.literal("UNIT"),
  type: z.enum(PrismaUnitType),
  institutionalEmail: InstitutionalEmailSchema,
  externalUrl: CmsHttpsExternalUrlSchema.nullable(),
  translation: ResolvedBaseSchema.extend({
    name: RequiredText(255),
    description: OptionalText(100_000),
  }).strict(),
}).strict();

export const AcademicPublicDetailSchema = z.discriminatedUnion("resource", [
  PublicStudyProgramDetailSchema,
  PublicLecturerDetailSchema,
  PublicStaffDetailSchema,
  PublicResearchDetailSchema,
  PublicCommunityServiceDetailSchema,
  PublicUnitDetailSchema,
]);

export const AcademicPublicDetailResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), data: AcademicPublicDetailSchema}).strict(),
  z.object({ok: z.literal(false), code: z.enum(["REQUEST_INVALID", "NOT_FOUND", "UNAVAILABLE"])}).strict(),
]);

export type AcademicPublicDetailQuery = z.infer<typeof AcademicPublicDetailQuerySchema>;
export type AcademicPublicDetail = z.infer<typeof AcademicPublicDetailSchema>;
export type AcademicPublicDetailResult = z.infer<typeof AcademicPublicDetailResultSchema>;
