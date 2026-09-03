import {z} from "zod";

import {CmsHttpsExternalUrlSchema, CmsIdentifierSchema} from "@/contracts/cms";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SafeText = (maximum: number) => z.string().trim().max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid text.");
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) => SafeText(maximum).transform((value) => value === "" ? null : value).nullable();
const YearSchema = z.number().int().min(1900).max(2100);

export const IntellectualPropertyTypeSchema = z.enum([
  "PATEN", "HAK_CIPTA", "MEREK", "DESAIN_INDUSTRI", "LAINNYA",
]);
export const TeachingTermSchema = z.enum(["GANJIL", "GENAP"]);
export const TeachingProgramCodeSchema = z.enum(["IAT", "IH", "AFI", "FUS"]);

export const LecturerHkiInputSchema = z.object({
  title: RequiredText(500),
  type: IntellectualPropertyTypeSchema,
  registrationNumber: OptionalText(191),
  year: YearSchema.nullable(),
  url: CmsHttpsExternalUrlSchema.nullable(),
}).strict();

export const LecturerTeachingInputSchema = z.object({
  courseCode: RequiredText(50),
  courseName: RequiredText(255),
  programCode: TeachingProgramCodeSchema,
  credits: z.number().int().min(0).max(10),
  academicYearStart: YearSchema,
  academicYearEnd: YearSchema,
  term: TeachingTermSchema,
  semester: z.number().int().min(1).max(8),
}).strict().superRefine((value, context) => {
  if (value.academicYearEnd < value.academicYearStart) {
    context.addIssue({code: "custom", path: ["academicYearEnd"], message: "Academic year end must not precede its start."});
  }
});

export const AdminLecturerAcademicCommandSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("HKI_CREATE"), lecturerId: CmsIdentifierSchema, payload: LecturerHkiInputSchema}).strict(),
  z.object({action: z.literal("HKI_UPDATE"), lecturerId: CmsIdentifierSchema, id: CmsIdentifierSchema, payload: LecturerHkiInputSchema}).strict(),
  z.object({action: z.literal("HKI_DELETE"), lecturerId: CmsIdentifierSchema, id: CmsIdentifierSchema}).strict(),
  z.object({action: z.literal("TEACHING_CREATE"), lecturerId: CmsIdentifierSchema, payload: LecturerTeachingInputSchema}).strict(),
  z.object({action: z.literal("TEACHING_UPDATE"), lecturerId: CmsIdentifierSchema, id: CmsIdentifierSchema, payload: LecturerTeachingInputSchema}).strict(),
  z.object({action: z.literal("TEACHING_DELETE"), lecturerId: CmsIdentifierSchema, id: CmsIdentifierSchema}).strict(),
]);

export const LecturerTeachingImportRowSchema = z.object({
  lecturerId: CmsIdentifierSchema.nullable(),
  nidn: SafeText(50).nullable(),
  courseCode: RequiredText(50),
  courseName: RequiredText(255),
  programCode: TeachingProgramCodeSchema,
  credits: z.number().int().min(0).max(10),
  academicYearStart: YearSchema,
  academicYearEnd: YearSchema,
  term: TeachingTermSchema,
  semester: z.number().int().min(1).max(8),
}).strict().superRefine((value, context) => {
  if (!value.lecturerId && !value.nidn) context.addIssue({code: "custom", path: ["lecturerId"], message: "A lecturer ID or NIDN is required."});
  if (value.academicYearEnd < value.academicYearStart) context.addIssue({code: "custom", path: ["academicYearEnd"], message: "Academic year end must not precede its start."});
});

export const LecturerTeachingImportRequestSchema = z.object({
  rows: z.array(LecturerTeachingImportRowSchema).min(1).max(5_000),
  commit: z.boolean().default(false),
}).strict();

export const LecturerAcademicFailureCodeSchema = z.enum([
  "SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "VALIDATION_FAILED", "NOT_FOUND",
  "LECTURER_NOT_FOUND", "AMBIGUOUS_LECTURER", "DUPLICATE_ASSIGNMENT",
  "UNAVAILABLE",
]);

export const LecturerAcademicMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), action: z.string(), id: CmsIdentifierSchema}).strict(),
  z.object({ok: z.literal(false), code: LecturerAcademicFailureCodeSchema}).strict(),
]);

export type LecturerHkiInput = z.infer<typeof LecturerHkiInputSchema>;
export type LecturerTeachingInput = z.infer<typeof LecturerTeachingInputSchema>;
export type AdminLecturerAcademicCommand = z.infer<typeof AdminLecturerAcademicCommandSchema>;
export type LecturerTeachingImportRow = z.infer<typeof LecturerTeachingImportRowSchema>;
