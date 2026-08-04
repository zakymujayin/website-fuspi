import {beforeEach, describe, expect, it, vi} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";

const mutationMocks = vi.hoisted(() => ({
  createPage: vi.fn(),
  updatePage: vi.fn(),
  mutatePagePublication: vi.fn(),
  deletePage: vi.fn(),
}));

vi.mock("@/features/content/pages/mutations", () => mutationMocks);

import {
  adminPageHttpStatus,
  executeAdminPageCommand,
  getAdminPageEditor,
  listAdminPages,
  normalizeAdminPageSearchParams,
  type AdminPageTransportDatabase,
} from "@/features/content/pages/admin-transport";

const NOW = new Date("2026-08-04T03:00:00.000Z");
const clock = () => NOW;

function actor(role: ActiveDatabaseSession["role"] = "ADMIN"): ActiveDatabaseSession {
  return {
    userId: "admin-1",
    role,
    isActive: true,
    mustChangePassword: false,
    expiresAt: new Date("2026-08-04T11:00:00.000Z"),
  };
}

const translation = {
  locale: "id" as const,
  title: "Profil Fakultas",
  content: "<p>Profil sintetis.</p>",
  metaTitle: null,
  metaDesc: null,
};

const mutable = {
  slug: "profil-fakultas",
  parentId: null,
  heroMediaId: null,
  order: 1,
  translations: {
    id: {
      title: translation.title,
      content: translation.content,
      metaTitle: null,
      metaDesc: null,
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const mock of Object.values(mutationMocks)) {
    mock.mockResolvedValue({
      ok: true,
      pageId: "page-1",
      version: 2,
      status: "DRAFT",
      updatedAt: NOW,
    });
  }
});

