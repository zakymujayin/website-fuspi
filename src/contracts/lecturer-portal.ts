import {z} from "zod";

import {ActiveDatabaseSessionSchema} from "@/contracts/auth";
import {CmsHttpsExternalUrlSchema, CmsIdentifierSchema} from "@/contracts/cms";
import {MediaIdSchema} from "@/contracts/media";
import {PublicationType as PrismaPublicationType} from "@/generated/prisma/enums";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
/* Rich text keeps tab, line feed and carriage return; every other control
   character stays rejected. */
const UNSAFE_RICH_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;

const SafeText = (maximum: number) =>
  z.string().trim().max(maximum).refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid text.");
const SafeRichText = (maximum: number) =>
  z.string().trim().max(maximum).refine((value) => !UNSAFE_RICH_PATTERN.test(value), "Invalid text.");
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) =>
  SafeText(maximum).transform((value) => (value === "" ? null : value)).nullable();
const OptionalRichText = (maximum: number) =>
  SafeRichText(maximum).transform((value) => (value === "" ? null : value)).nullable();
const OptionalUrl = CmsHttpsExternalUrlSchema.nullable();

/* A lecturer session is trusted only when the role is exactly DOSEN and the
   password has already been rotated. Anything else fails the parse and the
   command never reaches the database. */
export const TrustedLecturerActorSchema = ActiveDatabaseSessionSchema.extend({
  role: z.literal("DOSEN"),
  mustChangePassword: z.literal(false),
}).strict();

/* Academic years are bounded so a typo cannot store a nonsense date. */
const AcademicYearSchema = z.number().int().min(1900).max(2100).nullable();

export const LecturerProfileInputSchema = z.object({
  position: OptionalText(200),
  expertise: OptionalText(500),
  bio: OptionalRichText(50_000),
  quote: OptionalText(500),
  officeHours: OptionalText(200),
  officeLocation: OptionalText(200),
  phone: OptionalText(50),
  googleScholarUrl: OptionalUrl,
  sintaUrl: OptionalUrl,
  scopusUrl: OptionalUrl,
  linkedinUrl: OptionalUrl,
  instagramUrl: OptionalUrl,
  twitterUrl: OptionalUrl,
  photoMediaId: CmsIdentifierSchema.nullable(),
  cvMediaId: CmsIdentifierSchema.nullable(),
}).strict();

export const LecturerEducationInputSchema = z.object({
  degree: RequiredText(100),
  field: OptionalText(200),
  institution: RequiredText(300),
  city: OptionalText(120),
  year: AcademicYearSchema,
}).strict();

export const LecturerPublicationInputSchema = z.object({
  title: RequiredText(500),
  type: z.enum(PrismaPublicationType),
  year: AcademicYearSchema,
  publisher: OptionalText(300),
  url: OptionalUrl,
  doi: OptionalText(200),
}).strict();

export const LecturerPortalCommandSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("PROFILE_UPDATE"), payload: LecturerProfileInputSchema}).strict(),
  z.object({action: z.literal("EDUCATION_CREATE"), payload: LecturerEducationInputSchema}).strict(),
  z.object({action: z.literal("EDUCATION_UPDATE"), id: CmsIdentifierSchema, payload: LecturerEducationInputSchema}).strict(),
  z.object({action: z.literal("EDUCATION_DELETE"), id: CmsIdentifierSchema}).strict(),
  z.object({action: z.literal("PUBLICATION_CREATE"), payload: LecturerPublicationInputSchema}).strict(),
  z.object({action: z.literal("PUBLICATION_UPDATE"), id: CmsIdentifierSchema, payload: LecturerPublicationInputSchema}).strict(),
  z.object({action: z.literal("PUBLICATION_DELETE"), id: CmsIdentifierSchema}).strict(),
]);

export const LecturerPortalFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "NO_LECTURER_PROFILE",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "UNAVAILABLE",
]);

export const LecturerPortalMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), action: z.string()}).strict(),
  z.object({ok: z.literal(false), code: LecturerPortalFailureCodeSchema}).strict(),
]);

export const LecturerPortalMediaUploadKindSchema = z.enum(["PHOTO", "CV"]);

export const LecturerPortalMediaUploadResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    kind: LecturerPortalMediaUploadKindSchema,
    mediaId: MediaIdSchema,
    url: z.string().min(1).max(2_048),
    originalName: z.string().min(1).max(120),
    mimeType: z.enum(["image/webp", "application/pdf"]),
  }).strict(),
  z.object({
    ok: z.literal(false),
    code: z.enum([
      "SESSION_INVALID",
      "CSRF_INVALID",
      "REQUEST_INVALID",
      "NO_LECTURER_PROFILE",
      "VALIDATION_FAILED",
      "UPLOAD_FAILED",
      "UNAVAILABLE",
    ]),
  }).strict(),
]);

export type TrustedLecturerActor = z.infer<typeof TrustedLecturerActorSchema>;
export type LecturerProfileInput = z.infer<typeof LecturerProfileInputSchema>;
export type LecturerEducationInput = z.infer<typeof LecturerEducationInputSchema>;
export type LecturerPublicationInput = z.infer<typeof LecturerPublicationInputSchema>;
export type LecturerPortalCommand = z.infer<typeof LecturerPortalCommandSchema>;
export type LecturerPortalFailureCode = z.infer<typeof LecturerPortalFailureCodeSchema>;
export type LecturerPortalMutationResult = z.infer<typeof LecturerPortalMutationResultSchema>;
export type LecturerPortalMediaUploadKind = z.infer<typeof LecturerPortalMediaUploadKindSchema>;
export type LecturerPortalMediaUploadResponse = z.infer<typeof LecturerPortalMediaUploadResponseSchema>;
