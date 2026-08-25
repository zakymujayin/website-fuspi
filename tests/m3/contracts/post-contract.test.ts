import {describe, expect, it} from "vitest";

import {
  PostAutosaveInputSchema,
  PostCreateInputSchema,
  PostInitialPublicationDecisionSchema,
  PostMutationResultSchema,
  PostPublicationTransitionSchema,
  PostUpdateInputSchema,
  PublicPostDetailQuerySchema,
  PublicPostListQuerySchema,
  PublicPostListResultSchema,
  PublicPostVisibilitySchema,
  ResolvedPostTranslationSchema,
  TrustedPostActorScopeSchema,
} from "@/contracts/post";

const ID_TRANSLATION = {
  title: "Kajian Al-Qur'an dan Masyarakat",
  excerpt: "Ringkasan berita FUSPI.",
  content: "<p>Isi berita yang sudah melewati batas validasi.</p>",
  metaTitle: "Kajian Al-Qur'an",
  metaDesc: "Informasi kajian di lingkungan FUSPI.",
  coverCaption: null,
};

const POST_FIELDS = {
  type: "BERITA" as const,
  columnType: null,
  slug: "kajian-al-quran-dan-masyarakat",
  isFeatured: false,
  categoryId: "category-1",
  coverMediaId: "media-1",
  tagIds: ["tag-1", "tag-2"],
  images: [],
  translations: {
    id: ID_TRANSLATION,
    ar: {...ID_TRANSLATION, title: "دراسة القرآن والمجتمع", excerpt: null},
  },
};

describe("M3 Post write contracts", () => {
  it("accepts a bounded multilingual draft with mandatory Indonesian content", () => {
    const result = PostCreateInputSchema.parse({
      ...POST_FIELDS,
      publication: {intent: "SAVE_DRAFT"},
    });
    expect(result.translations.id.title).toBe(ID_TRANSLATION.title);
    expect(result.translations.ar?.title).toContain("القرآن");
  });

  it("rejects missing Indonesian content, unknown locales, and nested unknown fields", () => {
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      translations: {en: ID_TRANSLATION},
      publication: {intent: "SAVE_DRAFT"},
    }).success).toBe(false);
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      translations: {...POST_FIELDS.translations, fr: ID_TRANSLATION},
      publication: {intent: "SAVE_DRAFT"},
    }).success).toBe(false);
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      translations: {id: {...ID_TRANSLATION, locale: "id"}},
      publication: {intent: "SAVE_DRAFT"},
    }).success).toBe(false);
  });

  it("keeps identity and authorization fields out of untrusted payloads", () => {
    for (const injected of [
      {authorId: "attacker"},
      {contentOwnerId: "attacker"},
      {role: "ADMIN"},
      {status: "PUBLISHED"},
      {publishedAt: "2026-07-16T08:00:00Z"},
    ]) {
      expect(PostCreateInputSchema.safeParse({
        ...POST_FIELDS,
        publication: {intent: "SAVE_DRAFT"},
        ...injected,
      }).success).toBe(false);
    }
    expect(TrustedPostActorScopeSchema.safeParse({
      role: "EDITOR", userId: "editor-1", ownership: "ANY",
    }).success).toBe(false);
    expect(TrustedPostActorScopeSchema.safeParse({
      role: "PETUGAS", userId: "user-1", ownership: "OWN",
    }).success).toBe(false);
  });

  it("enforces Post type, slug, text, tag, and scheduling shapes", () => {
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      type: "KOLOM",
      columnType: null,
      publication: {intent: "SAVE_DRAFT"},
    }).success).toBe(false);
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      columnType: "DOSEN",
      publication: {intent: "SAVE_DRAFT"},
    }).success).toBe(false);
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      slug: "../Berita Tidak Aman",
      publication: {intent: "SAVE_DRAFT"},
    }).success).toBe(false);
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      tagIds: ["tag-1", "tag-1"],
      publication: {intent: "SAVE_DRAFT"},
    }).success).toBe(false);
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      translations: {id: {...ID_TRANSLATION, title: "x".repeat(256)}},
      publication: {intent: "SAVE_DRAFT"},
    }).success).toBe(false);
    expect(PostCreateInputSchema.safeParse({
      ...POST_FIELDS,
      publication: {intent: "SCHEDULE", publishedAt: "16-07-2026"},
    }).success).toBe(false);
  });

  it("requires an optimistic version for update and draft autosave", () => {
    expect(PostUpdateInputSchema.safeParse({
      postId: "post-1", expectedVersion: 3, ...POST_FIELDS,
    }).success).toBe(true);
    expect(PostAutosaveInputSchema.safeParse({
      intent: "AUTOSAVE_DRAFT", postId: "post-1", expectedVersion: 3, ...POST_FIELDS,
    }).success).toBe(true);
    expect(PostAutosaveInputSchema.safeParse({
      intent: "AUTOSAVE_DRAFT", postId: "post-1", expectedVersion: 0, ...POST_FIELDS,
    }).success).toBe(false);
    expect(PostAutosaveInputSchema.safeParse({
      intent: "AUTOSAVE_DRAFT",
      postId: "post-1",
      expectedVersion: 3,
      status: "DRAFT",
      ...POST_FIELDS,
    }).success).toBe(false);
  });
});

