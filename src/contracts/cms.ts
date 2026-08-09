import {z} from "zod";

import {PublicMediaViewSchema} from "@/contracts/media";
import {LocaleSchema} from "@/contracts/platform";
import {
  GovernanceStatus as PrismaGovernanceStatus,
  TranslationStatus as PrismaTranslationStatus,
} from "@/generated/prisma/enums";

const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,190}$/u;
const UNSAFE_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const UNSAFE_URL_TEXT_PATTERN = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const ENCODED_PATH_SEPARATOR_PATTERN = /%(?:2e|2f|5c)/iu;
const ENCODED_CONTROL_PATTERN = /%(?:0[0-9a-f]|1[0-9a-f]|7f|8[0-9a-f]|9[0-9a-f])/iu;
const PROTOTYPE_PROPERTY_NAMES = new Set(["__proto__", "constructor", "prototype"]);

export const CmsIdentifierSchema = z.string().trim().regex(SAFE_IDENTIFIER_PATTERN);

export const CmsSearchSchema = z.string().trim().max(120).refine(
  (value) => !UNSAFE_TEXT_PATTERN.test(value),
  "Invalid search text.",
);

export const CmsPageNumberSchema = z.number().int().min(1).max(10_000);
export const CmsPageSizeSchema = z.union([z.literal(10), z.literal(20), z.literal(50)]);
export const CmsSortDirectionSchema = z.enum(["ASC", "DESC"]);

export const CmsListQuerySchema = z.object({
  page: CmsPageNumberSchema.default(1),
  pageSize: CmsPageSizeSchema.default(20),
  search: CmsSearchSchema.default(""),
  direction: CmsSortDirectionSchema.default("DESC"),
}).strict();

export const CmsRawListSearchParamsSchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  search: CmsSearchSchema.optional(),
  direction: CmsSortDirectionSchema.optional(),
}).strict();

export function collectDuplicateAwareSearchParams(params: URLSearchParams) {
  const collected: Record<string, string | string[]> = Object.create(null) as Record<
    string,
    string | string[]
  >;

  for (const [key, value] of params.entries()) {
    if (PROTOTYPE_PROPERTY_NAMES.has(key)) {
      throw new Error("Invalid search parameter.");
    }
    const current = collected[key];
    if (current === undefined) {
      collected[key] = value;
    } else if (Array.isArray(current)) {
      current.push(value);
    } else {
      collected[key] = [current, value];
    }
  }

  return collected;
}

export function normalizeCmsListSearchParams(params: URLSearchParams): CmsListQuery {
  const raw = CmsRawListSearchParamsSchema.parse(collectDuplicateAwareSearchParams(params));
  return CmsListQuerySchema.parse({
    page: raw.page === undefined ? 1 : Number(raw.page),
    pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize),
    search: raw.search ?? "",
    direction: raw.direction ?? "DESC",
  });
}

export const CmsPageMetadataSchema = z.object({
  page: CmsPageNumberSchema,
  pageSize: CmsPageSizeSchema,
  total: z.number().int().min(0).max(2_147_483_647),
  totalPages: z.number().int().min(0).max(214_748_365),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
}).strict().superRefine((value, context) => {
  const totalPages = Math.ceil(value.total / value.pageSize);
  if (value.totalPages !== totalPages) {
    context.addIssue({code: "custom", path: ["totalPages"], message: "Invalid page total."});
  }
  if (value.hasNextPage !== (value.page < totalPages)) {
    context.addIssue({code: "custom", path: ["hasNextPage"], message: "Invalid next-page state."});
  }
  if (value.hasPreviousPage !== (value.page > 1)) {
    context.addIssue({
      code: "custom",
      path: ["hasPreviousPage"],
      message: "Invalid previous-page state.",
    });
  }
});

export const CmsTranslationStatusSchema = z.enum(PrismaTranslationStatus);
export const CmsGovernanceStatusSchema = z.enum(PrismaGovernanceStatus);

export const CmsTranslationLocaleSetSchema = z.array(LocaleSchema).min(1).max(3)
  .superRefine((locales, context) => {
    if (!locales.includes("id")) {
      context.addIssue({code: "custom", message: "Indonesian translation is required."});
    }
    if (new Set(locales).size !== locales.length) {
      context.addIssue({code: "custom", message: "Translation locales must be unique."});
    }
  });

