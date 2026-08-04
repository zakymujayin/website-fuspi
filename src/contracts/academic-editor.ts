import {z} from "zod";

import {
  LecturerInputSchema,
  StaffInputSchema,
  StudyProgramInputSchema,
  ResearchInputSchema,
  CommunityServiceInputSchema,
  UnitInputSchema,
} from "@/contracts/academic";
import {
  CmsGovernanceSummarySchema,
  CmsIdentifierSchema,
  CmsPublicAssetReferenceSchema,
  CmsTranslationWorkflowSchema,
} from "@/contracts/cms";

const editorBase = z.object({
  id: CmsIdentifierSchema,
  translationWorkflow: z.array(CmsTranslationWorkflowSchema).min(1).max(3),
  assets: z.array(CmsPublicAssetReferenceSchema).max(3),
}).strict();

export const AcademicEditorDetailSchema = z.discriminatedUnion("resource", [
  editorBase.extend({
    resource: z.literal("STUDY_PROGRAM"),
    version: z.number().int().positive(),
    governance: CmsGovernanceSummarySchema,
    input: StudyProgramInputSchema,
  }).strict(),
  editorBase.extend({
    resource: z.literal("LECTURER"),
    version: z.null(),
    governance: z.null(),
    input: LecturerInputSchema,
  }).strict(),
  editorBase.extend({
    resource: z.literal("STAFF"),
    version: z.null(),
    governance: z.null(),
    input: StaffInputSchema,
  }).strict(),
  editorBase.extend({
    resource: z.literal("RESEARCH"),
    version: z.null(),
    governance: z.null(),
    input: ResearchInputSchema,
  }).strict(),
  editorBase.extend({
    resource: z.literal("COMMUNITY_SERVICE"),
    version: z.null(),
    governance: z.null(),
    input: CommunityServiceInputSchema,
  }).strict(),
  editorBase.extend({
    resource: z.literal("UNIT"),
    version: z.number().int().positive(),
    governance: CmsGovernanceSummarySchema,
    input: UnitInputSchema,
  }).strict(),
]);

export const AcademicEditorFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "REQUEST_INVALID",
  "NOT_FOUND",
  "UNAVAILABLE",
]);

export const AcademicEditorLoadResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), data: AcademicEditorDetailSchema}).strict(),
  z.object({ok: z.literal(false), code: AcademicEditorFailureCodeSchema}).strict(),
]);

const ImportRowNumberSchema = z.number().int().min(1).max(500);
const ImportLecturerRowSchema = z.object({
  rowNumber: ImportRowNumberSchema,
  resource: z.literal("LECTURER"),
  payload: LecturerInputSchema,
}).strict();
const ImportStaffRowSchema = z.object({
  rowNumber: ImportRowNumberSchema,
  resource: z.literal("STAFF"),
  payload: StaffInputSchema,
}).strict();

export const AcademicPeopleImportRowSchema = z.discriminatedUnion("resource", [
  ImportLecturerRowSchema,
  ImportStaffRowSchema,
]);

function duplicateValue(
  rows: z.infer<typeof AcademicPeopleImportRowSchema>[],
  value: (row: z.infer<typeof AcademicPeopleImportRowSchema>) => string | null,
) {
  const seen = new Set<string>();
  for (const row of rows) {
    const current = value(row);
    if (current === null) continue;
    const normalized = current.toLowerCase();
    if (seen.has(normalized)) return true;
    seen.add(normalized);
  }
  return false;
}

export const AcademicPeopleImportRequestSchema = z.object({
  intent: z.enum(["PREVIEW", "COMMIT"]),
  atomic: z.literal(true),
  rows: z.array(AcademicPeopleImportRowSchema).min(1).max(500),
}).strict().superRefine(({rows}, context) => {
  if (new Set(rows.map(({rowNumber}) => rowNumber)).size !== rows.length) {
    context.addIssue({code: "custom", path: ["rows"], message: "Import row numbers must be unique."});
  }
  if (new Set(rows.map(({resource}) => resource)).size !== 1) {
    context.addIssue({code: "custom", path: ["rows"], message: "An import batch must contain one resource type."});
  }
  const duplicates = [
    duplicateValue(rows, ({payload}) => payload.slug),
    duplicateValue(rows, ({payload}) => payload.nip),
    duplicateValue(rows, (row) => row.resource === "LECTURER" ? row.payload.nidn : null),
    duplicateValue(rows, (row) => row.resource === "LECTURER" ? row.payload.orcid : null),
  ];
  if (duplicates.some(Boolean)) {
    context.addIssue({code: "custom", path: ["rows"], message: "Import identities must be unique within the batch."});
  }
});