describe("M4 Page admin transport", () => {
  it("normalizes only singular bounded list parameters", () => {
    expect(normalizeAdminPageSearchParams(new URLSearchParams())).toEqual({
      ok: true,
      data: {page: 1, pageSize: 20, status: "ALL", search: "", sort: "UPDATED_DESC"},
    });
    expect(normalizeAdminPageSearchParams(
      new URLSearchParams("page=2&pageSize=10&status=DRAFT&search=profil&sort=TITLE_ASC"),
    )).toEqual({
      ok: true,
      data: {page: 2, pageSize: 10, status: "DRAFT", search: "profil", sort: "TITLE_ASC"},
    });
    for (const query of [
      "page=1&page=2",
      "ownerId=admin-1",
      "sort=translations.title%20DESC",
      `search=${"x".repeat(101)}`,
    ]) {
      expect(normalizeAdminPageSearchParams(new URLSearchParams(query))).toEqual({
        ok: false,
        code: "REQUEST_INVALID",
      });
    }
  });

  it("rejects invalid roles, expiry, inactive shape, and password-change sessions before DB access", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as AdminPageTransportDatabase;
    const query = {page: 1, pageSize: 20, status: "ALL", search: "", sort: "UPDATED_DESC"};

    for (const session of [
      null,
      actor("EDITOR"),
      actor("PETUGAS"),
      actor("SATGAS_PPKS"),
      {...actor(), expiresAt: NOW},
      {...actor(), isActive: false},
      {...actor(), mustChangePassword: true},
    ]) {
      await expect(listAdminPages(database, session, query, clock)).resolves.toEqual({
        ok: false,
        code: "SESSION_INVALID",
      });
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns the strict Page list result through the accepted domain query", async () => {
    const findMany = vi.fn().mockResolvedValue([{
      id: "page-1",
      slug: "profil-fakultas",
      status: "DRAFT",
      order: 1,
      version: 1,
      parentId: null,
      heroMediaId: null,
      createdAt: NOW,
      updatedAt: NOW,
      parent: null,
      children: [],
      translations: [translation],
    }]);
    const count = vi.fn().mockResolvedValue(1);
    const database = {
      page: {findMany, count},
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    } as unknown as AdminPageTransportDatabase;

    const result = await listAdminPages(database, actor(), {
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "",
      sort: "UPDATED_DESC",
    }, clock);

    expect(result).toEqual({
      ok: true,
      data: {
        items: [{
          id: "page-1",
          slug: "profil-fakultas",
          title: "Profil Fakultas",
          titleLocale: "id",
          availableLocales: ["id"],
          status: "DRAFT",
          version: 1,
          order: 1,
          parentId: null,
          parentTitle: null,
          hasChildren: false,
          updatedAt: NOW.toISOString(),
        }],
        page: 1,
        pageSize: 20,
        total: 1,
        hasNextPage: false,
      },
    });
  });

  it("projects a coherent public hero without storage internals", async () => {
    const checksum = "a".repeat(64);
    const findUnique = vi.fn().mockResolvedValue({
      id: "page-1",
      slug: "profil-fakultas",
      status: "DRAFT",
      order: 1,
      version: 1,
      parentId: null,
      heroMediaId: "media-1",
      createdAt: NOW,
      updatedAt: NOW,
      parent: null,
      children: [],
      translations: [translation],
    });
    const mediaFindUnique = vi.fn().mockResolvedValue({
      id: "media-1",
      storageKey: `2026/08/${checksum}.webp`,
      storageClass: "PUBLIC",
      mimeType: "image/webp",
      size: 10_000,
      alt: "Hero sintetis",
      isDecorative: false,
      width: 1_600,
      height: 900,
    });
    const database = {
      page: {findUnique},
      media: {findUnique: mediaFindUnique},
    } as unknown as AdminPageTransportDatabase;

    const result = await getAdminPageEditor(database, actor(), "page-1", "/uploads", clock);
    expect(result).toMatchObject({
      ok: true,
      data: {
        id: "page-1",
        heroMediaId: "media-1",
        hero: {
          id: "media-1",
          url: `/uploads/2026/08/${checksum}.webp`,
        },
      },
    });
    if (!result.ok) return;
    expect(result.data.hero).not.toHaveProperty("storageKey");
    expect(result.data.hero).not.toHaveProperty("storageClass");
  });

  it("fails closed when hero metadata cannot form the safe public view", async () => {
    const database = {
      page: {findUnique: vi.fn().mockResolvedValue({
        id: "page-1",
        slug: "profil-fakultas",
        status: "DRAFT",
        order: 1,
        version: 1,
        parentId: null,
        heroMediaId: "media-private",
        createdAt: NOW,
        updatedAt: NOW,
        parent: null,
        children: [],
        translations: [translation],
      })},
      media: {findUnique: vi.fn().mockResolvedValue({
        id: "media-private",
        storageKey: `private/${"b".repeat(64)}.webp`,
        storageClass: "PRIVATE",
        mimeType: "image/webp",
        size: 100,
        alt: "Private",
        isDecorative: false,
        width: 100,
        height: 100,
      })},
    } as unknown as AdminPageTransportDatabase;

    await expect(getAdminPageEditor(database, actor(), "page-1", "/uploads", clock))
      .resolves.toEqual({ok: false, code: "UNAVAILABLE"});
  });

  it("keeps invalid and missing identifiers on one NOT_FOUND surface", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const database = {page: {findUnique}} as unknown as AdminPageTransportDatabase;
    const malformed = await getAdminPageEditor(database, actor(), "bad/id", "/uploads", clock);
    const missing = await getAdminPageEditor(database, actor(), "missing-page", "/uploads", clock);
    expect(malformed).toEqual({ok: false, code: "NOT_FOUND"});
    expect(missing).toEqual(malformed);
  });

  it("delegates exactly CREATE, UPDATE, PUBLICATION, and DELETE", async () => {
    const database = {} as AdminPageTransportDatabase;
    const commands = [
      {action: "CREATE", payload: {...mutable, publication: {intent: "SAVE_DRAFT"}}},
      {action: "UPDATE", payload: {pageId: "page-1", expectedVersion: 1, ...mutable}},
      {
        action: "PUBLICATION",
        payload: {intent: "PUBLISH_NOW", pageId: "page-1", expectedVersion: 1},
      },
      {action: "DELETE", payload: {pageId: "page-1", expectedVersion: 1}},
    ] as const;

    for (const command of commands) {
      await expect(executeAdminPageCommand(database, actor(), command, clock)).resolves.toEqual({
        ok: true,
        pageId: "page-1",
        version: 2,
        status: "DRAFT",
        updatedAt: NOW.toISOString(),
      });
    }
    expect(mutationMocks.createPage).toHaveBeenCalledOnce();
    expect(mutationMocks.updatePage).toHaveBeenCalledOnce();
    expect(mutationMocks.mutatePagePublication).toHaveBeenCalledOnce();
    expect(mutationMocks.deletePage).toHaveBeenCalledOnce();
  });

  it("rejects injected commands before mutation and maps unexpected errors generically", async () => {
    const database = {} as AdminPageTransportDatabase;
    await expect(executeAdminPageCommand(database, actor(), {
      action: "DELETE",
      payload: {pageId: "page-1", expectedVersion: 1, role: "ADMIN"},
    }, clock)).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(mutationMocks.deletePage).not.toHaveBeenCalled();

    mutationMocks.deletePage.mockRejectedValueOnce(new Error("database detail"));
    await expect(executeAdminPageCommand(database, actor(), {
      action: "DELETE",
      payload: {pageId: "page-1", expectedVersion: 1},
    }, clock)).resolves.toEqual({ok: false, code: "UNAVAILABLE"});
  });

  it("maps all public HTTP status classes deterministically", () => {
    expect(adminPageHttpStatus({ok: true})).toBe(200);
    expect(adminPageHttpStatus({ok: false, code: "SESSION_INVALID"})).toBe(401);
    expect(adminPageHttpStatus({ok: false, code: "CSRF_INVALID"})).toBe(403);
    expect(adminPageHttpStatus({ok: false, code: "REQUEST_INVALID"})).toBe(400);
    expect(adminPageHttpStatus({ok: false, code: "NOT_FOUND"})).toBe(404);
    expect(adminPageHttpStatus({ok: false, code: "VERSION_CONFLICT"})).toBe(409);
    expect(adminPageHttpStatus({ok: false, code: "HIERARCHY_CYCLE"})).toBe(409);
    expect(adminPageHttpStatus({ok: false, code: "MEDIA_INVALID"})).toBe(422);
    expect(adminPageHttpStatus({ok: false, code: "PARENT_INVALID"})).toBe(422);
    expect(adminPageHttpStatus({ok: false, code: "UNAVAILABLE"})).toBe(503);
  });
});

