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
  CmsReorderBatchSchema,
  CmsTranslationResolutionSchema,
  CmsTranslationWorkflowSchema,
} from "@/contracts/cms";
import {PublicMediaViewSchema} from "@/contracts/media";
import {PublicContentCardSchema} from "@/contracts/public-content";
import {LocaleSchema} from "@/contracts/platform";
import {LinkCategory as PrismaLinkCategory, MenuLocation as PrismaMenuLocation} from "@/generated/prisma/enums";

const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const ICON_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SafeText = (maximum: number) => z.string().trim().max(maximum)
  .refine((value) => !UNSAFE_TEXT_PATTERN.test(value), "Invalid text.");
const RequiredText = (maximum: number) => SafeText(maximum).pipe(z.string().min(1));
const OptionalText = (maximum: number) => SafeText(maximum).nullable();
const IconSchema = z.string().trim().max(80).regex(ICON_PATTERN).nullable();
const OrderSchema = z.number().int().min(0).max(10_000);
const VersionSchema = z.number().int().positive().max(2_147_483_647);
const DateTimeSchema = z.iso.datetime({offset: true});

function localizedInput<T extends z.ZodType>(translation: T) {
  return z.object({id: translation, en: translation.optional(), ar: translation.optional()}).strict();
}

const LabelTranslationInputSchema = z.object({label: RequiredText(255)}).strict();
const SliderTranslationInputSchema = z.object({
  title: OptionalText(500), subtitle: OptionalText(1_000), ctaLabel: OptionalText(120),
}).strict();
const SectionTranslationInputSchema = z.object({
  title: RequiredText(500), subtitle: OptionalText(1_000), ctaLabel: OptionalText(120),
}).strict();
const SiteSettingTranslationInputSchema = z.object({
  facultyName: RequiredText(500), tagline: OptionalText(500), address1: OptionalText(5_000),
  address2: OptionalText(5_000), deanPosition: OptionalText(255), deanMessage: OptionalText(100_000),
  videoTitle: OptionalText(500), videoDesc: OptionalText(100_000),
}).strict();

export const HomeSectionKeySchema = z.enum([
  "HERO", "QUICKLINK", "DEAN", "STATS", "INTRO", "PRODI", "ANNOUNCEMENT", "SERVICE",
  "NEWS", "PARTNERSHIP", "COLUMN", "VIDEO", "AGENDA", "TESTIMONIAL", "CTA",
]);
export const HomeNavResourceSchema = z.enum([
  "MENU_ITEM", "QUICK_LINK", "EXTERNAL_LINK", "HOME_SLIDER", "HOME_SECTION", "STATISTIC", "SITE_SETTING", "HOME_VIDEO",
]);

export const MenuItemInputSchema = z.object({
  location: z.enum(PrismaMenuLocation), link: CmsNullableConfiguredLinkSchema, pageId: CmsIdentifierSchema.nullable(),
  parentId: CmsIdentifierSchema.nullable(), order: OrderSchema, isVisible: z.boolean(),
  translations: localizedInput(LabelTranslationInputSchema),
}).strict().superRefine((value, context) => {
  if (value.link && value.pageId) context.addIssue({code: "custom", path: ["link"], message: "Use one menu destination."});
});

export const QuickLinkInputSchema = z.object({
  link: CmsConfiguredLinkSchema, icon: IconSchema, order: OrderSchema, isVisible: z.boolean(),
  translations: localizedInput(LabelTranslationInputSchema),
}).strict();

export const ExternalLinkInputSchema = z.object({
  category: z.enum(PrismaLinkCategory), url: CmsHttpsExternalUrlSchema, order: OrderSchema, isVisible: z.boolean(),
  translations: localizedInput(LabelTranslationInputSchema),
}).strict();

