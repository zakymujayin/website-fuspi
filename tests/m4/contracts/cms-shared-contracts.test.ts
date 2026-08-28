import {describe, expect, it} from "vitest";

import {
  CmsAdminTransportFailureSchema,
  CmsAdminMutationSuccessSchema,
  CmsConfiguredLinkSchema,
  CmsGovernanceSummarySchema,
  CmsHttpsExternalUrlSchema,
  CmsInternalPathSchema,
  CmsListQuerySchema,
  CmsPageMetadataSchema,
  CmsPublicAssetReferenceSchema,
  CmsPublicDocumentViewSchema,
  CmsReorderBatchSchema,
  CmsResourceReferenceSchema,
  CmsRevisionSummarySchema,
  CmsTranslationLocaleSetSchema,
  CmsTranslationResolutionSchema,
  CmsTranslationWorkflowSchema,
  collectDuplicateAwareSearchParams,
  normalizeCmsListSearchParams,
} from "@/contracts/cms";

const publicImage = {
  id: "media-1",
  url: "/uploads/2026/08/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp",
  mimeType: "image/webp",
  size: 512,
  alt: "Gedung fakultas",
  isDecorative: false,
  width: 1200,
  height: 800,
  focalX: null,
  focalY: null,
} as const;

const publicDocument = {
  id: "document-1",
  slug: "pedoman-akademik",
  translation: {
    requestedLocale: "id",
    resolvedLocale: "id",
    isFallback: false,
    title: "Pedoman Akademik",
    category: "Pedoman",
  },
  url: "/uploads/2026/08/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.pdf",
  mimeType: "application/pdf",
  size: 1024,
  version: 1,
} as const;

describe("shared CMS query contracts", () => {
  it("normalizes a bounded duplicate-aware list query", () => {
    expect(normalizeCmsListSearchParams(new URLSearchParams({
      page: "2",
      pageSize: "50",
      search: "  filsafat  ",
      direction: "ASC",
    }))).toEqual({page: 2, pageSize: 50, search: "filsafat", direction: "ASC"});
  });

  it("preserves duplicates so the strict raw schema rejects them", () => {
    const params = new URLSearchParams("page=1&page=2&search=test");
    expect(collectDuplicateAwareSearchParams(params)).toEqual({page: ["1", "2"], search: "test"});
    expect(() => normalizeCmsListSearchParams(params)).toThrow();
  });

  it("rejects unknown, prototype-like, hostile, and out-of-bound query input", () => {
    expect(() => normalizeCmsListSearchParams(new URLSearchParams("take=999"))).toThrow();
    expect(() => normalizeCmsListSearchParams(new URLSearchParams("__proto__=polluted"))).toThrow();
    expect(() => normalizeCmsListSearchParams(new URLSearchParams("search=hello%00world"))).toThrow();
    expect(CmsListQuerySchema.safeParse({page: 1, pageSize: 100, search: "", direction: "DESC"}).success).toBe(false);
  });

  it("requires internally consistent serializable page metadata", () => {
    const valid = {page: 2, pageSize: 10, total: 25, totalPages: 3, hasNextPage: true, hasPreviousPage: true};
    expect(CmsPageMetadataSchema.parse(valid)).toEqual(valid);
    expect(CmsPageMetadataSchema.safeParse({...valid, totalPages: 2}).success).toBe(false);
    expect(CmsPageMetadataSchema.safeParse({...valid, hasNextPage: false}).success).toBe(false);
  });
});

describe("shared CMS translation and reorder contracts", () => {
  it("requires a unique Indonesian translation locale set", () => {
    expect(CmsTranslationLocaleSetSchema.parse(["id", "en", "ar"])).toEqual(["id", "en", "ar"]);
    expect(CmsTranslationLocaleSetSchema.safeParse(["en", "ar"]).success).toBe(false);
    expect(CmsTranslationLocaleSetSchema.safeParse(["id", "id"]).success).toBe(false);
  });

  it("requires review metadata for REVIEWED and PUBLISHED translations", () => {
    const base = {locale: "en", sourceVersion: 2, translatorId: "user-1"};
    expect(CmsTranslationWorkflowSchema.safeParse({
      ...base,
      status: "PUBLISHED",
      reviewerId: "user-2",
      reviewedAt: "2026-08-04T01:00:00.000Z",
    }).success).toBe(true);
    expect(CmsTranslationWorkflowSchema.safeParse({
      ...base,
      status: "PUBLISHED",
      reviewerId: null,
      reviewedAt: null,
    }).success).toBe(false);
    expect(CmsTranslationWorkflowSchema.safeParse({
      ...base,
      status: "STALE",
      reviewerId: "user-2",
      reviewedAt: "2026-08-04T01:00:00.000Z",
    }).success).toBe(true);
    expect(CmsTranslationWorkflowSchema.safeParse({
      ...base,
      status: "DRAFT",
      reviewerId: "user-2",
      reviewedAt: "2026-08-04T01:00:00.000Z",
    }).success).toBe(false);
  });

  it("only permits exact locale resolution or fallback to Indonesian", () => {
    expect(CmsTranslationResolutionSchema.safeParse({requestedLocale: "ar", resolvedLocale: "id", isFallback: true}).success).toBe(true);
    expect(CmsTranslationResolutionSchema.safeParse({requestedLocale: "ar", resolvedLocale: "en", isFallback: true}).success).toBe(false);
    expect(CmsTranslationResolutionSchema.safeParse({requestedLocale: "en", resolvedLocale: "id", isFallback: false}).success).toBe(false);
  });

  it("accepts only unique IDs with contiguous zero-based reorder positions", () => {
    expect(CmsReorderBatchSchema.safeParse({items: [
      {id: "first", position: 0},
      {id: "second", position: 1},
    ]}).success).toBe(true);
    expect(CmsReorderBatchSchema.safeParse({items: [
      {id: "same", position: 0},
      {id: "same", position: 1},
    ]}).success).toBe(false);
    expect(CmsReorderBatchSchema.safeParse({items: [
      {id: "first", position: 0},
      {id: "second", position: 2},
    ]}).success).toBe(false);
    expect(CmsReorderBatchSchema.safeParse({items: [{id: "first", position: 0, orderBy: {id: "desc"}}]}).success).toBe(false);
  });
});

