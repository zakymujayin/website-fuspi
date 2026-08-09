import {z} from "zod";

import {
  CmsConfiguredLinkSchema,
  CmsGovernanceSummarySchema,
  CmsHttpsExternalUrlSchema,
  CmsIdentifierSchema,
  CmsListQuerySchema,
  CmsNullableConfiguredLinkSchema,
  CmsPageMetadataSchema,
  CmsPublicAssetReferenceSchema,
  CmsPublicDocumentViewSchema,
  CmsReorderBatchSchema,
  CmsTranslationResolutionSchema,
  CmsTranslationWorkflowSchema,
} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {LocaleSchema} from "@/contracts/platform";
import {
  AchievementLevel as PrismaAchievementLevel,
  PartnershipLevel as PrismaPartnershipLevel,
  ServiceCategory as PrismaServiceCategory,
  TranslationStatus as PrismaTranslationStatus,
} from "@/generated/prisma/enums";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const ICON_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SlugSchema = z.string().trim().min(1).max(191).regex(SLUG_PATTERN);
const SafeText = (maximum: number) => z.string().trim().max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid text.");
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) => SafeText(maximum).nullable();
const DateTimeSchema = z.iso.datetime({offset: true});
const NullableDateTimeSchema = DateTimeSchema.nullable();
const OrderSchema = z.number().int().min(0).max(10_000);
const YearSchema = z.number().int().min(1900).max(2100);

function localizedInput<T extends z.ZodType>(translation: T) {
  return z.object({id: translation, en: translation.optional(), ar: translation.optional()}).strict();
}

function chronological(
  value: {startDate: string | null; endDate: string | null},
  context: z.RefinementCtx,
) {
  if (value.startDate && value.endDate && new Date(value.endDate) < new Date(value.startDate)) {
    context.addIssue({code: "custom", path: ["endDate"], message: "End date cannot precede start date."});
  }
}

export const PublicContentResourceSchema = z.enum([
  "SERVICE", "PARTNERSHIP", "SCHOLARSHIP", "ACHIEVEMENT", "STUDENT_ACTIVITY",
  "DOCUMENT", "ALBUM", "EVENT", "FAQ", "TESTIMONIAL",
]);

const ServiceTranslationInputSchema = z.object({
  name: RequiredText(255), description: OptionalText(100_000),
}).strict();
const PartnershipTranslationInputSchema = z.object({
  category: OptionalText(255), description: OptionalText(100_000),
}).strict();
const ScholarshipTranslationInputSchema = z.object({
  title: RequiredText(500), provider: OptionalText(255), description: OptionalText(100_000),
}).strict();
const AchievementTranslationInputSchema = z.object({
  title: RequiredText(500), description: OptionalText(100_000),
}).strict();
const StudentActivityTranslationInputSchema = AchievementTranslationInputSchema;
const DocumentTranslationInputSchema = z.object({
  title: RequiredText(255), category: OptionalText(120),
}).strict();
const AlbumTranslationInputSchema = z.object({
  title: RequiredText(255), description: OptionalText(100_000),
}).strict();
const EventTranslationInputSchema = z.object({
  title: RequiredText(500), description: OptionalText(100_000), location: OptionalText(255),
}).strict();
const FaqTranslationInputSchema = z.object({
  category: OptionalText(120), question: RequiredText(500), answer: RequiredText(100_000),
}).strict();
const TestimonialTranslationInputSchema = z.object({
  currentRole: OptionalText(255), quote: RequiredText(10_000),
}).strict();

export const ServiceInputSchema = z.object({
  slug: SlugSchema,
  category: z.enum(PrismaServiceCategory),
  link: CmsNullableConfiguredLinkSchema,
  icon: z.string().trim().max(80).regex(ICON_PATTERN).nullable(),
  isActive: z.boolean(),
  order: OrderSchema,
  contentOwnerId: CmsIdentifierSchema.nullable(),
  expiresAt: NullableDateTimeSchema,
  translations: localizedInput(ServiceTranslationInputSchema),
}).strict();

export const PartnershipInputSchema = z.object({
  slug: SlugSchema,
  partnerName: RequiredText(255),
  level: z.enum(PrismaPartnershipLevel),
  country: OptionalText(120),
  startDate: NullableDateTimeSchema,
  endDate: NullableDateTimeSchema,
  documentId: CmsIdentifierSchema.nullable(),
  legacyDocumentUrl: CmsHttpsExternalUrlSchema.nullable(),
  websiteUrl: CmsHttpsExternalUrlSchema.nullable(),
  logoMediaId: CmsIdentifierSchema.nullable(),
  isActive: z.boolean(),
  order: OrderSchema,
  translations: localizedInput(PartnershipTranslationInputSchema),
}).strict().superRefine((value, context) => {
  chronological(value, context);
  if (value.documentId && value.legacyDocumentUrl) {
    context.addIssue({code: "custom", path: ["documentId"], message: "Use one partnership document source."});
  }
});