export const HomeSliderInputSchema = z.object({
  imageMediaId: CmsIdentifierSchema, cta: CmsNullableConfiguredLinkSchema, order: OrderSchema, isVisible: z.boolean(),
  translations: localizedInput(SliderTranslationInputSchema),
}).strict().superRefine((value, context) => {
  if (value.isVisible && value.translations.id.title === null) {
    context.addIssue({code: "custom", path: ["translations", "id", "title"], message: "Visible slides require an Indonesian title."});
  }
  for (const [locale, translation] of Object.entries(value.translations)) {
    if (value.cta && translation.ctaLabel === null) context.addIssue({code: "custom", path: ["translations", locale, "ctaLabel"], message: "CTA labels are required."});
    if (!value.cta && translation.ctaLabel !== null) context.addIssue({code: "custom", path: ["translations", locale, "ctaLabel"], message: "CTA labels require a destination."});
  }
});

export const HomeSectionInputSchema = z.object({
  key: HomeSectionKeySchema, isVisible: z.boolean(), order: OrderSchema, itemLimit: z.number().int().min(1).max(12),
  cta: CmsNullableConfiguredLinkSchema, backgroundMediaId: CmsIdentifierSchema.nullable(),
  translations: localizedInput(SectionTranslationInputSchema),
}).strict().superRefine((value, context) => {
  for (const [locale, translation] of Object.entries(value.translations)) {
    if (value.cta && translation.ctaLabel === null) context.addIssue({code: "custom", path: ["translations", locale, "ctaLabel"], message: "CTA labels are required."});
    if (!value.cta && translation.ctaLabel !== null) context.addIssue({code: "custom", path: ["translations", locale, "ctaLabel"], message: "CTA labels require a destination."});
  }
});

export const StatisticInputSchema = z.object({
  value: z.string().trim().min(1).max(40).regex(/^\d+(?:[.,]\d+)?$/u), suffix: OptionalText(20), icon: IconSchema,
  order: OrderSchema, isVisible: z.boolean(), translations: localizedInput(LabelTranslationInputSchema),
}).strict();

const ContactEmailSchema = z.email().max(320).nullable();
const ContactPhoneSchema = z.string().trim().min(5).max(40).regex(/^\+?[0-9 ()-]+$/u).nullable();
export const HomeVideoTranslationInputSchema = z.object({
  title: RequiredText(500),
}).strict();

export const HomeVideoInputSchema = z.object({
  youtubeUrl: z.string().url().regex(/youtube\.com|youtu\.be/),
  order: OrderSchema,
  isVisible: z.boolean(),
  translations: localizedInput(HomeVideoTranslationInputSchema),
}).strict();

export const SiteSettingInputSchema = z.object({
  deanName: OptionalText(255), deanPhotoMediaId: CmsIdentifierSchema.nullable(), videoUrl: CmsHttpsExternalUrlSchema.nullable(),
  videoPosterMediaId: CmsIdentifierSchema.nullable(), email: ContactEmailSchema, phone: ContactPhoneSchema,
  facebookUrl: CmsHttpsExternalUrlSchema.nullable(), instagramUrl: CmsHttpsExternalUrlSchema.nullable(),
  youtubeUrl: CmsHttpsExternalUrlSchema.nullable(), xUrl: CmsHttpsExternalUrlSchema.nullable(),
  logoMediaId: CmsIdentifierSchema.nullable(), faviconMediaId: CmsIdentifierSchema.nullable(),
  contentOwnerId: CmsIdentifierSchema.nullable(), expiresAt: DateTimeSchema.nullable(),
  translations: localizedInput(SiteSettingTranslationInputSchema),
}).strict().superRefine((value, context) => {
  if ((value.deanName === null) !== (value.deanPhotoMediaId === null)) {
    context.addIssue({code: "custom", path: ["deanPhotoMediaId"], message: "Dean identity and photo must be complete."});
  }
  if ((value.videoPosterMediaId === null) !== (value.videoUrl === null)) {
    context.addIssue({code: "custom", path: ["videoPosterMediaId"], message: "Video URL and poster must be complete."});
  }
});

