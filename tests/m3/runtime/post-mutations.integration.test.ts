import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  autosavePost,
  createPost,
  mutatePostPublication,
  updatePost,
} from "@/lib/content/post-mutations";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M3 Post mutation runtime on PostgreSQL", () => {
  const marker = `m3-post-${Date.now()}`;
  const now = new Date("2026-07-16T08:00:00.000Z");
  const clock = () => now;
  let prisma: ReturnType<typeof createPrismaClient>;
  let adminId: string;
  let editorId: string;
  let otherEditorId: string;
  let categoryId: string;
  let tagOneId: string;
  let tagTwoId: string;
  let editorMediaId: string;
  let otherEditorMediaId: string;

  function actor(
    userId: string,
    role: ActiveDatabaseSession["role"],
  ): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-07-16T16:00:00.000Z"),
    };
  }

  function translation(title: string, content = "<p>Konten aman.</p>") {
    return {
      title,
      excerpt: `Ringkasan ${title}`,
      content,
      metaTitle: title,
      metaDesc: `Metadata ${title}`,
      coverCaption: null,
    };
  }

  function input(slug: string, overrides: Record<string, unknown> = {}) {
    return {
      type: "BERITA",
      columnType: null,
      slug,
      isFeatured: false,
      categoryId,
      coverMediaId: editorMediaId,
      tagIds: [tagOneId, tagTwoId],
      translations: {
        id: translation("Berita Indonesia"),
        en: translation("English News"),
        ar: translation("خبر عربي"),
      },
      publication: {intent: "SAVE_DRAFT"},
      ...overrides,
    };
  }

  function updateInput(
    postId: string,
    expectedVersion: number,
    slug: string,
    overrides: Record<string, unknown> = {},
  ) {
    const candidate = {
      postId,
      expectedVersion,
      ...input(slug, overrides),
    };
    delete (candidate as {publication?: unknown}).publication;
    return candidate;
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: "M3 Synthetic Admin",
          email: `${marker}-admin@example.test`,
          role: "ADMIN",
        },
      }),
      prisma.user.create({
        data: {
          name: "M3 Synthetic Editor",
          email: `${marker}-editor@example.test`,
          role: "EDITOR",
        },
      }),
      prisma.user.create({
        data: {
          name: "M3 Other Editor",
          email: `${marker}-other@example.test`,
          role: "EDITOR",
        },
      }),
    ]);
    [adminId, editorId, otherEditorId] = users.map(({id}) => id);

    const category = await prisma.category.create({
      data: {slug: `${marker}-category`},
    });
    categoryId = category.id;
    const tags = await Promise.all([
      prisma.tag.create({data: {slug: `${marker}-tag-one`}}),
      prisma.tag.create({data: {slug: `${marker}-tag-two`}}),
    ]);
    [tagOneId, tagTwoId] = tags.map(({id}) => id);

    const media = await Promise.all([
      prisma.media.create({
        data: {
          storageKey: `2026/07/${"a".repeat(64)}.webp`,
          storageClass: "PUBLIC",
          checksumSha256: "a".repeat(64),
          originalName: `${marker}-editor.webp`,
          mimeType: "image/webp",
          size: 1_024,
          alt: "Gambar milik editor",
          width: 320,
          height: 240,
          uploaderId: editorId,
        },
      }),
      prisma.media.create({
        data: {
          storageKey: `2026/07/${"b".repeat(64)}.webp`,
          storageClass: "PUBLIC",
          checksumSha256: "b".repeat(64),
          originalName: `${marker}-other.webp`,
          mimeType: "image/webp",
          size: 1_024,
          alt: "Gambar milik editor lain",
          width: 320,
          height: 240,
          uploaderId: otherEditorId,
        },
      }),
    ]);
    [editorMediaId, otherEditorMediaId] = media.map(({id}) => id);
  });

  afterAll(async () => {
    const posts = await prisma.post.findMany({
      where: {slug: {startsWith: marker}},
      select: {id: true},
    });
    const postIds = posts.map(({id}) => id);
    if (postIds.length > 0) {
      await prisma.contentRevision.deleteMany({
        where: {resourceType: "Post", resourceId: {in: postIds}},
      });
      await prisma.post.deleteMany({where: {id: {in: postIds}}});
    }
    await prisma.media.deleteMany({where: {originalName: {startsWith: marker}}});
    await prisma.category.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.tag.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  it("creates parent, relations, sanitized locales, and revisions atomically as EDITOR", async () => {
    const slug = `${marker}-create`;
    const hostile = "<p onclick=\"alert(1)\">Aman</p><script>alert(2)</script>";
    const result = await createPost(
      prisma,
      actor(editorId, "EDITOR"),
      input(slug, {
        translations: {
          id: translation("Indonesia", hostile),
          en: translation("English", hostile),
          ar: translation("العربية", hostile),
        },
        publication: {intent: "PUBLISH_NOW"},
      }),
      clock,
    );

    expect(result).toMatchObject({
      ok: true,
      version: 1,
      status: "PUBLISHED",
      publishedAt: now,
    });
    if (!result.ok) throw new Error("Expected Post creation.");
    const stored = await prisma.post.findUniqueOrThrow({
      where: {id: result.postId},
      include: {
        translations: {orderBy: {locale: "asc"}},
        tags: {orderBy: {tagId: "asc"}},
      },
    });
    expect(stored).toMatchObject({
      authorId: editorId,
      contentOwnerId: editorId,
      status: "PUBLISHED",
      publishedAt: now,
      categoryId,
      coverMediaId: editorMediaId,
    });
    expect(stored.translations).toHaveLength(3);
    expect(stored.translations.every(({content, status, sourceVersion}) =>
      content === "<p>Aman</p>"
      && status === "PUBLISHED"
      && sourceVersion === 1,
    )).toBe(true);
    expect(stored.tags.map(({tagId}) => tagId).sort())
      .toEqual([tagOneId, tagTwoId].sort());

    const revisions = await prisma.contentRevision.findMany({
      where: {resourceType: "Post", resourceId: stored.id},
      orderBy: [{scopeKey: "asc"}, {version: "asc"}],
    });
    expect(revisions).toHaveLength(4);
    expect(revisions.map(({scopeKey}) => scopeKey).sort()).toEqual([
      "ar", "en", "id", "root",
    ]);
    expect(JSON.stringify(revisions.map(({snapshotJson}) => snapshotJson))).not.toMatch(
      /storageKey|session|password|token|onclick|<script/i,
    );
  });

  it("uses the server clock for scheduling and permits ADMIN to use actor-visible shared media", async () => {
    const publishedAt = new Date("2026-07-20T08:00:00.000Z");
    const result = await createPost(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-scheduled-admin`, {
        coverMediaId: otherEditorMediaId,
        publication: {intent: "SCHEDULE", publishedAt: publishedAt.toISOString()},
      }),
      clock,
    );
    expect(result).toMatchObject({
      ok: true,
      status: "PUBLISHED",
      publishedAt,
    });
    if (!result.ok) throw new Error("Expected scheduled Post.");
    await expect(prisma.post.findUniqueOrThrow({where: {id: result.postId}}))
      .resolves.toMatchObject({
        authorId: adminId,
        contentOwnerId: adminId,
        coverMediaId: otherEditorMediaId,
      });
  });

  it("rejects missing references and another EDITOR's Media without partial writes", async () => {
    const candidates = [
      {
        suffix: "missing-category",
        expected: "VALIDATION_FAILED",
        override: {categoryId: `${marker}-missing-category`},
      },
      {
        suffix: "missing-tag",
        expected: "VALIDATION_FAILED",
        override: {tagIds: [tagOneId, `${marker}-missing-tag`]},
      },
      {
        suffix: "missing-media",
        expected: "MEDIA_NOT_FOUND",
        override: {coverMediaId: `${marker}-missing-media`},
      },
      {
        suffix: "foreign-media",
        expected: "MEDIA_FORBIDDEN",
        override: {coverMediaId: otherEditorMediaId},
      },
    ] as const;

    for (const candidate of candidates) {
      const slug = `${marker}-${candidate.suffix}`;
      await expect(createPost(
        prisma,
        actor(editorId, "EDITOR"),
        input(slug, candidate.override),
        clock,
      )).resolves.toEqual({ok: false, code: candidate.expected});
      expect(await prisma.post.count({where: {slug}})).toBe(0);
    }
  });

  it("replaces translations and tags atomically and rejects stale updates without partial changes", async () => {
    const slug = `${marker}-update`;
    const created = await createPost(
      prisma,
      actor(editorId, "EDITOR"),
      input(slug),
      clock,
    );
    if (!created.ok) throw new Error("Expected draft Post.");

    const updated = await updatePost(
      prisma,
      actor(editorId, "EDITOR"),
      updateInput(created.postId, 1, `${slug}-renamed`, {
        tagIds: [tagTwoId],
        translations: {
          id: translation("Judul versi dua"),
          ar: translation("العنوان الثاني"),
        },
      }),
      clock,
    );
    expect(updated).toMatchObject({ok: true, version: 2, status: "DRAFT"});

    const stale = await updatePost(
      prisma,
      actor(editorId, "EDITOR"),
      updateInput(created.postId, 1, `${slug}-stale`, {
        translations: {id: translation("Tidak boleh tersimpan")},
        tagIds: [],
      }),
      clock,
    );
    expect(stale).toEqual({ok: false, code: "VERSION_CONFLICT"});

    const stored = await prisma.post.findUniqueOrThrow({
      where: {id: created.postId},
      include: {translations: true, tags: true},
    });
    expect(stored).toMatchObject({slug: `${slug}-renamed`, version: 2});
    expect(stored.translations.map(({locale}) => locale).sort()).toEqual(["ar", "id"]);
    expect(stored.translations.find(({locale}) => locale === "id")?.title)
      .toBe("Judul versi dua");
    expect(stored.tags.map(({tagId}) => tagId)).toEqual([tagTwoId]);
    expect(await prisma.contentRevision.count({
      where: {resourceType: "Post", resourceId: stored.id, version: 2},
    })).toBe(3);
  });

  it("returns identical non-disclosing results for missing and another owner's Post", async () => {
    const created = await createPost(
      prisma,
      actor(otherEditorId, "EDITOR"),
      input(`${marker}-idor-owner`, {
        coverMediaId: otherEditorMediaId,
      }),
      clock,
    );
    if (!created.ok) throw new Error("Expected other-owner Post.");

    const otherOwner = await updatePost(
      prisma,
      actor(editorId, "EDITOR"),
      updateInput(created.postId, 1, `${marker}-idor-attempt`),
      clock,
    );
    const missing = await updatePost(
      prisma,
      actor(editorId, "EDITOR"),
      updateInput(`${marker}-missing-post`, 1, `${marker}-missing-attempt`),
      clock,
    );
    expect(otherOwner).toEqual({ok: false, code: "NOT_FOUND"});
    expect(missing).toEqual(otherOwner);
    await expect(prisma.post.findUniqueOrThrow({where: {id: created.postId}}))
      .resolves.toMatchObject({version: 1, slug: `${marker}-idor-owner`});
  });

  it("allows optimistic autosave only for an owned draft", async () => {
    const draft = await createPost(
      prisma,
      actor(editorId, "EDITOR"),
      input(`${marker}-autosave`),
      clock,
    );
    if (!draft.ok) throw new Error("Expected draft.");
    const autosaved = await autosavePost(
      prisma,
      actor(editorId, "EDITOR"),
      {
        intent: "AUTOSAVE_DRAFT",
        ...updateInput(draft.postId, 1, `${marker}-autosaved`, {
          translations: {id: translation("Autosave aman")},
        }),
      },
      clock,
    );
    expect(autosaved).toMatchObject({ok: true, version: 2, status: "DRAFT"});
    await expect(autosavePost(
      prisma,
      actor(editorId, "EDITOR"),
      {
        intent: "AUTOSAVE_DRAFT",
        ...updateInput(draft.postId, 1, `${marker}-autosave-stale`),
      },
      clock,
    )).resolves.toEqual({ok: false, code: "VERSION_CONFLICT"});

    const published = await createPost(
      prisma,
      actor(editorId, "EDITOR"),
      input(`${marker}-autosave-published`, {
        publication: {intent: "PUBLISH_NOW"},
      }),
      clock,
    );
    if (!published.ok) throw new Error("Expected published Post.");
    await expect(autosavePost(
      prisma,
      actor(editorId, "EDITOR"),
      {
        intent: "AUTOSAVE_DRAFT",
        ...updateInput(published.postId, 1, `${marker}-published-overwrite`),
      },
      clock,
    )).resolves.toEqual({ok: false, code: "INVALID_STATE"});
    await expect(prisma.post.findUniqueOrThrow({where: {id: published.postId}}))
      .resolves.toMatchObject({version: 1, status: "PUBLISHED"});
  });

  it("enforces legal publication transitions and preserves scheduled visibility semantics", async () => {
    const created = await createPost(
      prisma,
      actor(editorId, "EDITOR"),
      input(`${marker}-publication`, {
        translations: {id: translation("Publication flow")},
      }),
      clock,
    );
    if (!created.ok) throw new Error("Expected draft.");

    const published = await mutatePostPublication(
      prisma,
      actor(editorId, "EDITOR"),
      {intent: "PUBLISH_NOW", postId: created.postId, expectedVersion: 1},
      clock,
    );
    expect(published).toMatchObject({
      ok: true,
      version: 2,
      status: "PUBLISHED",
      publishedAt: now,
    });
    await expect(mutatePostPublication(
      prisma,
      actor(editorId, "EDITOR"),
      {intent: "PUBLISH_NOW", postId: created.postId, expectedVersion: 2},
      clock,
    )).resolves.toEqual({ok: false, code: "INVALID_STATE"});

    const future = new Date("2026-07-18T08:00:00.000Z");
    const scheduled = await mutatePostPublication(
      prisma,
      actor(editorId, "EDITOR"),
      {
        intent: "SCHEDULE",
        postId: created.postId,
        expectedVersion: 2,
        publishedAt: future.toISOString(),
      },
      clock,
    );
    expect(scheduled).toMatchObject({
      ok: true,
      version: 3,
      status: "PUBLISHED",
      publishedAt: future,
    });

    const archived = await mutatePostPublication(
      prisma,
      actor(editorId, "EDITOR"),
      {intent: "ARCHIVE", postId: created.postId, expectedVersion: 3},
      clock,
    );
    expect(archived).toMatchObject({
      ok: true,
      version: 4,
      status: "ARCHIVED",
      publishedAt: future,
    });
    const returned = await mutatePostPublication(
      prisma,
      actor(editorId, "EDITOR"),
      {intent: "RETURN_TO_DRAFT", postId: created.postId, expectedVersion: 4},
      clock,
    );
    expect(returned).toMatchObject({
      ok: true,
      version: 5,
      status: "DRAFT",
      publishedAt: null,
    });
    await expect(mutatePostPublication(
      prisma,
      actor(editorId, "EDITOR"),
      {
        intent: "SCHEDULE",
        postId: created.postId,
        expectedVersion: 5,
        publishedAt: now.toISOString(),
      },
      clock,
    )).resolves.toEqual({ok: false, code: "INVALID_STATE"});

    const stored = await prisma.post.findUniqueOrThrow({
      where: {id: created.postId},
      include: {translations: true},
    });
    expect(stored).toMatchObject({version: 5, status: "DRAFT", publishedAt: null});
    expect(stored.translations).toEqual([
      expect.objectContaining({locale: "id", status: "DRAFT", sourceVersion: 5}),
    ]);
    expect(await prisma.contentRevision.count({
      where: {resourceType: "Post", resourceId: stored.id},
    })).toBe(10);
  });

  it("rolls back optimistic claims and content changes on a slug conflict", async () => {
    const first = await createPost(
      prisma,
      actor(editorId, "EDITOR"),
      input(`${marker}-slug-first`),
      clock,
    );
    const second = await createPost(
      prisma,
      actor(editorId, "EDITOR"),
      input(`${marker}-slug-second`),
      clock,
    );
    if (!first.ok || !second.ok) throw new Error("Expected draft Posts.");

    const result = await updatePost(
      prisma,
      actor(editorId, "EDITOR"),
      updateInput(second.postId, 1, `${marker}-slug-first`, {
        translations: {id: translation("Harus rollback")},
      }),
      clock,
    );
    expect(result).toEqual({ok: false, code: "SLUG_CONFLICT"});
    const stored = await prisma.post.findUniqueOrThrow({
      where: {id: second.postId},
      include: {translations: true},
    });
    expect(stored).toMatchObject({version: 1, slug: `${marker}-slug-second`});
    expect(stored.translations.find(({locale}) => locale === "id")?.title)
      .toBe("Berita Indonesia");
    expect(await prisma.contentRevision.count({
      where: {resourceType: "Post", resourceId: second.postId},
    })).toBe(4);
  });
});
