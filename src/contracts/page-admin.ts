import {z} from "zod";

import {PublicMediaViewSchema} from "@/contracts/media";
import {
  PageCreateInputSchema,
  PageDeleteInputSchema,
  PageDetailViewSchema,
  PageListQuerySchema,
  PageListResultSchema,
  PageMutationResultSchema,
  PagePublicationMutationInputSchema,
  PageStatusSchema,
  PageUpdateInputSchema,
  type PageMutationFailureCode,
  type PageMutationResult,
} from "@/features/content/pages/contract";

export const AdminPageListQuerySchema = PageListQuerySchema;
export const AdminPageListResultSchema = PageListResultSchema;

const RawAdminPageListQuerySchema = z.object({
  page: z.string().regex(/^(?:[1-9]\d{0,3}|10000)$/u).optional(),
  pageSize: z.enum(["10", "20", "50"]).optional(),
  status: z.union([z.literal("ALL"), PageStatusSchema]).optional(),
  search: PageListQuerySchema.shape.search.optional(),
  sort: PageListQuerySchema.shape.sort.optional(),
}).strict();

/**
 * Raw URL query contract. Callers must preserve repeated values as arrays so
 * duplicate parameters fail instead of being silently collapsed.
 */
export const AdminPageListSearchParamsSchema = RawAdminPageListQuerySchema.transform((value) =>
  AdminPageListQuerySchema.parse({
    page: value.page ? Number(value.page) : 1,
    pageSize: value.pageSize ? Number(value.pageSize) : 20,
    status: value.status ?? "ALL",
    search: value.search ?? "",
    sort: value.sort ?? "UPDATED_DESC",
  }));

export const AdminPageEditorViewSchema = PageDetailViewSchema.extend({
  hero: PublicMediaViewSchema.nullable(),
}).strict().superRefine((value, context) => {
  if (value.heroMediaId === null && value.hero !== null) {
    context.addIssue({
      code: "custom",
      path: ["hero"],
      message: "Unexpected Page hero view.",
    });
  }
  if (value.heroMediaId !== null && value.hero?.id !== value.heroMediaId) {
    context.addIssue({
      code: "custom",
      path: ["hero"],
      message: "Missing or mismatched Page hero view.",
    });
  }
});

export const AdminPageTransportCommandSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("CREATE"), payload: PageCreateInputSchema}).strict(),
  z.object({action: z.literal("UPDATE"), payload: PageUpdateInputSchema}).strict(),
  z.object({
    action: z.literal("PUBLICATION"),
    payload: PagePublicationMutationInputSchema,
  }).strict(),
  z.object({action: z.literal("DELETE"), payload: PageDeleteInputSchema}).strict(),
]);

export const AdminPageTransportFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "CSRF_INVALID",
  "REQUEST_INVALID",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "VERSION_CONFLICT",
  "INVALID_STATE",
  "SLUG_CONFLICT",
  "HIERARCHY_CYCLE",
  "MEDIA_INVALID",
  "PARENT_INVALID",
  "UNAVAILABLE",
]);

export const AdminPageMutationResponseSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    pageId: PageDetailViewSchema.shape.id,
    version: PageDetailViewSchema.shape.version,
    status: PageStatusSchema,
    updatedAt: z.iso.datetime({offset: true}),
  }).strict(),
  z.object({
    ok: z.literal(false),
    code: AdminPageTransportFailureCodeSchema,
  }).strict(),
]);

const PAGE_FAILURE_MAPPING = {
  UNAUTHENTICATED: "SESSION_INVALID",
  FORBIDDEN: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  INVALID_STATE: "INVALID_STATE",
  SLUG_CONFLICT: "SLUG_CONFLICT",
  HIERARCHY_CYCLE: "HIERARCHY_CYCLE",
  MEDIA_NOT_FOUND: "MEDIA_INVALID",
  MEDIA_FORBIDDEN: "MEDIA_INVALID",
  PARENT_NOT_FOUND: "PARENT_INVALID",
  INTERNAL_ERROR: "UNAVAILABLE",
} as const satisfies Record<
  PageMutationFailureCode,
  z.infer<typeof AdminPageTransportFailureCodeSchema>
>;

export function toAdminPageMutationResponse(rawResult: unknown): AdminPageMutationResponse {
  const result = PageMutationResultSchema.parse(rawResult) as PageMutationResult;
  if (result.ok) {
    return AdminPageMutationResponseSchema.parse({
      ...result,
      updatedAt: result.updatedAt.toISOString(),
    });
  }

  return AdminPageMutationResponseSchema.parse({
    ok: false,
    code: PAGE_FAILURE_MAPPING[result.code],
  });
}

export type AdminPageListQuery = z.infer<typeof AdminPageListQuerySchema>;
export type AdminPageListResult = z.infer<typeof AdminPageListResultSchema>;
export type AdminPageEditorView = z.infer<typeof AdminPageEditorViewSchema>;
export type AdminPageTransportCommand = z.infer<typeof AdminPageTransportCommandSchema>;
export type AdminPageMutationResponse = z.infer<typeof AdminPageMutationResponseSchema>;