export const ScholarshipInputSchema = z.object({
  slug: SlugSchema,
  startDate: NullableDateTimeSchema,
  endDate: NullableDateTimeSchema,
  registrationUrl: CmsHttpsExternalUrlSchema.nullable(),
  documentId: CmsIdentifierSchema.nullable(),
  isActive: z.boolean(),
  translations: localizedInput(ScholarshipTranslationInputSchema),
}).strict().superRefine(chronological);

export const AchievementInputSchema = z.object({
  slug: SlugSchema,
  studentName: RequiredText(255),
  level: z.enum(PrismaAchievementLevel),
  achievedAt: NullableDateTimeSchema,
  imageMediaId: CmsIdentifierSchema.nullable(),
  translations: localizedInput(AchievementTranslationInputSchema),
}).strict();

const OrderedImageInputSchema = z.object({
  mediaId: CmsIdentifierSchema, caption: OptionalText(500), order: OrderSchema,
}).strict();
const OrderedImagesSchema = z.array(OrderedImageInputSchema).max(100).superRefine((images, context) => {
  if (new Set(images.map(({mediaId}) => mediaId)).size !== images.length) {
    context.addIssue({code: "custom", message: "Image IDs must be unique."});
  }
  const orders = images.map(({order}) => order).sort((left, right) => left - right);
  if (new Set(orders).size !== images.length || orders.some((order, index) => order !== index)) {
    context.addIssue({code: "custom", message: "Image order must be contiguous from zero."});
  }
});

export const StudentActivityInputSchema = z.object({
  slug: SlugSchema,
  date: NullableDateTimeSchema,
  images: OrderedImagesSchema,
  translations: localizedInput(StudentActivityTranslationInputSchema),
}).strict();

export const DocumentInputSchema = z.object({
  slug: SlugSchema,
  publicPdfMediaId: CmsIdentifierSchema,
  isPublished: z.boolean(),
  contentOwnerId: CmsIdentifierSchema.nullable(),
  expiresAt: NullableDateTimeSchema,
  translations: localizedInput(DocumentTranslationInputSchema),
}).strict();

export const AlbumInputSchema = z.object({
  slug: SlugSchema,
  coverMediaId: CmsIdentifierSchema.nullable(),
  eventDate: NullableDateTimeSchema,
  isPublished: z.boolean(),
  photos: OrderedImagesSchema,
  translations: localizedInput(AlbumTranslationInputSchema),
}).strict();

export const EventInputSchema = z.object({
  slug: SlugSchema,
  startAt: DateTimeSchema,
  endAt: NullableDateTimeSchema,
  registrationUrl: CmsHttpsExternalUrlSchema.nullable(),
  isPublished: z.boolean(),
  contentOwnerId: CmsIdentifierSchema.nullable(),
  expiresAt: NullableDateTimeSchema,
  translations: localizedInput(EventTranslationInputSchema),
}).strict().superRefine((value, context) => {
  if (value.endAt && new Date(value.endAt) < new Date(value.startAt)) {
    context.addIssue({code: "custom", path: ["endAt"], message: "Event end cannot precede start."});
  }
});

export const FaqInputSchema = z.object({
  order: OrderSchema,
  isVisible: z.boolean(),
  contentOwnerId: CmsIdentifierSchema.nullable(),
  expiresAt: NullableDateTimeSchema,
  translations: localizedInput(FaqTranslationInputSchema),
}).strict();

export const TestimonialInputSchema = z.object({
  name: RequiredText(255),
  graduationYear: YearSchema.nullable(),
  photoMediaId: CmsIdentifierSchema.nullable(),
  order: OrderSchema,
  isVisible: z.boolean(),
  publicationConsentAt: NullableDateTimeSchema,
  translations: localizedInput(TestimonialTranslationInputSchema),
}).strict().superRefine((value, context) => {
  if (value.isVisible && value.publicationConsentAt === null) {
    context.addIssue({code: "custom", path: ["publicationConsentAt"], message: "Visible testimonials require consent."});
  }
});

