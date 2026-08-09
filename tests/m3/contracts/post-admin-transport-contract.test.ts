import {describe, expect, it} from "vitest";

import {
  ADMIN_POST_AUTOSAVE_INTERVAL_MS,
  AdminPostEditorViewSchema,
  AdminPostListResultSchema,
  AdminPostListSearchParamsSchema,
  AdminPostMutationResponseSchema,
  AdminPostTransportCommandSchema,
  toAdminPostMutationResponse,
  toBeritaAutosaveInput,
  toBeritaCreateInput,
  toBeritaUpdateInput,
} from "@/contracts/post-admin";

const ID_TRANSLATION = {
  title: "Kajian Al-Qur'an dan Masyarakat",
  excerpt: "Ringkasan berita FUSPI.",
  content: "<p>Isi berita FUSPI.</p>",
  metaTitle: "Kajian Al-Qur'an",
  metaDesc: "Informasi kajian di lingkungan FUSPI.",
  coverCaption: null,
};

const MUTABLE_FIELDS = {
  slug: "kajian-al-quran-dan-masyarakat",
  isFeatured: false,
  categoryId: "category-1",
  coverMediaId: null,
  tagIds: ["tag-1", "tag-2"],
  translations: {
    id: ID_TRANSLATION,
    ar: {...ID_TRANSLATION, title: "دراسة القرآن والمجتمع", excerpt: null},
  },
};

const CAPABILITIES = {update: true, publish: true, delete: true};

const ADMIN_SUMMARY = {
  id: "post-1",
  slug: MUTABLE_FIELDS.slug,
  title: ID_TRANSLATION.title,
  titleLocale: "id" as const,
  availableLocales: ["id", "ar"] as const,
  status: "PUBLISHED" as const,
  publicationState: "PUBLISHED" as const,
  version: 4,
  isFeatured: false,
  publishedAt: "2026-07-20T08:00:00.000Z",
  updatedAt: "2026-07-21T08:00:00+07:00",
  category: {id: "category-1", label: "Akademik"},
  author: {name: "Editor FUSPI"},
  capabilities: CAPABILITIES,
};

describe("M3 Berita admin list transport contract", () => {
  it("normalizes singular raw query strings into one bounded canonical query", () => {
    expect(AdminPostListSearchParamsSchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "",
      sort: "UPDATED_DESC",
    });
    expect(AdminPostListSearchParamsSchema.parse({
      page: "10000",
      pageSize: "50",
      status: "PUBLISHED",
      search: "  kegiatan FUSPI  ",
      sort: "TITLE_ASC",
    })).toEqual({
      page: 10_000,
      pageSize: 50,
      status: "PUBLISHED",
      search: "kegiatan FUSPI",
      sort: "TITLE_ASC",
    });
  });

  it("rejects repeated, array, hostile, unbounded, and selector query forms", () => {
    for (const query of [
      {page: ["1", "2"]},
      {status: ["DRAFT", "PUBLISHED"]},
      {page: "1.5"},
      {page: "10001"},
      {pageSize: "500"},
      {sort: "author.email DESC"},
      {fields: "id,title,author.email"},
      {authorId: "another-editor"},
      {scope: "ANY"},
      {search: "x".repeat(101)},
      {search: "news\u0000hidden"},
    ]) {
      expect(AdminPostListSearchParamsSchema.safeParse(query).success).toBe(false);
    }
  });

  it("accepts safe ADMIN and EDITOR-shaped rows without exposing identity internals", () => {
    const adminResult = {
      items: [ADMIN_SUMMARY], page: 1, pageSize: 20 as const, total: 1, hasNextPage: false,
    };
    expect(AdminPostListResultSchema.safeParse(adminResult).success).toBe(true);
    expect(AdminPostListResultSchema.safeParse({
      ...adminResult,
      items: [{
        ...ADMIN_SUMMARY,
        id: "post-editor-1",
        status: "DRAFT",
        publicationState: "DRAFT",
        publishedAt: null,
        author: null,
      }],
    }).success).toBe(true);

    for (const privateField of [
      {authorId: "editor-1"},
      {contentOwnerId: "editor-1"},
      {authorEmail: "editor@example.test"},
      {revisionSnapshot: {content: "private"}},
      {storageKey: `2026/07/${"a".repeat(64)}.webp`},
    ]) {
      expect(AdminPostListResultSchema.safeParse({
        ...adminResult,
        items: [{...ADMIN_SUMMARY, ...privateField}],
      }).success).toBe(false);
    }
  });

  it("rejects duplicate rows, inconsistent state, unsafe labels, and malformed instants", () => {
    expect(AdminPostListResultSchema.safeParse({
      items: [ADMIN_SUMMARY, {...ADMIN_SUMMARY}],
      page: 1,
      pageSize: 20,
      total: 2,
      hasNextPage: false,
    }).success).toBe(false);
    for (const item of [
      {...ADMIN_SUMMARY, status: "DRAFT", publicationState: "PUBLISHED"},
      {...ADMIN_SUMMARY, status: "PUBLISHED", publishedAt: null},
      {...ADMIN_SUMMARY, updatedAt: "21-07-2026"},
      {...ADMIN_SUMMARY, availableLocales: ["en", "id"]},
      {...ADMIN_SUMMARY, availableLocales: ["id", "id"]},
      {...ADMIN_SUMMARY, title: "unsafe\u0007title"},
    ]) {
      expect(AdminPostListResultSchema.safeParse({
        items: [item], page: 1, pageSize: 20, total: 1, hasNextPage: false,
      }).success).toBe(false);
    }
  });
});