const inputByResource = [
  ["MENU_ITEM", MenuItemInputSchema], ["QUICK_LINK", QuickLinkInputSchema], ["EXTERNAL_LINK", ExternalLinkInputSchema],
  ["HOME_SLIDER", HomeSliderInputSchema], ["HOME_SECTION", HomeSectionInputSchema], ["STATISTIC", StatisticInputSchema],
  ["SITE_SETTING", SiteSettingInputSchema],
  ["HOME_VIDEO", HomeVideoInputSchema],
] as const;
const creatable = inputByResource.filter(([resource]) => resource !== "HOME_SECTION" && resource !== "SITE_SETTING");
const deletable = creatable;
const createCommands = creatable.map(([resource, payload]) => z.object({action: z.literal("CREATE"), resource: z.literal(resource), payload}).strict());
const updateCommands = inputByResource.map(([resource, payload]) => z.object({
  action: z.literal("UPDATE"), resource: z.literal(resource),
  mutation: z.object({id: resource === "SITE_SETTING" ? z.literal("singleton") : CmsIdentifierSchema,
    expectedVersion: resource === "SITE_SETTING" ? VersionSchema : z.null()}).strict(), payload,
}).strict());
const deleteCommands = deletable.map(([resource]) => z.object({
  action: z.literal("DELETE"), resource: z.literal(resource), id: CmsIdentifierSchema, expectedVersion: z.null(),
}).strict());

export const HomeNavAdminCommandSchema = z.union([
  ...createCommands, ...updateCommands, ...deleteCommands,
  z.object({action: z.literal("REORDER"), resource: z.enum([
    "MENU_ITEM", "QUICK_LINK", "EXTERNAL_LINK", "HOME_SLIDER", "HOME_SECTION", "STATISTIC", "HOME_VIDEO",
  ]), payload: CmsReorderBatchSchema}).strict(),
]);

export const HomeNavAdminListQuerySchema = CmsListQuerySchema.extend({
  resource: HomeNavResourceSchema.exclude(["SITE_SETTING"]), visibility: z.enum(["ALL", "VISIBLE", "HIDDEN"]).default("ALL"),
  location: z.enum(PrismaMenuLocation).nullable().default(null), category: z.enum(PrismaLinkCategory).nullable().default(null),
}).strict();
export const HomeNavAdminDetailQuerySchema = z.object({resource: HomeNavResourceSchema, id: CmsIdentifierSchema}).strict();

const AdminDetailBaseSchema = z.object({
  id: CmsIdentifierSchema, version: VersionSchema.nullable(), translationWorkflow: z.array(CmsTranslationWorkflowSchema).min(1).max(3),
  governance: CmsGovernanceSummarySchema.nullable(), assets: z.array(CmsPublicAssetReferenceSchema).max(3),
}).strict();
export const HomeNavAdminDetailSchema = z.discriminatedUnion("resource", inputByResource.map(([resource, input]) =>
  AdminDetailBaseSchema.extend({resource: z.literal(resource), input}).strict()) as unknown as [z.ZodObject, z.ZodObject, z.ZodObject, z.ZodObject, z.ZodObject, z.ZodObject, z.ZodObject]);
export const HomeNavAdminSummarySchema = z.object({
  id: CmsIdentifierSchema, resource: HomeNavResourceSchema, primaryText: RequiredText(500), secondaryText: OptionalText(500),
  order: OrderSchema.nullable(), isVisible: z.boolean(), version: VersionSchema.nullable(),
  translationWorkflow: z.array(CmsTranslationWorkflowSchema).min(1).max(3), governance: CmsGovernanceSummarySchema.nullable(),
}).strict();
export const HomeNavAdminListResultSchema = z.object({
  items: z.array(HomeNavAdminSummarySchema).max(50), page: CmsPageMetadataSchema,
}).strict();