const inputByResource = [
  ["SERVICE", ServiceInputSchema], ["PARTNERSHIP", PartnershipInputSchema],
  ["SCHOLARSHIP", ScholarshipInputSchema], ["ACHIEVEMENT", AchievementInputSchema],
  ["STUDENT_ACTIVITY", StudentActivityInputSchema], ["DOCUMENT", DocumentInputSchema],
  ["ALBUM", AlbumInputSchema], ["EVENT", EventInputSchema], ["FAQ", FaqInputSchema],
  ["TESTIMONIAL", TestimonialInputSchema],
] as const;

const createCommands = inputByResource.map(([resource, payload]) => z.object({
  action: z.literal("CREATE"), resource: z.literal(resource), payload,
}).strict());
const UpdateMutationSchema = z.object({
  id: CmsIdentifierSchema, expectedVersion: z.number().int().positive().nullable(),
}).strict();
const updateCommands = inputByResource.map(([resource, payload]) => z.object({
  action: z.literal("UPDATE"), resource: z.literal(resource), mutation: UpdateMutationSchema, payload,
}).strict());

export const PublicContentAdminCommandSchema = z.union([
  ...createCommands,
  ...updateCommands,
  z.object({
    action: z.literal("DELETE"), resource: PublicContentResourceSchema, id: CmsIdentifierSchema,
    expectedVersion: z.number().int().positive().nullable(),
  }).strict(),
  z.object({
    action: z.literal("REORDER"),
    resource: z.enum(["SERVICE", "PARTNERSHIP", "FAQ", "TESTIMONIAL"]),
    payload: CmsReorderBatchSchema,
  }).strict(),
]);

export const PublicContentAdminListQuerySchema = CmsListQuerySchema.extend({
  resource: PublicContentResourceSchema,
  visibility: z.enum(["ALL", "PUBLIC", "HIDDEN", "EXPIRED"]).default("ALL"),
  translationStatus: z.enum(PrismaTranslationStatus).nullable().default(null),
  category: SafeText(120).nullable().default(null),
  year: YearSchema.nullable().default(null),
}).strict();

export const PublicContentAdminDetailQuerySchema = z.object({
  resource: PublicContentResourceSchema, id: CmsIdentifierSchema,
}).strict();

const AdminDetailBaseSchema = z.object({
  id: CmsIdentifierSchema,
  version: z.number().int().positive().nullable(),
  translationWorkflow: z.array(CmsTranslationWorkflowSchema).min(1).max(3),
  governance: CmsGovernanceSummarySchema.nullable(),
  assets: z.array(CmsPublicAssetReferenceSchema).max(101),
}).strict();

export const PublicContentAdminDetailSchema = z.discriminatedUnion("resource", inputByResource.map(
  ([resource, input]) => AdminDetailBaseSchema.extend({resource: z.literal(resource), input}).strict(),
) as unknown as [
  z.ZodObject, z.ZodObject, z.ZodObject, z.ZodObject, z.ZodObject,
  z.ZodObject, z.ZodObject, z.ZodObject, z.ZodObject, z.ZodObject,
]);

export const PublicContentAdminSummarySchema = z.object({
  id: CmsIdentifierSchema,
  resource: PublicContentResourceSchema,
  slug: SlugSchema.nullable(),
  primaryText: RequiredText(500),
  visibility: z.enum(["PUBLIC", "HIDDEN", "EXPIRED"]),
  order: OrderSchema.nullable(),
  version: z.number().int().positive().nullable(),
  translations: z.array(CmsTranslationWorkflowSchema).min(1).max(3),
  governance: CmsGovernanceSummarySchema.nullable(),
}).strict();

export const PublicContentAdminListResultSchema = z.object({
  items: z.array(PublicContentAdminSummarySchema).max(50), page: CmsPageMetadataSchema,
}).strict();

export const PublicContentFailureCodeSchema = z.enum([
  "SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "VALIDATION_FAILED", "NOT_FOUND",
  "VERSION_CONFLICT", "SLUG_CONFLICT", "INVALID_STATE", "MEDIA_INVALID", "DOCUMENT_INVALID",
  "RELATION_INVALID", "IN_USE", "UNAVAILABLE",
]);
export const PublicContentMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true), id: CmsIdentifierSchema, resource: PublicContentResourceSchema,
    version: z.number().int().positive().nullable(),
  }).strict(),
  z.object({ok: z.literal(false), code: PublicContentFailureCodeSchema}).strict(),
]);
export const PublicContentAdminLoadResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), data: PublicContentAdminDetailSchema}).strict(),
  z.object({ok: z.literal(false), code: PublicContentFailureCodeSchema.extract(["SESSION_INVALID", "REQUEST_INVALID", "NOT_FOUND", "UNAVAILABLE"])}).strict(),
]);