describe("M3 Berita editor and command transport contract", () => {
  const editorView = {
    id: "post-1",
    type: "BERITA" as const,
    columnType: null,
    ...MUTABLE_FIELDS,
    status: "DRAFT" as const,
    publicationState: "DRAFT" as const,
    version: 4,
    publishedAt: null,
    createdAt: "2026-07-20T08:00:00.000Z",
    updatedAt: "2026-07-21T08:00:00.000Z",
    cover: null,
    capabilities: CAPABILITIES,
  };

  it("returns the safe multilingual mutable state needed to preserve local conflict work", () => {
    expect(AdminPostEditorViewSchema.safeParse(editorView).success).toBe(true);
    expect(AdminPostEditorViewSchema.safeParse({
      ...editorView,
      translations: {en: ID_TRANSLATION},
    }).success).toBe(false);
    expect(AdminPostEditorViewSchema.safeParse({...editorView, type: "PENGUMUMAN"}).success)
      .toBe(false);
    expect(AdminPostEditorViewSchema.safeParse({
      ...editorView, version: 0,
    }).success).toBe(false);
    expect(AdminPostEditorViewSchema.safeParse({
      ...editorView, checksumSha256: "a".repeat(64),
    }).success).toBe(false);
  });

  it("requires strict action envelopes and keeps actor/resource scope out of input", () => {
    const create = {
      action: "CREATE" as const,
      payload: {...MUTABLE_FIELDS, publication: {intent: "SAVE_DRAFT" as const}},
    };
    expect(AdminPostTransportCommandSchema.safeParse(create).success).toBe(true);
    for (const injected of [
      {type: "PENGUMUMAN"},
      {columnType: "DOSEN"},
      {authorId: "attacker"},
      {contentOwnerId: "attacker"},
      {role: "ADMIN"},
      {scope: "ANY"},
      {status: "PUBLISHED"},
    ]) {
      expect(AdminPostTransportCommandSchema.safeParse({
        ...create,
        payload: {...create.payload, ...injected},
      }).success).toBe(false);
    }
  });

  it("composes the frozen domain schemas and restores only BERITA/no-column semantics", () => {
    const createPayload = {...MUTABLE_FIELDS, publication: {intent: "SAVE_DRAFT" as const}};
    const updatePayload = {postId: "post-1", expectedVersion: 4, ...MUTABLE_FIELDS};
    const autosavePayload = {
      intent: "AUTOSAVE_DRAFT" as const,
      postId: "post-1",
      expectedVersion: 4,
      ...MUTABLE_FIELDS,
    };
    expect(toBeritaCreateInput(createPayload)).toMatchObject({type: "BERITA", columnType: null});
    expect(toBeritaUpdateInput(updatePayload)).toMatchObject({type: "BERITA", columnType: null});
    expect(toBeritaAutosaveInput(autosavePayload)).toMatchObject({
      type: "BERITA", columnType: null, intent: "AUTOSAVE_DRAFT",
    });
    expect(ADMIN_POST_AUTOSAVE_INTERVAL_MS).toBe(30_000);
    expect(AdminPostTransportCommandSchema.safeParse({
      action: "AUTOSAVE", payload: {...autosavePayload, tagIds: ["tag-1", "tag-1"]},
    }).success).toBe(false);
    expect(AdminPostTransportCommandSchema.safeParse({
      action: "AUTOSAVE", payload: {...autosavePayload, translations: {fr: ID_TRANSLATION}},
    }).success).toBe(false);
  });

  it("separates publication/archive commands from optimistic delete", () => {
    for (const payload of [
      {intent: "PUBLISH_NOW", postId: "post-1", expectedVersion: 4},
      {
        intent: "SCHEDULE",
        postId: "post-1",
        expectedVersion: 4,
        publishedAt: "2026-07-22T08:00:00+07:00",
      },
      {intent: "RETURN_TO_DRAFT", postId: "post-1", expectedVersion: 4},
      {intent: "ARCHIVE", postId: "post-1", expectedVersion: 4},
    ]) {
      expect(AdminPostTransportCommandSchema.safeParse({action: "PUBLICATION", payload}).success)
        .toBe(true);
    }
    expect(AdminPostTransportCommandSchema.safeParse({
      action: "PUBLICATION",
      payload: {
        intent: "SCHEDULE", postId: "post-1", expectedVersion: 4, publishedAt: "tomorrow",
      },
    }).success).toBe(false);
    expect(AdminPostTransportCommandSchema.safeParse({
      action: "DELETE", payload: {postId: "post-1"},
    }).success).toBe(false);
    expect(AdminPostTransportCommandSchema.safeParse({
      action: "DELETE", payload: {postId: "post-1", expectedVersion: 4},
    }).success).toBe(true);
  });
});

