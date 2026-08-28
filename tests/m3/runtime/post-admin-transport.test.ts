import {describe, expect, it, vi} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  adminPostHttpStatus,
  executeAdminPostCommand,
  listAdminPosts,
  normalizeAdminPostSearchParams,
  type AdminPostTransportDatabase,
} from "@/lib/content/post-admin-transport";

const NOW = new Date("2026-07-21T08:00:00.000Z");
const clock = () => NOW;

function actor(role: ActiveDatabaseSession["role"] = "EDITOR"): ActiveDatabaseSession {
  return {
    userId: "editor-1",
    role,
    isActive: true,
    mustChangePassword: false,
    expiresAt: new Date("2026-07-21T16:00:00.000Z"),
  };
}

function translation(title: string) {
  return {
    locale: "id" as const,
    title,
    excerpt: null,
    content: "<p>Konten.</p>",
    metaTitle: null,
    metaDesc: null,
    coverCaption: null,
  };
}

describe("M3 Post admin transport runtime", () => {
  it("rejects repeated and unknown list parameters before database access", () => {
    expect(normalizeAdminPostSearchParams(new URLSearchParams("page=1&page=2"))).toEqual({
      ok: false,
      code: "REQUEST_INVALID",
    });
    expect(normalizeAdminPostSearchParams(new URLSearchParams("ownerId=attacker"))).toEqual({
      ok: false,
      code: "REQUEST_INVALID",
    });
    expect(normalizeAdminPostSearchParams(new URLSearchParams("page=2&pageSize=10"))).toEqual({
      ok: true,
      data: {page: 2, pageSize: 10, type: "BERITA", status: "ALL", search: "", sort: "UPDATED_DESC"},
    });
  });

  it("fails closed for missing, forbidden, expired, and password-change sessions", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as AdminPostTransportDatabase;
    const query = {page: 1, pageSize: 20, status: "ALL", search: "", sort: "UPDATED_DESC"};

    for (const session of [
      null,
      actor("PETUGAS"),
      {...actor(), expiresAt: NOW},
      {...actor(), mustChangePassword: true},
    ]) {
      await expect(listAdminPosts(database, session, query, clock)).resolves.toEqual({
        ok: false,
        code: "SESSION_INVALID",
      });
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("applies Berita and EDITOR ownership predicates in the database query", async () => {
    const findMany = vi.fn().mockResolvedValue([{
      id: "post-1",
      slug: "berita-satu",
      status: "DRAFT",
      version: 1,
      isFeatured: false,
      publishedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      categoryId: null,
      coverMediaId: null,
      contentOwnerId: "editor-1",
      authorId: "editor-1",
      author: {name: "Editor FUSPI"},
      category: null,
      coverMedia: null,
      translations: [translation("Berita Satu")],
      tags: [],
    }]);
    const count = vi.fn().mockResolvedValue(1);
    const database = {
      post: {findMany, count},
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    } as unknown as AdminPostTransportDatabase;

    const result = await listAdminPosts(database, actor(), {
      page: 1, pageSize: 20, status: "ALL", search: "", sort: "UPDATED_DESC",
    }, clock);
    expect(result).toMatchObject({ok: true, data: {total: 1, items: [{title: "Berita Satu"}]}});
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        type: "BERITA",
        authorId: "editor-1",
        contentOwnerId: "editor-1",
      }),
    }));
    expect(count).toHaveBeenCalledWith({where: expect.objectContaining({type: "BERITA"})});
  });

  it("makes missing, wrong-type, and cross-owner mutation targets indistinguishable", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const transaction = vi.fn();
    const database = {post: {findFirst}, $transaction: transaction} as unknown as AdminPostTransportDatabase;
    const base = {
      action: "DELETE",
      payload: {postId: "post-target", expectedVersion: 1},
    };
    const missing = await executeAdminPostCommand(database, actor(), base, clock);
    const knownOther = await executeAdminPostCommand(database, actor(), {
      ...base,
      payload: {...base.payload, postId: "known-other-type-or-owner"},
    }, clock);
    expect(missing).toEqual({ok: false, code: "NOT_FOUND"});
    expect(knownOther).toEqual(missing);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "post-target",
        // Plain commands cover BERITA and the structurally identical PENGUMUMAN; KOLOM is excluded.
        type: {in: ["BERITA", "PENGUMUMAN"]},
        authorId: "editor-1",
        contentOwnerId: "editor-1",
      },
      select: {id: true},
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects injected actor/type/status fields and maps public HTTP statuses", async () => {
    const database = {post: {findFirst: vi.fn()}} as unknown as AdminPostTransportDatabase;
    await expect(executeAdminPostCommand(database, actor(), {
      action: "DELETE",
      payload: {postId: "post-1", expectedVersion: 1, role: "ADMIN"},
    }, clock)).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(adminPostHttpStatus({ok: false, code: "SESSION_INVALID"})).toBe(401);
    expect(adminPostHttpStatus({ok: false, code: "CSRF_INVALID"})).toBe(403);
    expect(adminPostHttpStatus({ok: false, code: "NOT_FOUND"})).toBe(404);
    expect(adminPostHttpStatus({ok: false, code: "VERSION_CONFLICT"})).toBe(409);
    expect(adminPostHttpStatus({ok: false, code: "UNAVAILABLE"})).toBe(503);
  });
});