export const CmsTranslationWorkflowSchema = z.object({
  locale: LocaleSchema,
  status: CmsTranslationStatusSchema,
  sourceVersion: z.number().int().positive().max(2_147_483_647),
  translatorId: CmsIdentifierSchema.nullable(),
  reviewerId: CmsIdentifierSchema.nullable(),
  reviewedAt: z.iso.datetime({offset: true}).nullable(),
}).strict().superRefine((value, context) => {
  const isReviewed = value.status === "REVIEWED" || value.status === "PUBLISHED";
  const hasReviewer = value.reviewerId !== null;
  const hasReviewTime = value.reviewedAt !== null;
  if (hasReviewer !== hasReviewTime) {
    context.addIssue({
      code: "custom",
      path: ["reviewerId"],
      message: "Translation review metadata must be complete.",
    });
  }
  if (isReviewed && (value.reviewerId === null || value.reviewedAt === null)) {
    context.addIssue({
      code: "custom",
      path: ["reviewerId"],
      message: "Reviewed translations require review metadata.",
    });
  }
  if (value.status === "DRAFT" && value.reviewedAt !== null) {
    context.addIssue({
      code: "custom",
      path: ["reviewedAt"],
      message: "Unreviewed translations cannot have a review timestamp.",
    });
  }
});

export const CmsTranslationResolutionSchema = z.object({
  requestedLocale: LocaleSchema,
  resolvedLocale: LocaleSchema,
  isFallback: z.boolean(),
}).strict().superRefine((value, context) => {
  const exact = value.requestedLocale === value.resolvedLocale;
  const validFallback = value.resolvedLocale === "id" && value.requestedLocale !== "id";
  if (value.isFallback ? !validFallback : !exact) {
    context.addIssue({code: "custom", message: "Invalid translation fallback state."});
  }
});

export const CmsReorderItemSchema = z.object({
  id: CmsIdentifierSchema,
  position: z.number().int().min(0).max(199),
}).strict();

export const CmsReorderBatchSchema = z.object({
  items: z.array(CmsReorderItemSchema).min(1).max(200),
}).strict().superRefine(({items}, context) => {
  if (new Set(items.map(({id}) => id)).size !== items.length) {
    context.addIssue({code: "custom", path: ["items"], message: "Reorder IDs must be unique."});
  }
  const positions = items.map(({position}) => position).sort((left, right) => left - right);
  if (new Set(positions).size !== items.length || positions.some((position, index) => position !== index)) {
    context.addIssue({
      code: "custom",
      path: ["items"],
      message: "Reorder positions must be unique and contiguous from zero.",
    });
  }
});

function isSafeInternalPath(value: string) {
  if (
    !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || UNSAFE_URL_TEXT_PATTERN.test(value)
    || ENCODED_PATH_SEPARATOR_PATTERN.test(value)
    || ENCODED_CONTROL_PATTERN.test(value)
  ) return false;

  try {
    const url = new URL(value, "https://contract.invalid");
    const decodedPath = decodeURIComponent(url.pathname);
    return url.origin === "https://contract.invalid"
      && !url.username
      && !url.password
      && !decodedPath.includes("\\")
      && !ENCODED_PATH_SEPARATOR_PATTERN.test(decodedPath)
      && !decodedPath.split("/").some((segment) => segment === "." || segment === "..");
  } catch {
    return false;
  }
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (
    normalized.includes(":")
    && (
      normalized === "::1"
      || normalized.startsWith("fc")
      || normalized.startsWith("fd")
      || normalized.startsWith("fe80:")
    )
  ) return true;

  const octets = normalized.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  return octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || octets.every((octet) => octet === 0);
}

export const CmsInternalPathSchema = z.string().min(1).max(2_048).refine(
  isSafeInternalPath,
  "Invalid internal application path.",
);

export const CmsHttpsExternalUrlSchema = z.string().min(1).max(2_048).refine((value) => {
  if (
    UNSAFE_URL_TEXT_PATTERN.test(value)
    || ENCODED_CONTROL_PATTERN.test(value)
    || value.includes("\\")
  ) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname.length > 0
      && !url.username
      && !url.password
      && !isPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}, "Invalid public HTTPS URL.");

export const CmsConfiguredLinkSchema = z.discriminatedUnion("kind", [
  z.object({kind: z.literal("INTERNAL"), href: CmsInternalPathSchema}).strict(),
  z.object({kind: z.literal("EXTERNAL"), href: CmsHttpsExternalUrlSchema}).strict(),
]);

export const CmsNullableConfiguredLinkSchema = CmsConfiguredLinkSchema.nullable();