describe("M4 Page admin Route Handlers", () => {
  it("rejects repeated GET parameters with no-store before session lookup", async () => {
    vi.resetModules();
    const getSession = vi.fn();
    const list = vi.fn();
    vi.doMock("next/cache", () => ({revalidatePath: vi.fn()}));
    vi.doMock("@/features/content/pages/admin-transport", () => ({
      adminPageHttpStatus,
      executeAdminPageCommand: vi.fn(),
      listAdminPages: list,
      normalizeAdminPageSearchParams,
    }));
    vi.doMock("@/lib/auth/runtime/csrf", () => ({isSameOriginRequest: vi.fn()}));
    vi.doMock("@/lib/auth/runtime/request-session", () => ({getRequestSession: getSession}));
    vi.doMock("@/lib/db/client", () => ({getPrismaClient: vi.fn()}));
    const route = await import("@/app/api/admin/pages/route");

    const response = await route.GET(new Request(
      "https://fuspi.test/api/admin/pages?page=1&page=2",
    ));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(getSession).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it("rejects CSRF before command execution and always returns no-store", async () => {
    vi.resetModules();
    const execute = vi.fn();
    const revalidate = vi.fn();
    vi.doMock("next/cache", () => ({revalidatePath: revalidate}));
    vi.doMock("@/features/content/pages/admin-transport", () => ({
      adminPageHttpStatus,
      executeAdminPageCommand: execute,
      listAdminPages: vi.fn(),
      normalizeAdminPageSearchParams,
    }));
    vi.doMock("@/lib/auth/runtime/csrf", () => ({isSameOriginRequest: () => false}));
    vi.doMock("@/lib/auth/runtime/request-session", () => ({getRequestSession: vi.fn()}));
    vi.doMock("@/lib/db/client", () => ({getPrismaClient: vi.fn()}));
    const route = await import("@/app/api/admin/pages/route");

    const response = await route.POST(new Request("https://fuspi.test/api/admin/pages", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({action: "DELETE", payload: {pageId: "page-1", expectedVersion: 1}}),
    }));
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ok: false, code: "CSRF_INVALID"});
    expect(execute).not.toHaveBeenCalled();
    expect(revalidate).not.toHaveBeenCalled();
  });

  it("bounds JSON and revalidates all locale paths only after success", async () => {
    vi.resetModules();
    const execute = vi.fn().mockResolvedValue({
      ok: true,
      pageId: "page-1",
      version: 2,
      status: "PUBLISHED",
      updatedAt: NOW.toISOString(),
    });
    const revalidate = vi.fn();
    vi.doMock("next/cache", () => ({revalidatePath: revalidate}));
    vi.doMock("@/features/content/pages/admin-transport", () => ({
      adminPageHttpStatus,
      executeAdminPageCommand: execute,
      listAdminPages: vi.fn(),
      normalizeAdminPageSearchParams,
    }));
    vi.doMock("@/lib/auth/runtime/csrf", () => ({isSameOriginRequest: () => true}));
    vi.doMock("@/lib/auth/runtime/request-session", () => ({
      getRequestSession: async () => ({ok: true, session: actor()}),
    }));
    vi.doMock("@/lib/db/client", () => ({getPrismaClient: () => ({})}));
    const route = await import("@/app/api/admin/pages/route");

    const oversized = await route.POST(new Request("https://fuspi.test/api/admin/pages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "1048577",
      },
      body: "{}",
    }));
    expect(oversized.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();

    const response = await route.POST(new Request("https://fuspi.test/api/admin/pages", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({action: "DELETE", payload: {pageId: "page-1", expectedVersion: 1}}),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(revalidate).toHaveBeenCalledTimes(9);
    for (const locale of ["id", "en", "ar"]) {
      expect(revalidate).toHaveBeenCalledWith(`/${locale}/admin/pages`);
      expect(revalidate).toHaveBeenCalledWith(
        `/${locale}/admin/pages/[pageId]/edit`,
        "page",
      );
      expect(revalidate).toHaveBeenCalledWith(`/${locale}/halaman/[slug]`, "page");
    }
  });

  it("awaits detail params and returns editor responses with no-store", async () => {
    vi.resetModules();
    const getEditor = vi.fn().mockResolvedValue({
      ok: true,
      data: {id: "page-1", slug: "profil-fakultas"},
    });
    const database = {};
    vi.doMock("@/features/content/pages/admin-transport", () => ({
      adminPageHttpStatus,
      getAdminPageEditor: getEditor,
    }));
    vi.doMock("@/lib/auth/runtime/request-session", () => ({
      getRequestSession: async () => ({ok: true, session: actor()}),
    }));
    vi.doMock("@/lib/db/client", () => ({getPrismaClient: () => database}));
    vi.stubEnv("UPLOAD_PUBLIC_URL", "/uploads");
    const route = await import("@/app/api/admin/pages/[pageId]/route");

    const response = await route.GET(
      new Request("https://fuspi.test/api/admin/pages/page-1"),
      {params: Promise.resolve({pageId: "page-1"})},
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({id: "page-1", slug: "profil-fakultas"});
    expect(getEditor).toHaveBeenCalledWith(database, actor(), "page-1", "/uploads");
    vi.unstubAllEnvs();
  });
});
