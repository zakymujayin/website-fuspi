import {describe, expect, it, vi} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import type {PostMutationDatabase} from "@/lib/content/post-mutations";
import {
  createPost,
  deletePost,
  mutatePostPublication,
  updatePost,
} from "@/lib/content/post-mutations";

const NOW = new Date("2026-07-16T08:00:00.000Z");
const clock = () => NOW;

function session(
  role: ActiveDatabaseSession["role"] = "EDITOR",
  userId = "editor-1",
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
    excerpt: null,
    content,
    metaTitle: null,
    metaDesc: null,
    coverCaption: null,
  };
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    type: "BERITA",
    columnType: null,
    slug: "berita-runtime-fuspi",
    isFeatured: false,
    categoryId: null,
    coverMediaId: null,
    tagIds: [],
    translations: {
      id: translation("Berita FUSPI"),
      en: translation("FUSPI News"),
      ar: translation("أخبار الكلية"),
    },
    publication: {intent: "SAVE_DRAFT"},
    ...overrides,
  };
}

function databaseWithTransaction(
  transaction: Record<string, unknown>,
): PostMutationDatabase {
  return {
    $transaction: vi.fn(async (
      callback: (value: Record<string, unknown>) => Promise<unknown>,
    ) => callback(transaction)),
  } as unknown as PostMutationDatabase;
}

