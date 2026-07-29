import {describe, expect, it, vi} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import type {PageMutationDatabase} from "@/features/content/pages/mutations";
import {
  createPage,
  deletePage,
  mutatePagePublication,
  updatePage,
} from "@/features/content/pages/mutations";

const NOW = new Date("2026-07-16T08:00:00.000Z");
const clock = () => NOW;

function session(
  role: ActiveDatabaseSession["role"] = "ADMIN",
  userId = "admin-1",
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
    content,
    metaTitle: null,
    metaDesc: null,
  };
}

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    slug: "halaman-fuspi",
    parentId: null,
    heroMediaId: null,
    order: 0,
    translations: {
      id: translation("Halaman FUSPI"),
      en: translation("FUSPI Page"),
      ar: translation("صفحة الكلية"),
    },
    publication: {intent: "SAVE_DRAFT"},
    ...overrides,
  };
}

function databaseWithTransaction(
  transaction: Record<string, unknown>,
): PageMutationDatabase {
  return {
    $transaction: vi.fn(async (
      callback: (value: Record<string, unknown>) => Promise<unknown>,
    ) => callback(transaction)),
  } as unknown as PageMutationDatabase;
}

function createTransaction(overrides: Record<string, unknown> = {}) {
  return {
    media: {findUnique: vi.fn()},
    page: {
      create: vi.fn().mockResolvedValue({
        id: "page-1",
        version: 1,
        status: "DRAFT",
        updatedAt: NOW,
      }),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    pageTranslation: {
      deleteMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    contentRevision: {create: vi.fn().mockResolvedValue({id: "revision-1"})},
    activityLog: {create: vi.fn().mockResolvedValue({id: "activity-1"})},
    ...overrides,
  };
}

describe("M4 Page mutation trust boundary", () => {
  it("rejects invalid, expired, and non-ADMIN sessions before touching the database", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as PageMutationDatabase;

    await expect(createPage(database, null, createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
    });
    await expect(createPage(database, {
      ...session(),
      expiresAt: NOW,
    }, createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
    });
    await expect(createPage(database, session("EDITOR"), createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
    await expect(createPage(database, session("PETUGAS"), createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
    await expect(createPage(database, session("SATGAS_PPKS"), createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects caller-owned fields before a transaction", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as PageMutationDatabase;

    await expect(createPage(database, session(), createInput({
      contentOwnerId: "attacker",
    }), clock)).resolves.toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(transaction).not.toHaveBeenCalled();
  });

  it("derives ownership and publication state from the session and server clock", async () => {
    const transaction = createTransaction({
      page: {
        create: vi.fn().mockResolvedValue({
          id: "page-1",
          version: 1,
          status: "PUBLISHED",
          updatedAt: NOW,
        }),
      },
    });
    const database = databaseWithTransaction(transaction);

    const result = await createPage(database, session("ADMIN", "admin-7"), createInput({
      publication: {intent: "PUBLISH_NOW"},
    }), clock);

    expect(result).toEqual({
      ok: true,
      pageId: "page-1",
      version: 1,
      status: "PUBLISHED",
      updatedAt: NOW,
    });
    expect(transaction.page.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentOwnerId: "admin-7",
        status: "PUBLISHED",
      }),
    });
  });

  it("sanitizes every locale before persistence and revision creation", async () => {
    const transaction = createTransaction();
    const database = databaseWithTransaction(transaction);
    const hostile = "<p onclick=\"alert(1)\">Aman</p><script>alert(2)</script>";

    await createPage(database, session(), createInput({
      translations: {
        id: translation("Indonesia", hostile),
        en: translation("English", hostile),
        ar: translation("العربية", hostile),
      },
    }), clock);

    const createCall = vi.mocked(transaction.page.create).mock.calls[0]?.[0];
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

  it("rejects non-public hero media without creating a Page", async () => {
    const transaction = createTransaction({
      media: {
        findUnique: vi.fn().mockResolvedValue({
          id: "media-1",
          storageClass: "PRIVATE",
        }),
      },
    });
    const database = databaseWithTransaction(transaction);

    await expect(createPage(database, session(), createInput({
      heroMediaId: "media-1",
    }), clock)).resolves.toEqual({ok: false, code: "MEDIA_FORBIDDEN"});
    expect(transaction.page.create).not.toHaveBeenCalled();
  });

  it("rejects missing hero media", async () => {
    const transaction = createTransaction({
      media: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    const database = databaseWithTransaction(transaction);

    await expect(createPage(database, session(), createInput({
      heroMediaId: "missing-media",
    }), clock)).resolves.toEqual({ok: false, code: "MEDIA_NOT_FOUND"});
    expect(transaction.page.create).not.toHaveBeenCalled();
  });

  it("rejects non-existent parent page", async () => {
    const transaction = createTransaction({
      media: {findUnique: vi.fn().mockResolvedValue(null)},
      page: {
        ...createTransaction().page,
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });
    const database = databaseWithTransaction(transaction);

    await expect(createPage(database, session(), createInput({
      parentId: "missing-parent",
      heroMediaId: null,
    }), clock)).resolves.toEqual({ok: false, code: "PARENT_NOT_FOUND"});
  });

  it("maps unique conflicts and unexpected failures to stable non-technical results", async () => {
    const slugDatabase = {
      $transaction: vi.fn().mockRejectedValue({code: "P2002", detail: "slug"}),
    } as unknown as PageMutationDatabase;
    const failedDatabase = {
      $transaction: vi.fn().mockRejectedValue(
        new Error("Prisma connection failed at postgresql://secret"),
      ),
    } as unknown as PageMutationDatabase;

    await expect(createPage(slugDatabase, session(), createInput(), clock)).resolves.toEqual({
      ok: false,
      code: "SLUG_CONFLICT",
    });
    const generic = await createPage(failedDatabase, session(), createInput(), clock);
    expect(generic).toEqual({ok: false, code: "INTERNAL_ERROR"});
    expect(JSON.stringify(generic)).not.toMatch(/Prisma|postgresql|secret/i);
  });

  it("returns identical non-disclosing result for missing page ID", async () => {
    const missingTransaction = createTransaction({
      page: {findFirst: vi.fn().mockResolvedValue(null)},
    });
    const input = {
      pageId: "page-missing",
      expectedVersion: 1,
      ...createInput(),
    };
    delete (input as {publication?: unknown}).publication;

    const missing = await updatePage(
      databaseWithTransaction(missingTransaction),
      session(),
      input,
      clock,
    );
    expect(missing).toEqual({ok: false, code: "NOT_FOUND"});
  });

  it("rejects self-parenting in create input", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as PageMutationDatabase;

    await expect(createPage(database, session(), createInput({
      parentId: "halaman-fuspi",
    }), clock)).resolves.toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects self-parenting in update input", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as PageMutationDatabase;

    await expect(updatePage(database, session("EDITOR"), {
      pageId: "page-1",
      expectedVersion: 1,
      ...createInput({slug: "updated-slug"}),
    }, clock)).resolves.toEqual({ok: false, code: "FORBIDDEN"});
  });

  it("rejects invalid publication transitions before claiming a version", async () => {
    const updateMany = vi.fn();
    const transaction = createTransaction({
      page: {
        findFirst: vi.fn().mockResolvedValue({
          id: "page-1",
          slug: "page-1",
          status: "DRAFT",
          order: 0,
          version: 1,
          parentId: null,
          heroMediaId: null,
          contentOwnerId: "admin-1",
          translations: [{
            locale: "id",
            ...translation("Page"),
            status: "DRAFT",
            sourceVersion: 1,
          }],
        }),
        updateMany,
      },
    });

    await expect(mutatePagePublication(
      databaseWithTransaction(transaction),
      session(),
      {intent: "RETURN_TO_DRAFT", pageId: "page-1", expectedVersion: 1},
      clock,
    )).resolves.toEqual({ok: false, code: "INVALID_STATE"});
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("deletes a page with optimistic locking and a sanitized audit event", async () => {
    const updateMany = vi.fn().mockResolvedValue({count: 1});
    const deleteFn = vi.fn();
    const activityCreate = vi.fn().mockResolvedValue({id: "activity-1"});
    const transaction = createTransaction({
      page: {
        findFirst: vi.fn().mockResolvedValue({
          id: "page-1",
          slug: "page-1",
          status: "DRAFT",
          order: 0,
          version: 1,
          parentId: null,
          heroMediaId: null,
          contentOwnerId: "admin-1",
          translations: [{
            locale: "id",
            ...translation("Page"),
            status: "DRAFT",
            sourceVersion: 1,
          }],
        }),
        updateMany,
        delete: deleteFn,
        count: vi.fn().mockResolvedValue(0),
      },
      activityLog: {create: activityCreate},
    });

    await expect(deletePage(
      databaseWithTransaction(transaction),
      session(),
      {pageId: "page-1", expectedVersion: 1},
      clock,
    )).resolves.toMatchObject({ok: true, pageId: "page-1", version: 2});
    expect(deleteFn).toHaveBeenCalledWith({where: {id: "page-1"}});
    expect(activityCreate).toHaveBeenCalledWith({data: expect.objectContaining({
      actorId: "admin-1",
      action: "UPDATE",
      resourceType: "Page",
      resourceId: "page-1",
      metadata: {operation: "DELETE", version: 2},
    })});
  });

  it("rejects deletion of a page that has children", async () => {
    const transaction = createTransaction({
      page: {
        findFirst: vi.fn().mockResolvedValue({
          id: "page-1",
          slug: "parent-page",
          status: "PUBLISHED",
          order: 0,
          version: 2,
          parentId: null,
          heroMediaId: null,
          contentOwnerId: "admin-1",
          translations: [{
            locale: "id",
            ...translation("Parent"),
            status: "PUBLISHED",
            sourceVersion: 2,
          }],
        }),
        count: vi.fn().mockResolvedValue(2),
        updateMany: vi.fn(),
      },
    });

    await expect(deletePage(
      databaseWithTransaction(transaction),
      session(),
      {pageId: "page-1", expectedVersion: 2},
      clock,
    )).resolves.toEqual({ok: false, code: "INVALID_STATE"});
  });

  it("rejects stale version updates", async () => {
    const transaction = createTransaction();
    transaction.page.findFirst = vi.fn().mockResolvedValue({
      id: "page-1",
      slug: "page-1",
      status: "DRAFT",
      order: 0,
      version: 3,
      parentId: null,
      heroMediaId: null,
      contentOwnerId: "admin-1",
      translations: [{
        locale: "id",
        ...translation("Page"),
        status: "DRAFT",
        sourceVersion: 1,
      }],
    });
    transaction.page.updateMany = vi.fn().mockResolvedValue({count: 0});

    const inputData = {
      pageId: "page-1",
      expectedVersion: 1,
      ...createInput({slug: "updated"}),
    };
    delete (inputData as {publication?: unknown}).publication;

    const result = await updatePage(
      databaseWithTransaction(transaction),
      session(),
      inputData,
      clock,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VERSION_CONFLICT");
    }
  });

  it("detects hierarchy cycles in update", async () => {
    const transaction = createTransaction();
    transaction.media.findUnique = vi.fn().mockResolvedValue(null);
    transaction.page.findFirst = vi.fn().mockResolvedValue({
      id: "page-child",
      slug: "child",
      status: "DRAFT",
      order: 0,
      version: 1,
      parentId: null,
      heroMediaId: null,
      contentOwnerId: "admin-1",
      translations: [{
        locale: "id",
        ...translation("Child"),
        status: "DRAFT",
        sourceVersion: 1,
      }],
    });
    transaction.page.findUnique = vi.fn()
      .mockResolvedValueOnce({id: "page-parent"})
      .mockResolvedValueOnce({parentId: "page-child"});

    const inputData = {
      pageId: "page-child",
      expectedVersion: 1,
      ...createInput({slug: "child", parentId: "page-parent"}),
    };
    delete (inputData as {publication?: unknown}).publication;

    const result = await updatePage(
      databaseWithTransaction(transaction),
      session(),
      inputData,
      clock,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("HIERARCHY_CYCLE");
    }
  });
});