export const HomeNavFailureCodeSchema = z.enum([
  "SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "VALIDATION_FAILED", "NOT_FOUND", "VERSION_CONFLICT",
  "INVALID_STATE", "URL_INVALID", "MEDIA_INVALID", "RELATION_INVALID", "IN_USE", "UNAVAILABLE",
]);
export const HomeNavMutationResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), id: CmsIdentifierSchema, resource: HomeNavResourceSchema, version: VersionSchema.nullable()}).strict(),
  z.object({ok: z.literal(false), code: HomeNavFailureCodeSchema}).strict(),
]);
export const HomeNavAdminLoadResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), data: HomeNavAdminDetailSchema}).strict(),
  z.object({ok: z.literal(false), code: HomeNavFailureCodeSchema.extract(["SESSION_INVALID", "REQUEST_INVALID", "NOT_FOUND", "UNAVAILABLE"])}).strict(),
]);

const ResolvedLabelSchema = CmsTranslationResolutionSchema.extend({label: RequiredText(255)}).strict();
type NavigationNode = {id: string; label: string; link: z.infer<typeof CmsConfiguredLinkSchema> | null; children: NavigationNode[]; translation: z.infer<typeof CmsTranslationResolutionSchema>};
export const PublicNavigationNodeSchema: z.ZodType<NavigationNode> = z.lazy(() => z.object({
  id: CmsIdentifierSchema, label: RequiredText(255), link: CmsNullableConfiguredLinkSchema,
  children: z.array(PublicNavigationNodeSchema).max(50), translation: CmsTranslationResolutionSchema,
}).strict());
export const PublicNavigationSchema = z.object({
  contentBar: z.array(PublicNavigationNodeSchema).max(20), topbar: z.array(PublicNavigationNodeSchema).max(20),
  header: z.array(PublicNavigationNodeSchema).max(100), footer: z.array(PublicNavigationNodeSchema).max(100),
}).strict();

export const PublicQuickLinkSchema = z.object({
  id: CmsIdentifierSchema, link: CmsConfiguredLinkSchema, icon: IconSchema, order: OrderSchema, translation: ResolvedLabelSchema,
}).strict();
export const PublicExternalLinkSchema = z.object({
  id: CmsIdentifierSchema, category: z.enum(PrismaLinkCategory), url: CmsHttpsExternalUrlSchema, order: OrderSchema, translation: ResolvedLabelSchema,
}).strict();
export const PublicHomeVideoSchema = z.object({
  id: CmsIdentifierSchema, youtubeUrl: z.string().url().regex(/youtube\.com|youtu\.be/),
  order: OrderSchema, translation: CmsTranslationResolutionSchema.extend({title: RequiredText(500)}).strict(),
}).strict();

export const PublicHomeSliderSchema = z.object({
  id: CmsIdentifierSchema, image: PublicMediaViewSchema, cta: CmsNullableConfiguredLinkSchema, order: OrderSchema,
  translation: CmsTranslationResolutionSchema.extend({title: OptionalText(500), subtitle: OptionalText(1_000), ctaLabel: OptionalText(120)}).strict(),
}).strict();
export const PublicHomeSectionSchema = z.object({
  id: CmsIdentifierSchema, key: HomeSectionKeySchema, order: OrderSchema, itemLimit: z.number().int().min(1).max(12),
  cta: CmsNullableConfiguredLinkSchema, background: PublicMediaViewSchema.nullable(),
  translation: CmsTranslationResolutionSchema.extend({title: RequiredText(500), subtitle: OptionalText(1_000), ctaLabel: OptionalText(120)}).strict(),
}).strict().superRefine((value, context) => {
  if ((value.cta === null) !== (value.translation.ctaLabel === null)) {
    context.addIssue({code: "custom", path: ["translation", "ctaLabel"], message: "CTA label and destination must be complete."});
  }
});
export const PublicStatisticSchema = z.object({
  id: CmsIdentifierSchema, value: z.string().regex(/^\d+(?:[.,]\d+)?$/u).max(40), suffix: OptionalText(20), icon: IconSchema,
  order: OrderSchema, translation: ResolvedLabelSchema,
}).strict();

const PublicDeanSchema = z.object({name: RequiredText(255), photo: PublicMediaViewSchema,
  position: RequiredText(255), message: RequiredText(100_000)}).strict();