export const CmsPublicDocumentViewSchema = z.object({
  id: CmsIdentifierSchema,
  slug: z.string().trim().min(1).max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  translation: CmsTranslationResolutionSchema.extend({
    title: z.string().trim().min(1).max(255).refine((value) => !UNSAFE_TEXT_PATTERN.test(value)),
    category: z.string().trim().min(1).max(120).refine((value) => !UNSAFE_TEXT_PATTERN.test(value)).nullable(),
  }).strict(),
  url: PublicMediaViewSchema.shape.url,
  mimeType: z.literal("application/pdf"),
  size: z.number().int().positive().max(20_971_520),
  version: z.number().int().positive().max(2_147_483_647),
}).strict();

export const CmsPublicAssetReferenceSchema = z.discriminatedUnion("kind", [
  z.object({kind: z.literal("MEDIA"), media: PublicMediaViewSchema}).strict(),
  z.object({kind: z.literal("DOCUMENT"), document: CmsPublicDocumentViewSchema}).strict(),
]);

export const CmsResourceTypeSchema = z.enum([
  "Post",
  "Page",
  "StudyProgram",
  "Lecturer",
  "Staff",
  "Research",
  "CommunityService",
  "Unit",
  "Service",
  "Partnership",
  "Scholarship",
  "Achievement",
  "StudentActivity",
  "Document",
  "Album",
  "Event",
  "Faq",
  "Testimonial",
  "MenuItem",
  "QuickLink",
  "ExternalLink",
  "HomeSlider",
  "HomeSection",
  "Statistic",
  "SiteSetting",
  "Room",
  "AdmissionInfo",
  "SiteAlert",
  "ServiceEndpoint",
  "ServiceIncident",
]);

export const CmsResourceReferenceSchema = z.object({
  resourceType: CmsResourceTypeSchema,
  resourceId: CmsIdentifierSchema,
  version: z.number().int().positive().max(2_147_483_647).nullable(),
}).strict();

export const CmsGovernanceSummarySchema = z.object({
  status: CmsGovernanceStatusSchema,
  contentOwnerId: CmsIdentifierSchema.nullable(),
  lastReviewedAt: z.iso.datetime({offset: true}).nullable(),
  reviewDueAt: z.iso.datetime({offset: true}).nullable(),
  expiresAt: z.iso.datetime({offset: true}).nullable(),
}).strict();

export const CmsRevisionSummarySchema = z.object({
  id: CmsIdentifierSchema,
  resource: CmsResourceReferenceSchema,
  locale: LocaleSchema.nullable(),
  changeSummary: z.string().trim().max(500).refine((value) => !UNSAFE_TEXT_PATTERN.test(value)).nullable(),
  actorId: CmsIdentifierSchema.nullable(),
  createdAt: z.iso.datetime({offset: true}),
}).strict();

export const CmsAdminTransportFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "VERSION_CONFLICT",
  "INVALID_STATE",
  "CONFLICT",
  "IN_USE",
  "UNAVAILABLE",
]);

export const CmsAdminTransportFailureSchema = z.object({
  ok: z.literal(false),
  code: CmsAdminTransportFailureCodeSchema,
}).strict();

export const CmsAdminMutationSuccessSchema = z.object({
  ok: z.literal(true),
  id: CmsIdentifierSchema,
  version: z.number().int().positive().max(2_147_483_647).nullable(),
  updatedAt: z.iso.datetime({offset: true}),
}).strict();

export type CmsListQuery = z.infer<typeof CmsListQuerySchema>;
export type CmsPageMetadata = z.infer<typeof CmsPageMetadataSchema>;
export type CmsTranslationWorkflow = z.infer<typeof CmsTranslationWorkflowSchema>;
export type CmsTranslationResolution = z.infer<typeof CmsTranslationResolutionSchema>;
export type CmsReorderBatch = z.infer<typeof CmsReorderBatchSchema>;
export type CmsConfiguredLink = z.infer<typeof CmsConfiguredLinkSchema>;
export type CmsPublicDocumentView = z.infer<typeof CmsPublicDocumentViewSchema>;
export type CmsPublicAssetReference = z.infer<typeof CmsPublicAssetReferenceSchema>;
export type CmsResourceType = z.infer<typeof CmsResourceTypeSchema>;
export type CmsResourceReference = z.infer<typeof CmsResourceReferenceSchema>;
export type CmsGovernanceSummary = z.infer<typeof CmsGovernanceSummarySchema>;
export type CmsRevisionSummary = z.infer<typeof CmsRevisionSummarySchema>;
export type CmsAdminTransportFailureCode = z.infer<typeof CmsAdminTransportFailureCodeSchema>;
export type CmsAdminTransportFailure = z.infer<typeof CmsAdminTransportFailureSchema>;
export type CmsAdminMutationSuccess = z.infer<typeof CmsAdminMutationSuccessSchema>;