const ResolvedBaseSchema = CmsTranslationResolutionSchema;
const PublicBaseSchema = z.object({id: CmsIdentifierSchema}).strict();
const PublicImageWithCaptionSchema = z.object({
  media: PublicMediaViewSchema, caption: OptionalText(500), order: OrderSchema,
}).strict();
const PartnershipEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({kind: z.literal("DOCUMENT"), document: CmsPublicDocumentViewSchema}).strict(),
  z.object({kind: z.literal("EXTERNAL"), url: CmsHttpsExternalUrlSchema}).strict(),
]);

export const PublicServiceDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("SERVICE"), slug: SlugSchema, category: z.enum(PrismaServiceCategory),
  link: CmsConfiguredLinkSchema.nullable(), icon: z.string().trim().max(80).regex(ICON_PATTERN).nullable(), order: OrderSchema,
  translation: ResolvedBaseSchema.extend({name: RequiredText(255), description: OptionalText(100_000)}).strict(),
}).strict();
export const PublicPartnershipDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("PARTNERSHIP"), slug: SlugSchema, partnerName: RequiredText(255),
  level: z.enum(PrismaPartnershipLevel), country: OptionalText(120), startDate: NullableDateTimeSchema,
  endDate: NullableDateTimeSchema, websiteUrl: CmsHttpsExternalUrlSchema.nullable(),
  logo: PublicMediaViewSchema.nullable(), evidence: PartnershipEvidenceSchema.nullable(), order: OrderSchema,
  translation: ResolvedBaseSchema.extend({category: OptionalText(255), description: OptionalText(100_000)}).strict(),
}).strict();
export const PublicScholarshipDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("SCHOLARSHIP"), slug: SlugSchema, startDate: NullableDateTimeSchema,
  endDate: NullableDateTimeSchema, registrationUrl: CmsHttpsExternalUrlSchema.nullable(),
  document: CmsPublicDocumentViewSchema.nullable(),
  translation: ResolvedBaseSchema.extend({title: RequiredText(500), provider: OptionalText(255), description: OptionalText(100_000)}).strict(),
}).strict();
export const PublicAchievementDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("ACHIEVEMENT"), slug: SlugSchema, studentName: RequiredText(255),
  level: z.enum(PrismaAchievementLevel), achievedAt: NullableDateTimeSchema, image: PublicMediaViewSchema.nullable(),
  translation: ResolvedBaseSchema.extend({title: RequiredText(500), description: OptionalText(100_000)}).strict(),
}).strict();
export const PublicStudentActivityDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("STUDENT_ACTIVITY"), slug: SlugSchema, date: NullableDateTimeSchema,
  images: z.array(PublicImageWithCaptionSchema).max(100),
  translation: ResolvedBaseSchema.extend({title: RequiredText(500), description: OptionalText(100_000)}).strict(),
}).strict();
export const PublicDocumentDetailSchema = CmsPublicDocumentViewSchema.extend({resource: z.literal("DOCUMENT")}).strict();
export const PublicAlbumDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("ALBUM"), slug: SlugSchema, eventDate: NullableDateTimeSchema,
  cover: PublicMediaViewSchema.nullable(), photos: z.array(PublicImageWithCaptionSchema).max(100),
  translation: ResolvedBaseSchema.extend({title: RequiredText(255), description: OptionalText(100_000)}).strict(),
}).strict();
export const PublicEventDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("EVENT"), slug: SlugSchema, startAt: DateTimeSchema, endAt: NullableDateTimeSchema,
  registrationUrl: CmsHttpsExternalUrlSchema.nullable(),
  translation: ResolvedBaseSchema.extend({title: RequiredText(500), description: OptionalText(100_000), location: OptionalText(255)}).strict(),
}).strict();
export const PublicFaqDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("FAQ"), order: OrderSchema,
  translation: ResolvedBaseSchema.extend({category: OptionalText(120), question: RequiredText(500), answer: RequiredText(100_000)}).strict(),
}).strict();
export const PublicTestimonialDetailSchema = PublicBaseSchema.extend({
  resource: z.literal("TESTIMONIAL"), name: RequiredText(255), graduationYear: YearSchema.nullable(),
  photo: PublicMediaViewSchema.nullable(), order: OrderSchema,
  translation: ResolvedBaseSchema.extend({currentRole: OptionalText(255), quote: RequiredText(10_000)}).strict(),
}).strict();

