import {describe, expect, it} from "vitest";

import {
  AdminPageEditorViewSchema,
  AdminPageListResultSchema,
  AdminPageListSearchParamsSchema,
  AdminPageMutationResponseSchema,
  AdminPageTransportCommandSchema,
  toAdminPageMutationResponse,
} from "@/contracts/page-admin";

const ID_TRANSLATION = {
  title: "Profil Fakultas",
  content: "<p>Profil resmi FUSPI.</p>",
  metaTitle: "Profil FUSPI",
  metaDesc: "Profil Fakultas Ushuluddin dan Pemikiran Islam.",
};

const TRANSLATIONS = {
  id: ID_TRANSLATION,
  en: {...ID_TRANSLATION, title: "Faculty Profile"},
  ar: {...ID_TRANSLATION, title: "نبذة عن الكلية"},
};

const MUTABLE_FIELDS = {
  slug: "profil-fakultas",
  parentId: null,
  heroMediaId: "media-hero-1",
  order: 2,
  translations: TRANSLATIONS,
};

const HERO = {
  id: "media-hero-1",
  url: `/uploads/2026/08/${"a".repeat(64)}.webp`,
  mimeType: "image/webp" as const,
  size: 42_000,
  alt: "Gedung FUSPI",
  isDecorative: false,
  width: 1_600,
  height: 900,
  focalX: null,
  focalY: null,
};

const SUMMARY = {
  id: "page-1",
  slug: MUTABLE_FIELDS.slug,
  title: ID_TRANSLATION.title,
  titleLocale: "id" as const,
  availableLocales: ["id", "en", "ar"] as const,
  status: "PUBLISHED" as const,
  version: 3,
  order: 2,
  parentId: null,
  parentTitle: null,
  hasChildren: true,
  updatedAt: "2026-08-03T16:00:00.000Z",
};

describe("M4 Page admin list transport contract", () => {
  it("normalizes singular raw search parameters into the bounded Page query", () => {
    expect(AdminPageListSearchParamsSchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "",
      sort: "UPDATED_DESC",
    });
    expect(AdminPageListSearchParamsSchema.parse({
      page: "10000",
      pageSize: "50",
      status: "ARCHIVED",
      search: "  profil  ",
      sort: "TITLE_ASC",
    })).toEqual({
      page: 10_000,
      pageSize: 50,
      status: "ARCHIVED",
      search: "profil",
      sort: "TITLE_ASC",
    });
  });

  it("rejects repeated, hostile, unbounded, scoped, and selector query forms", () => {
    for (const query of [
      {page: ["1", "2"]},
      {status: ["DRAFT", "PUBLISHED"]},
      {page: "0"},
      {page: "1.5"},
      {page: "10001"},
      {pageSize: "100"},
      {sort: "translations.title DESC"},
      {fields: "id,contentOwnerId"},
      {contentOwnerId: "another-user"},
      {role: "ADMIN"},
      {scope: "ANY"},
      {search: "x".repeat(101)},
      {search: "profile\u0000hidden"},
    ]) {
      expect(AdminPageListSearchParamsSchema.safeParse(query).success).toBe(false);
    }
  });

  it("accepts a safe bounded list and rejects private or inconsistent output", () => {
    const result = {
      items: [SUMMARY], page: 1, pageSize: 20 as const, total: 1, hasNextPage: false,
    };
    expect(AdminPageListResultSchema.safeParse(result).success).toBe(true);

    for (const item of [
      {...SUMMARY, contentOwnerId: "user-1"},
      {...SUMMARY, storageKey: `2026/08/${"b".repeat(64)}.webp`},
      {...SUMMARY, revisionSnapshot: {content: "private"}},
      {...SUMMARY, availableLocales: ["en", "id"]},
      {...SUMMARY, updatedAt: "03-08-2026"},
    ]) {
      expect(AdminPageListResultSchema.safeParse({...result, items: [item]}).success).toBe(false);
    }
    expect(AdminPageListResultSchema.safeParse({...result, total: 21}).success).toBe(false);
  });
});