describe("M3 Post publication state contract", () => {
  const now = new Date("2026-07-16T08:00:00.000Z");
  const command = (intent: "PUBLISH_NOW" | "RETURN_TO_DRAFT" | "ARCHIVE") => ({
    intent, postId: "post-1", expectedVersion: 2,
  });

  it.each([
    ["DRAFT", command("PUBLISH_NOW")],
    ["DRAFT", {intent: "SCHEDULE", postId: "post-1", expectedVersion: 2, publishedAt: "2026-07-17T08:00:00Z"}],
    ["DRAFT", command("ARCHIVE")],
    ["PUBLISHED", command("RETURN_TO_DRAFT")],
    ["PUBLISHED", command("ARCHIVE")],
    ["ARCHIVED", command("RETURN_TO_DRAFT")],
  ] as const)("accepts %s transition", (currentStatus, transitionCommand) => {
    expect(PostPublicationTransitionSchema.safeParse({
      currentStatus, now, command: transitionCommand,
    }).success).toBe(true);
  });

  it.each([
    ["DRAFT", command("RETURN_TO_DRAFT")],
    ["PUBLISHED", command("PUBLISH_NOW")],
    ["ARCHIVED", command("PUBLISH_NOW")],
    ["ARCHIVED", command("ARCHIVE")],
  ] as const)("rejects invalid transition from %s", (currentStatus, transitionCommand) => {
    expect(PostPublicationTransitionSchema.safeParse({
      currentStatus, now, command: transitionCommand,
    }).success).toBe(false);
  });

  it("rejects scheduling at or before the server clock", () => {
    for (const publishedAt of ["2026-07-16T08:00:00Z", "2026-07-15T08:00:00Z"]) {
      expect(PostPublicationTransitionSchema.safeParse({
        currentStatus: "DRAFT",
        now,
        command: {intent: "SCHEDULE", postId: "post-1", expectedVersion: 2, publishedAt},
      }).success).toBe(false);
    }
    expect(PostInitialPublicationDecisionSchema.safeParse({
      now,
      publication: {intent: "SCHEDULE", publishedAt: "2026-07-16T07:59:59Z"},
    }).success).toBe(false);
    expect(PostInitialPublicationDecisionSchema.safeParse({
      now,
      publication: {intent: "SCHEDULE", publishedAt: "2026-07-17T08:00:00Z"},
    }).success).toBe(true);
  });
});

describe("M3 Post public-read contracts", () => {
  const publicPost = {
    id: "post-1",
    type: "BERITA" as const,
    columnType: null,
    slug: POST_FIELDS.slug,
    isFeatured: false,
    publishedAt: new Date("2026-07-15T08:00:00.000Z"),
    authorName: "Editor FUSPI",
    categorySlug: "akademik",
    cover: null,
    images: [],
    translation: {
      requestedLocale: "en" as const,
      resolvedLocale: "id" as const,
      isFallback: true,
      value: ID_TRANSLATION,
    },
  };

  it("bounds public pagination and excludes publication bypass parameters", () => {
    expect(PublicPostListQuerySchema.parse({locale: "ar", type: "BERITA"})).toMatchObject({
      page: 1, pageSize: 12,
    });
    for (const query of [
      {locale: "id", type: "BERITA", page: 0},
      {locale: "id", type: "BERITA", pageSize: 25},
      {locale: "id", type: "BERITA", status: "DRAFT"},
      {locale: "id", type: "BERITA", publishedBefore: "2099-01-01T00:00:00Z"},
    ]) {
      expect(PublicPostListQuerySchema.safeParse(query).success).toBe(false);
    }
    expect(PublicPostDetailQuerySchema.safeParse({
      locale: "en", type: "BERITA", slug: POST_FIELDS.slug, preview: true,
    }).success).toBe(false);
  });

  it("exposes only already-published records according to the server clock", () => {
    const now = new Date("2026-07-16T08:00:00.000Z");
    expect(PublicPostVisibilitySchema.safeParse({
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-16T07:59:59.000Z"),
      now,
    }).success).toBe(true);
    expect(PublicPostVisibilitySchema.safeParse({
      status: "PUBLISHED",
      publishedAt: new Date("2026-07-16T08:00:01.000Z"),
      now,
    }).success).toBe(false);
    expect(PublicPostVisibilitySchema.safeParse({
      status: "DRAFT",
      publishedAt: new Date("2026-07-15T08:00:00.000Z"),
      now,
    }).success).toBe(false);
  });

  it("allows only exact locale resolution or an explicit Indonesian fallback", () => {
    expect(ResolvedPostTranslationSchema.safeParse(publicPost.translation).success).toBe(true);
    expect(ResolvedPostTranslationSchema.safeParse({
      ...publicPost.translation,
      requestedLocale: "ar",
      resolvedLocale: "en",
      isFallback: true,
    }).success).toBe(false);
    expect(ResolvedPostTranslationSchema.safeParse({
      ...publicPost.translation,
      requestedLocale: "id",
      resolvedLocale: "id",
      isFallback: true,
    }).success).toBe(false);
  });

  it("rejects duplicate parent records and private fields in public output", () => {
    expect(PublicPostListResultSchema.safeParse({
      items: [publicPost], page: 1, pageSize: 12, total: 1, hasNextPage: false,
    }).success).toBe(true);
    expect(PublicPostListResultSchema.safeParse({
      items: [publicPost, {...publicPost}],
      page: 1,
      pageSize: 12,
      total: 2,
      hasNextPage: false,
    }).success).toBe(false);
    expect(PublicPostListResultSchema.safeParse({
      items: [{...publicPost, authorId: "editor-1"}],
      page: 1,
      pageSize: 12,
      total: 1,
      hasNextPage: false,
    }).success).toBe(false);
  });

  it("keeps mutation failures stable and non-technical", () => {
    expect(PostMutationResultSchema.parse({ok: false, code: "VERSION_CONFLICT"})).toEqual({
      ok: false, code: "VERSION_CONFLICT",
    });
    expect(PostMutationResultSchema.safeParse({
      ok: false,
      code: "INTERNAL_ERROR",
      error: "Prisma P2002 at /srv/fuspi",
    }).success).toBe(false);
  });
});