const PublicVideoSchema = z.object({url: CmsHttpsExternalUrlSchema, poster: PublicMediaViewSchema,
  title: RequiredText(500), description: OptionalText(100_000)}).strict();
export const PublicSiteSettingSchema = z.object({
  facultyName: RequiredText(500), tagline: OptionalText(500), addresses: z.array(RequiredText(5_000)).max(2),
  dean: PublicDeanSchema.nullable(), video: PublicVideoSchema.nullable(), email: ContactEmailSchema, phone: ContactPhoneSchema,
  logo: PublicMediaViewSchema.nullable(), favicon: PublicMediaViewSchema.nullable(),
  socialLinks: z.object({facebook: CmsHttpsExternalUrlSchema.nullable(), instagram: CmsHttpsExternalUrlSchema.nullable(),
    youtube: CmsHttpsExternalUrlSchema.nullable(), x: CmsHttpsExternalUrlSchema.nullable()}).strict(),
  translation: CmsTranslationResolutionSchema,
}).strict();

const StudyProgramCodeSchema = z.enum(["IAT", "IH", "AFI", "SAA", "TASPI"]);
export const PublicHomeStudyProgramSchema = z.object({
  id: CmsIdentifierSchema, code: StudyProgramCodeSchema, slug: RequiredText(191), name: RequiredText(500),
  degree: RequiredText(120), accreditation: OptionalText(255), logo: PublicMediaViewSchema.nullable(),
  translation: CmsTranslationResolutionSchema,
}).strict();
export const PublicHomePostCardSchema = z.object({
  id: CmsIdentifierSchema, type: z.enum(["BERITA", "PENGUMUMAN", "KOLOM"]), slug: RequiredText(191),
  title: RequiredText(500), excerpt: OptionalText(1_000), publishedAt: DateTimeSchema, cover: PublicMediaViewSchema.nullable(),
  translation: CmsTranslationResolutionSchema,
}).strict();

const PublicServiceCardSchema = PublicContentCardSchema.extend({resource: z.literal("SERVICE")}).strict();
const PublicPartnershipCardSchema = PublicContentCardSchema.extend({resource: z.literal("PARTNERSHIP")}).strict();
const PublicEventCardSchema = PublicContentCardSchema.extend({resource: z.literal("EVENT")}).strict();
const PublicTestimonialCardSchema = PublicContentCardSchema.extend({resource: z.literal("TESTIMONIAL")}).strict();
const PublicNewsCardSchema = PublicHomePostCardSchema.extend({type: z.literal("BERITA")}).strict();
const PublicAnnouncementCardSchema = PublicHomePostCardSchema.extend({type: z.literal("PENGUMUMAN")}).strict();
const PublicColumnCardSchema = PublicHomePostCardSchema.extend({type: z.literal("KOLOM")}).strict();