export const PublicContentDetailSchema = z.discriminatedUnion("resource", [
  PublicServiceDetailSchema, PublicPartnershipDetailSchema, PublicScholarshipDetailSchema,
  PublicAchievementDetailSchema, PublicStudentActivityDetailSchema, PublicDocumentDetailSchema,
  PublicAlbumDetailSchema, PublicEventDetailSchema, PublicFaqDetailSchema, PublicTestimonialDetailSchema,
]);

export const PublicContentListQuerySchema = CmsListQuerySchema.pick({page: true, pageSize: true, search: true, direction: true}).extend({
  resource: PublicContentResourceSchema,
  locale: LocaleSchema,
  category: SafeText(120).nullable().default(null),
  year: YearSchema.nullable().default(null),
  archive: z.enum(["ACTIVE", "ARCHIVE", "ALL"]).default("ACTIVE"),
}).strict();

const slugDetailResources = z.enum([
  "SERVICE", "PARTNERSHIP", "SCHOLARSHIP", "ACHIEVEMENT", "STUDENT_ACTIVITY", "DOCUMENT", "ALBUM", "EVENT",
]);
export const PublicContentDetailQuerySchema = z.union([
  z.object({resource: slugDetailResources, slug: SlugSchema, locale: LocaleSchema}).strict(),
  z.object({resource: z.enum(["FAQ", "TESTIMONIAL"]), id: CmsIdentifierSchema, locale: LocaleSchema}).strict(),
]);

export const PublicContentCardSchema = z.object({
  id: CmsIdentifierSchema, resource: PublicContentResourceSchema, slug: SlugSchema.nullable(),
  title: RequiredText(500), summary: OptionalText(1_000), badge: OptionalText(120),
  startsAt: NullableDateTimeSchema, endsAt: NullableDateTimeSchema,
  media: PublicMediaViewSchema.nullable(), link: CmsConfiguredLinkSchema.nullable(),
  translation: CmsTranslationResolutionSchema,
}).strict();
export const PublicContentListResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), items: z.array(PublicContentCardSchema).max(50), page: CmsPageMetadataSchema}).strict(),
  z.object({ok: z.literal(false), code: z.enum(["REQUEST_INVALID", "UNAVAILABLE"])}).strict(),
]);
export const PublicContentDetailResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), data: PublicContentDetailSchema}).strict(),
  z.object({ok: z.literal(false), code: z.enum(["REQUEST_INVALID", "NOT_FOUND", "UNAVAILABLE"])}).strict(),
]);

export const CsvSafeCellSchema = z.string().max(100_000).refine(
  (value) => !/^[=+\-@\t\r]/u.test(value), "Spreadsheet formula prefixes must be escaped.",
);
export const PartnershipCsvExportQuerySchema = z.object({
  locale: LocaleSchema, level: z.enum(PrismaPartnershipLevel).nullable(), activeOnly: z.boolean(),
}).strict();
export const PartnershipCsvRowSchema = z.object({
  partnerName: CsvSafeCellSchema, level: CsvSafeCellSchema, country: CsvSafeCellSchema,
  category: CsvSafeCellSchema, startDate: CsvSafeCellSchema, endDate: CsvSafeCellSchema,
  websiteUrl: CsvSafeCellSchema, evidenceUrl: CsvSafeCellSchema,
}).strict();
export const PartnershipCsvResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), filename: z.string().regex(/^fuspi-partnerships-\d{4}-\d{2}-\d{2}\.csv$/u), rows: z.array(PartnershipCsvRowSchema).max(100_000)}).strict(),
  z.object({ok: z.literal(false), code: z.enum(["SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "UNAVAILABLE"])}).strict(),
]);

export type PublicContentResource = z.infer<typeof PublicContentResourceSchema>;
export type PublicContentAdminCommand = z.infer<typeof PublicContentAdminCommandSchema>;
export type PublicContentAdminListQuery = z.infer<typeof PublicContentAdminListQuerySchema>;
export type PublicContentAdminDetail = z.infer<typeof PublicContentAdminDetailSchema>;
export type PublicContentMutationResult = z.infer<typeof PublicContentMutationResultSchema>;
export type PublicContentListQuery = z.infer<typeof PublicContentListQuerySchema>;
export type PublicContentDetailQuery = z.infer<typeof PublicContentDetailQuerySchema>;
export type PublicContentDetail = z.infer<typeof PublicContentDetailSchema>;