describe("M4 Page editor and command transport contract", () => {
  const editorView = {
    id: "page-1",
    ...MUTABLE_FIELDS,
    status: "DRAFT" as const,
    version: 3,
    createdAt: "2026-08-02T16:00:00.000Z",
    updatedAt: "2026-08-03T16:00:00+00:00",
    hero: HERO,
  };

  it("accepts safe ID/EN/AR editor state with a coherent public hero view", () => {
    expect(AdminPageEditorViewSchema.safeParse(editorView).success).toBe(true);
    expect(AdminPageEditorViewSchema.safeParse({
      ...editorView,
      translations: {en: ID_TRANSLATION},
    }).success).toBe(false);
    expect(AdminPageEditorViewSchema.safeParse({
      ...editorView,
      translations: {...TRANSLATIONS, fr: ID_TRANSLATION},
    }).success).toBe(false);
  });

  it("rejects missing, mismatched, unsafe, private, or malformed hero/detail output", () => {
    for (const view of [
      {...editorView, hero: null},
      {...editorView, hero: {...HERO, id: "media-other"}},
      {...editorView, heroMediaId: null},
      {...editorView, hero: {...HERO, url: "javascript:alert(1)"}},
      {...editorView, hero: {...HERO, storageKey: `2026/08/${"a".repeat(64)}.webp`}},
      {...editorView, contentOwnerId: "user-1"},
      {...editorView, sessionToken: "secret"},
      {...editorView, updatedAt: "yesterday"},
    ]) {
      expect(AdminPageEditorViewSchema.safeParse(view).success).toBe(false);
    }
    expect(AdminPageEditorViewSchema.safeParse({
      ...editorView, heroMediaId: null, hero: null,
    }).success).toBe(true);
  });

  it("accepts all frozen Page commands without a parallel status vocabulary", () => {
    const createPayload = {
      ...MUTABLE_FIELDS,
      publication: {intent: "SAVE_DRAFT" as const},
    };
    const updatePayload = {
      pageId: "page-1",
      expectedVersion: 3,
      ...MUTABLE_FIELDS,
    };
    expect(AdminPageTransportCommandSchema.safeParse({
      action: "CREATE", payload: createPayload,
    }).success).toBe(true);
    expect(AdminPageTransportCommandSchema.safeParse({
      action: "UPDATE", payload: updatePayload,
    }).success).toBe(true);
    for (const intent of ["PUBLISH_NOW", "RETURN_TO_DRAFT", "ARCHIVE"] as const) {
      expect(AdminPageTransportCommandSchema.safeParse({
        action: "PUBLICATION",
        payload: {intent, pageId: "page-1", expectedVersion: 3},
      }).success).toBe(true);
    }
    expect(AdminPageTransportCommandSchema.safeParse({
      action: "DELETE", payload: {pageId: "page-1", expectedVersion: 3},
    }).success).toBe(true);
  });

  it("rejects actor, scope, capability, status, schedule, and force-delete injection", () => {
    const create = {
      action: "CREATE" as const,
      payload: {...MUTABLE_FIELDS, publication: {intent: "PUBLISH_NOW" as const}},
    };
    for (const injected of [
      {actorId: "user-1"},
      {contentOwnerId: "user-1"},
      {role: "ADMIN"},
      {scope: "ANY"},
      {capabilities: {delete: true}},
      {status: "PUBLISHED"},
    ]) {
      expect(AdminPageTransportCommandSchema.safeParse({
        ...create, payload: {...create.payload, ...injected},
      }).success).toBe(false);
    }
    for (const command of [
      {action: "AUTOSAVE", payload: {}},
      {action: "PUBLICATION", payload: {
        intent: "SCHEDULE", pageId: "page-1", expectedVersion: 3,
        publishedAt: "2026-08-04T09:00:00.000Z",
      }},
      {action: "DELETE", payload: {pageId: "page-1"}},
      {action: "DELETE", payload: {pageId: "page-1", expectedVersion: 3, force: true}},
    ]) {
      expect(AdminPageTransportCommandSchema.safeParse(command).success).toBe(false);
    }
  });
});

describe("M4 Page mutation response adapter", () => {
  it("converts Date-bearing success into strict JSON-safe transport output", () => {
    const response = toAdminPageMutationResponse({
      ok: true,
      pageId: "page-1",
      version: 4,
      status: "PUBLISHED",
      updatedAt: new Date("2026-08-03T16:00:00.000Z"),
    });
    expect(response).toEqual({
      ok: true,
      pageId: "page-1",
      version: 4,
      status: "PUBLISHED",
      updatedAt: "2026-08-03T16:00:00.000Z",
    });
    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
  });

  it("maps every domain failure to a stable non-technical transport code", () => {
    const expected = {
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
    } as const;

    for (const [domainCode, transportCode] of Object.entries(expected)) {
      expect(toAdminPageMutationResponse({ok: false, code: domainCode})).toEqual({
        ok: false,
        code: transportCode,
      });
    }
  });

  it("rejects technical details and malformed transport responses", () => {
    for (const response of [
      {ok: false, code: "UNAVAILABLE", message: "Prisma P2002"},
      {ok: false, code: "INTERNAL_ERROR"},
      {ok: true, pageId: "page-1", version: 4, status: "DRAFT", updatedAt: new Date()},
      {
        ok: true, pageId: "page-1", version: 4, status: "DRAFT",
        updatedAt: "not-an-instant",
      },
    ]) {
      expect(AdminPageMutationResponseSchema.safeParse(response).success).toBe(false);
    }
  });
});