export const PublicHomeSnapshotQuerySchema = z.object({locale: LocaleSchema}).strict();
export const PublicHomeSnapshotSchema = z.object({
  locale: LocaleSchema, generatedAt: DateTimeSchema, navigation: PublicNavigationSchema,
  externalLinks: z.array(PublicExternalLinkSchema).max(100), sections: z.array(PublicHomeSectionSchema).max(15),
  sliders: z.array(PublicHomeSliderSchema).max(12), homeVideos: z.array(PublicHomeVideoSchema).max(12), quickLinks: z.array(PublicQuickLinkSchema).max(12),
  statistics: z.array(PublicStatisticSchema).max(12), siteSetting: PublicSiteSettingSchema,
  content: z.object({
    studyPrograms: z.array(PublicHomeStudyProgramSchema).max(5), news: z.array(PublicNewsCardSchema).max(12),
    announcements: z.array(PublicAnnouncementCardSchema).max(12), columns: z.array(PublicColumnCardSchema).max(12),
    services: z.array(PublicServiceCardSchema).max(12), partnerships: z.array(PublicPartnershipCardSchema).max(12),
    events: z.array(PublicEventCardSchema).max(12), testimonials: z.array(PublicTestimonialCardSchema).max(12),
  }).strict(),
}).strict().superRefine((value, context) => {
  const sectionKeys = value.sections.map(({key}) => key);
  if (new Set(sectionKeys).size !== sectionKeys.length) context.addIssue({code: "custom", path: ["sections"], message: "Home section keys must be unique."});
  const sectionMap = new Map(value.sections.map((section) => [section.key, section]));
  const orderedCollections = [value.sections, value.externalLinks, value.sliders, value.quickLinks, value.statistics, value.homeVideos];
  for (const [index, collection] of orderedCollections.entries()) {
    const ids = collection.map(({id}) => id); const orders = collection.map(({order}) => order);
    if (new Set(ids).size !== ids.length || orders.some((order, itemIndex) => itemIndex > 0 && order < orders[itemIndex - 1]!)) {
      context.addIssue({code: "custom", path: [["sections", "externalLinks", "sliders", "quickLinks", "statistics", "homeVideos"][index]!], message: "Public collections must be unique and deterministically ordered."});
    }
  }
  const programCodes = value.content.studyPrograms.map(({code}) => code);
  const expected = ["IAT", "IH", "AFI", "SAA", "TASPI"];
  if (programCodes.length !== 0 && (programCodes.length !== 5 || programCodes.some((code, index) => code !== expected[index]))) {
    context.addIssue({code: "custom", path: ["content", "studyPrograms"], message: "Study programs must use the FUSPI contract order."});
  }
  const populated = [
    ["HERO", value.sliders.length], ["QUICKLINK", value.quickLinks.length], ["STATS", value.statistics.length],
    ["PRODI", value.content.studyPrograms.length], ["ANNOUNCEMENT", value.content.announcements.length],
    ["SERVICE", value.content.services.length], ["NEWS", value.content.news.length],
    ["PARTNERSHIP", value.content.partnerships.length], ["COLUMN", value.content.columns.length],
    ["AGENDA", value.content.events.length], ["TESTIMONIAL", value.content.testimonials.length],
  ] as const;
  for (const [key, count] of populated) {
    const section = sectionMap.get(key);
    if ((section && (count === 0 || count > section.itemLimit)) || (!section && count > 0)) {
      context.addIssue({code: "custom", path: ["sections"], message: `${key} visibility and item limits must match public content.`});
    }
  }
  if ((sectionMap.has("DEAN") && value.siteSetting.dean === null) || (!sectionMap.has("DEAN") && value.siteSetting.dean !== null)) {
    context.addIssue({code: "custom", path: ["siteSetting", "dean"], message: "Dean content requires a visible dean section."});
  }
  if ((sectionMap.has("VIDEO") && value.siteSetting.video === null) || (!sectionMap.has("VIDEO") && value.siteSetting.video !== null)) {
    context.addIssue({code: "custom", path: ["siteSetting", "video"], message: "Video content requires a visible video section."});
  }
  if (sectionMap.has("CTA") && sectionMap.get("CTA")!.cta === null) {
    context.addIssue({code: "custom", path: ["sections"], message: "A visible CTA section requires a configured destination."});
  }
});
export const PublicHomeSnapshotResultSchema = z.discriminatedUnion("ok", [
  z.object({ok: z.literal(true), data: PublicHomeSnapshotSchema}).strict(),
  z.object({ok: z.literal(false), code: z.enum(["REQUEST_INVALID", "UNAVAILABLE"])}).strict(),
]);

export type HomeSectionKey = z.infer<typeof HomeSectionKeySchema>;
export type HomeNavResource = z.infer<typeof HomeNavResourceSchema>;
export type HomeNavAdminCommand = z.infer<typeof HomeNavAdminCommandSchema>;
export type HomeNavMutationResult = z.infer<typeof HomeNavMutationResultSchema>;
export type PublicHomeSnapshot = z.infer<typeof PublicHomeSnapshotSchema>;