describe("M3 Berita mutation response adapter", () => {
  it("converts Date-bearing domain success into offset-aware JSON strings", () => {
    expect(toAdminPostMutationResponse({
      ok: true,
      postId: "post-1",
      version: 5,
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-21T01:00:00.000Z"),
      updatedAt: new Date("2026-07-21T01:00:01.000Z"),
    })).toEqual({
      ok: true,
      postId: "post-1",
      version: 5,
      status: "PUBLISHED",
      publishedAt: "2026-07-21T01:00:00.000Z",
      updatedAt: "2026-07-21T01:00:01.000Z",
    });
  });

  it("preserves stable failures while making forbidden indistinguishable from missing", () => {
    expect(toAdminPostMutationResponse({ok: false, code: "FORBIDDEN"})).toEqual({
      ok: false, code: "NOT_FOUND",
    });
    expect(toAdminPostMutationResponse({ok: false, code: "VERSION_CONFLICT"})).toEqual({
      ok: false, code: "VERSION_CONFLICT",
    });
    expect(toAdminPostMutationResponse({ok: false, code: "MEDIA_FORBIDDEN"})).toEqual({
      ok: false, code: "MEDIA_INVALID",
    });
    expect(toAdminPostMutationResponse({ok: false, code: "INTERNAL_ERROR"})).toEqual({
      ok: false, code: "UNAVAILABLE",
    });
  });

  it("offers explicit transport-only failures without accepting technical detail", () => {
    for (const code of ["SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "UNAVAILABLE"]) {
      expect(AdminPostMutationResponseSchema.safeParse({ok: false, code}).success).toBe(true);
    }
    expect(AdminPostMutationResponseSchema.safeParse({
      ok: false,
      code: "UNAVAILABLE",
      error: "Prisma P2002 at /srv/fuspi/shared/public/uploads",
      stack: "technical stack",
    }).success).toBe(false);
    expect(AdminPostMutationResponseSchema.safeParse({
      ok: true,
      postId: "post-1",
      version: 5,
      status: "DRAFT",
      publishedAt: null,
      updatedAt: new Date(),
    }).success).toBe(false);
  });
});