describe("shared CMS link and public asset contracts", () => {
  it("accepts canonical internal paths and public HTTPS URLs", () => {
    expect(CmsConfiguredLinkSchema.parse({kind: "INTERNAL", href: "/id/program-studi?tab=iat"})).toEqual({kind: "INTERNAL", href: "/id/program-studi?tab=iat"});
    expect(CmsConfiguredLinkSchema.parse({kind: "EXTERNAL", href: "https://pmb.uinbanten.ac.id/"})).toEqual({kind: "EXTERNAL", href: "https://pmb.uinbanten.ac.id/"});
  });

  it.each([
    "//evil.example/path",
    "/id/%2e%2e/admin",
    "/id/%2F%2Fevil.example",
    "/id/hello%0aworld",
    "/id/hello\\world",
    "/id/hello\u0000world",
    "/id/hello\u202eworld",
  ])("rejects hostile internal path %s", (value) => {
    expect(CmsInternalPathSchema.safeParse(value).success).toBe(false);
  });

  it.each([
    "http://example.com",
    "https://user:secret@example.com",
    "https://localhost/admin",
    "https://127.0.0.1/admin",
    "https://10.0.0.1/admin",
    "https://[::1]/admin",
    "https://example.com/hello%0aworld",
    "https://example.com/hello\u202eworld",
    "javascript:alert(1)",
  ])("rejects unsafe external URL %s", (value) => {
    expect(CmsHttpsExternalUrlSchema.safeParse(value).success).toBe(false);
  });

  it("projects public PDF metadata without accepting storage keys", () => {
    expect(CmsPublicDocumentViewSchema.parse(publicDocument)).toEqual(publicDocument);
    expect(CmsPublicDocumentViewSchema.safeParse({...publicDocument, storageKey: "private/secret.pdf"}).success).toBe(false);
    expect(CmsPublicDocumentViewSchema.safeParse({...publicDocument, url: "/private/secret.pdf"}).success).toBe(false);
  });

  it("accepts only strict safe media or document references", () => {
    expect(CmsPublicAssetReferenceSchema.parse({kind: "MEDIA", media: publicImage})).toEqual({kind: "MEDIA", media: publicImage});
    expect(CmsPublicAssetReferenceSchema.parse({kind: "DOCUMENT", document: publicDocument})).toEqual({kind: "DOCUMENT", document: publicDocument});
    expect(CmsPublicAssetReferenceSchema.safeParse({kind: "MEDIA", media: {...publicImage, storageClass: "PRIVATE"}}).success).toBe(false);
  });
});

describe("shared CMS resource, governance, revision, and transport outputs", () => {
  const resource = {resourceType: "StudyProgram", resourceId: "program-iat", version: 3} as const;

  it("rejects arbitrary resource names and Prisma-shaped selectors", () => {
    expect(CmsResourceReferenceSchema.parse(resource)).toEqual(resource);
    expect(CmsResourceReferenceSchema.safeParse({...resource, resourceType: "Ticket"}).success).toBe(false);
    expect(CmsResourceReferenceSchema.safeParse({...resource, select: {trackingTokenHash: true}}).success).toBe(false);
  });

  it("keeps governance and revision summaries bounded and snapshot-free", () => {
    const governance = {
      status: "CURRENT",
      contentOwnerId: "admin-1",
      lastReviewedAt: "2026-08-04T01:00:00.000Z",
      reviewDueAt: "2027-08-04T01:00:00.000Z",
      expiresAt: null,
    } as const;
    expect(CmsGovernanceSummarySchema.parse(governance)).toEqual(governance);

    const revision = {
      id: "revision-1",
      resource,
      locale: "id",
      changeSummary: "Updated accreditation source",
      actorId: "admin-1",
      createdAt: "2026-08-04T01:00:00.000Z",
    } as const;
    expect(CmsRevisionSummarySchema.parse(revision)).toEqual(revision);
    expect(CmsRevisionSummarySchema.safeParse({...revision, snapshotJson: {token: "secret"}}).success).toBe(false);
  });

  it("uses ISO timestamps and rejects unknown mutation output fields", () => {
    const success = {ok: true, id: "program-iat", version: 2, updatedAt: "2026-08-04T01:00:00.000Z"} as const;
    expect(CmsAdminMutationSuccessSchema.parse(success)).toEqual(success);
    expect(CmsAdminMutationSuccessSchema.safeParse({...success, updatedAt: new Date()}).success).toBe(false);
    expect(CmsAdminMutationSuccessSchema.safeParse({...success, storageKey: "private/key"}).success).toBe(false);
  });

  it("exposes only deterministic non-technical ADMIN failure codes", () => {
    expect(CmsAdminTransportFailureSchema.parse({ok: false, code: "VALIDATION_FAILED"})).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(CmsAdminTransportFailureSchema.safeParse({ok: false, code: "P2002"}).success).toBe(false);
    expect(CmsAdminTransportFailureSchema.safeParse({ok: false, code: "UNAVAILABLE", error: "database secret"}).success).toBe(false);
  });
});