function createTransaction(overrides: Record<string, unknown> = {}) {
  return {
    category: {findUnique: vi.fn()},
    tag: {findMany: vi.fn().mockResolvedValue([])},
    media: {findUnique: vi.fn()},
    post: {
      create: vi.fn().mockResolvedValue({
        id: "post-1",
        version: 1,
        status: "DRAFT",
        publishedAt: null,
        updatedAt: NOW,
      }),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    postTranslation: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    postTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    contentRevision: {create: vi.fn().mockResolvedValue({id: "revision-1"})},
    activityLog: {create: vi.fn().mockResolvedValue({id: "activity-1"})},
    ...overrides,
  };
}

describe("M3 Post mutation trust boundary", () => {
  it("rejects invalid, expired, and unauthorized sessions before touching the database", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as PostMutationDatabase;

    await expect(createPost(database, null, createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
    });
    await expect(createPost(database, {
      ...session(),
      expiresAt: NOW,
    }, createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
    });
    await expect(createPost(database, session("PETUGAS"), createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects caller-owned fields and server-clock scheduling violations before a transaction", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as PostMutationDatabase;

    await expect(createPost(database, session(), createInput({
      authorId: "attacker",
    }), clock)).resolves.toEqual({ok: false, code: "VALIDATION_FAILED"});
    await expect(createPost(database, session(), createInput({
      publication: {
        intent: "SCHEDULE",
        publishedAt: NOW.toISOString(),
      },
    }), clock)).resolves.toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(transaction).not.toHaveBeenCalled();
  });

  it("derives ownership and publication time from the session and server clock", async () => {
    const transaction = createTransaction({
      post: {
        create: vi.fn().mockResolvedValue({
          id: "post-1",
          version: 1,
          status: "PUBLISHED",
          publishedAt: NOW,
          updatedAt: NOW,
        }),
      },
    });
    const database = databaseWithTransaction(transaction);

    const result = await createPost(database, session("EDITOR", "editor-7"), createInput({
      publication: {intent: "PUBLISH_NOW"},
    }), clock);

    expect(result).toEqual({
      ok: true,
      postId: "post-1",
      version: 1,
      status: "PUBLISHED",
      publishedAt: NOW,
      updatedAt: NOW,
    });
    expect(transaction.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authorId: "editor-7",
        contentOwnerId: "editor-7",
        status: "PUBLISHED",
        publishedAt: NOW,
      }),
    });
  });

  it("sanitizes every locale before persistence and revision creation", async () => {
    const transaction = createTransaction();
    const database = databaseWithTransaction(transaction);
    const hostile = "<p onclick=\"alert(1)\">Aman</p><script>alert(2)</script>";

    await createPost(database, session(), createInput({
      translations: {
        id: translation("Indonesia", hostile),
        en: translation("English", hostile),
        ar: translation("العربية", hostile),
      },
    }), clock);

    const createCall = vi.mocked(transaction.post.create).mock.calls[0]?.[0];
    const stored = createCall?.data.translations.create as Array<{content: string}>;
    expect(stored).toHaveLength(3);
    expect(stored.every(({content}) =>
      content.includes("<p>Aman</p>")
      && !content.includes("onclick")
      && !content.includes("<script"),
    )).toBe(true);

    const revisionCalls = vi.mocked(transaction.contentRevision.create).mock.calls;
    expect(revisionCalls).toHaveLength(4);
    expect(JSON.stringify(revisionCalls)).not.toMatch(
      /storageKey|session|password|token|onclick|<script/i,
    );
  });

  it("rejects an editor cover owned by another user without creating a Post", async () => {
    const transaction = createTransaction({
      media: {
        findUnique: vi.fn().mockResolvedValue({
          id: "media-1",
          storageClass: "PUBLIC",
          uploaderId: "editor-other",
        }),
      },
    });
    const database = databaseWithTransaction(transaction);

    await expect(createPost(database, session(), createInput({
      coverMediaId: "media-1",
    }), clock)).resolves.toEqual({ok: false, code: "MEDIA_FORBIDDEN"});
    expect(transaction.post.create).not.toHaveBeenCalled();
  });

  it("maps unique conflicts and unexpected failures to stable non-technical results", async () => {
    const slugDatabase = {
      $transaction: vi.fn().mockRejectedValue({code: "P2002", detail: "slug"}),
    } as unknown as PostMutationDatabase;
    const failedDatabase = {
      $transaction: vi.fn().mockRejectedValue(
        new Error("Prisma connection failed at postgresql://secret"),
      ),
    } as unknown as PostMutationDatabase;

    await expect(createPost(slugDatabase, session(), createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "SLUG_CONFLICT",
    });
    const generic = await createPost(failedDatabase, session(), createInput(), clock);
    expect(generic).toEqual({ok: false, code: "INTERNAL_ERROR"});
    expect(JSON.stringify(generic)).not.toMatch(/Prisma|postgresql|secret/i);
  });

  it("returns the same non-disclosing result for missing and other-owner Post IDs", async () => {
    const missingTransaction = createTransaction({
      post: {findFirst: vi.fn().mockResolvedValue(null)},
    });
    const otherOwnerTransaction = createTransaction({
      post: {findFirst: vi.fn().mockResolvedValue(null)},
    });
    const input = {
      postId: "post-target",
      expectedVersion: 1,
      ...createInput(),
    };
    delete (input as {publication?: unknown}).publication;

    const missing = await updatePost(
      databaseWithTransaction(missingTransaction),
      session(),
      input,
      clock,
    );
    const otherOwner = await updatePost(
      databaseWithTransaction(otherOwnerTransaction),
      session(),
      {...input, postId: "post-owned-by-other-editor"},
      clock,
    );
    expect(missing).toEqual({ok: false, code: "NOT_FOUND"});
    expect(otherOwner).toEqual(missing);
  });

  it("rejects invalid publication transitions before claiming a version", async () => {
    const updateMany = vi.fn();
    const transaction = createTransaction({
      post: {
        findFirst: vi.fn().mockResolvedValue({
          id: "post-1",
          type: "BERITA",
          columnType: null,
          slug: "post-1",
          status: "DRAFT",
          isFeatured: false,
          publishedAt: null,
          version: 1,
          categoryId: null,
          coverMediaId: null,
          contentOwnerId: "editor-1",
          authorId: "editor-1",
          translations: [{
            locale: "id",
            ...translation("Post"),
            status: "DRAFT",
            sourceVersion: 1,
          }],
          tags: [],
        }),
        updateMany,
      },
    });

    await expect(mutatePostPublication(
      databaseWithTransaction(transaction),
      session(),
      {intent: "RETURN_TO_DRAFT", postId: "post-1", expectedVersion: 1},
      clock,
    )).resolves.toEqual({ok: false, code: "INVALID_STATE"});
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("deletes an owned Post with optimistic locking and a sanitized audit event", async () => {
    const updateMany = vi.fn().mockResolvedValue({count: 1});
    const deleteMany = vi.fn().mockResolvedValue({count: 1});
    const activityCreate = vi.fn().mockResolvedValue({id: "activity-1"});
    const transaction = createTransaction({
      post: {
        findFirst: vi.fn().mockResolvedValue({
          id: "post-1",
          type: "BERITA",
          columnType: null,
          slug: "post-1",
          status: "DRAFT",
          isFeatured: false,
          publishedAt: null,
          version: 1,
          categoryId: null,
          coverMediaId: null,
          contentOwnerId: "editor-1",
          authorId: "editor-1",
          translations: [{
            locale: "id",
            ...translation("Post"),
            status: "DRAFT",
            sourceVersion: 1,
          }],
          tags: [],
        }),
        updateMany,
        deleteMany,
      },
      activityLog: {create: activityCreate},
    });

    await expect(deletePost(
      databaseWithTransaction(transaction),
      session(),
      {postId: "post-1", expectedVersion: 1},
      clock,
    )).resolves.toMatchObject({ok: true, postId: "post-1", version: 2});
    expect(deleteMany).toHaveBeenCalledWith({where: {
      id: "post-1",
      contentOwnerId: "editor-1",
      authorId: "editor-1",
      version: 2,
    }});
    expect(activityCreate).toHaveBeenCalledWith({data: expect.objectContaining({
      actorId: "editor-1",
      action: "UPDATE",
      resourceType: "Post",
      resourceId: "post-1",
      metadata: {operation: "DELETE", version: 2},
    })});
  });
});