export const AcademicImportSafeCellSchema = z.string().max(500).refine(
  (value) => !/^[=+\-@\t\r]/u.test(value),
  "Spreadsheet-formula prefixes must be escaped.",
);

export const AcademicImportRowCodeSchema = z.enum([
  "DUPLICATE_IN_BATCH",
  "IDENTITY_CONFLICT",
  "SLUG_CONFLICT",
  "RELATION_INVALID",
  "MEDIA_INVALID",
  "VALIDATION_FAILED",
  "UNAVAILABLE",
]);

export const AcademicImportRowResultSchema = z.object({
  rowNumber: ImportRowNumberSchema,
  status: z.enum(["VALID", "INVALID", "CREATED"]),
  code: AcademicImportRowCodeSchema.nullable(),
  id: CmsIdentifierSchema.nullable(),
  safeLabel: AcademicImportSafeCellSchema,
}).strict().superRefine((value, context) => {
  if (value.status === "INVALID" && value.code === null) {
    context.addIssue({code: "custom", path: ["code"], message: "Invalid rows require a failure code."});
  }
  if (value.status !== "INVALID" && value.code !== null) {
    context.addIssue({code: "custom", path: ["code"], message: "Successful rows cannot carry a failure code."});
  }
  if ((value.status === "CREATED") !== (value.id !== null)) {
    context.addIssue({code: "custom", path: ["id"], message: "Only created rows carry an ID."});
  }
});

export const AcademicPeopleImportResultSchema = z.object({
  ok: z.literal(true),
  intent: z.enum(["PREVIEW", "COMMIT"]),
  resource: z.enum(["LECTURER", "STAFF"]),
  atomic: z.literal(true),
  committed: z.boolean(),
  rows: z.array(AcademicImportRowResultSchema).min(1).max(500),
  summary: z.object({
    total: z.number().int().min(1).max(500),
    valid: z.number().int().min(0).max(500),
    invalid: z.number().int().min(0).max(500),
    created: z.number().int().min(0).max(500),
  }).strict(),
}).strict().superRefine((value, context) => {
  const valid = value.rows.filter(({status}) => status === "VALID").length;
  const invalid = value.rows.filter(({status}) => status === "INVALID").length;
  const created = value.rows.filter(({status}) => status === "CREATED").length;
  if (
    value.summary.total !== value.rows.length
    || value.summary.valid !== valid
    || value.summary.invalid !== invalid
    || value.summary.created !== created
  ) context.addIssue({code: "custom", path: ["summary"], message: "Import summary does not match row results."});
  if (value.intent === "PREVIEW" && (value.committed || created > 0)) {
    context.addIssue({code: "custom", message: "Preview cannot commit rows."});
  }
  if (value.intent === "COMMIT" && value.committed !== (created === value.rows.length)) {
    context.addIssue({code: "custom", message: "Atomic commit state is inconsistent."});
  }
});

export const AcademicPeopleImportFailureSchema = z.object({
  ok: z.literal(false),
  code: z.enum(["SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "VALIDATION_FAILED", "UNAVAILABLE"]),
}).strict();

export const AcademicPeopleImportResponseSchema = z.union([
  AcademicPeopleImportResultSchema,
  AcademicPeopleImportFailureSchema,
]);

export type AcademicEditorDetail = z.infer<typeof AcademicEditorDetailSchema>;
export type AcademicEditorLoadResult = z.infer<typeof AcademicEditorLoadResultSchema>;
export type AcademicPeopleImportRequest = z.infer<typeof AcademicPeopleImportRequestSchema>;
export type AcademicPeopleImportResponse = z.infer<typeof AcademicPeopleImportResponseSchema>;
