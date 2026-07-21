import {beforeEach, describe, expect, it, vi} from "vitest";

const {getRequestSession, getPrismaClient, revalidatePath} = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  getPrismaClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/runtime/request-session", () => ({getRequestSession}));
vi.mock("@/lib/db/client", () => ({getPrismaClient}));
vi.mock("next/cache", () => ({revalidatePath}));

import {POST} from "@/app/api/admin/posts/route";

describe("M3 Post admin HTTP adversarial boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_URL = "http://localhost:3004";
    getRequestSession.mockResolvedValue({
      ok: true,
      session: {
        userId: "editor-1",
        role: "EDITOR",
        isActive: true,
        mustChangePassword: false,
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
    getPrismaClient.mockReturnValue({post: {findFirst: vi.fn()}});
  });

  it("rejects missing and mismatched origins before reading session or database", async () => {
    for (const origin of [undefined, "https://attacker.invalid"]) {
      const headers: Record<string, string> = {"content-type": "application/json"};
      if (origin) headers.origin = origin;
      const response = await POST(new Request("http://localhost:3004/api/admin/posts", {
        method: "POST",
        headers,
        body: JSON.stringify({action: "DELETE", payload: {postId: "post-1", expectedVersion: 1}}),
      }));
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toContain("no-store");
      await expect(response.json()).resolves.toEqual({ok: false, code: "CSRF_INVALID"});
    }
    expect(getRequestSession).not.toHaveBeenCalled();
    expect(getPrismaClient).not.toHaveBeenCalled();
  });

  it("rejects wrong content type and declared oversized bodies before session validation", async () => {
    const wrongType = await POST(new Request("http://localhost:3004/api/admin/posts", {
      method: "POST",
      headers: {origin: "http://localhost:3004", "content-type": "text/plain"},
      body: "{}",
    }));
    expect(wrongType.status).toBe(400);
    await expect(wrongType.json()).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});

    const oversized = await POST(new Request("http://localhost:3004/api/admin/posts", {
      method: "POST",
      headers: {
        origin: "http://localhost:3004",
        "content-type": "application/json",
        "content-length": "1048577",
      },
      body: "{}",
    }));
    expect(oversized.status).toBe(400);
    expect(getRequestSession).not.toHaveBeenCalled();
  });

  it("rejects actor, role, type, and status injection without touching Prisma", async () => {
    const response = await POST(new Request("http://localhost:3004/api/admin/posts", {
      method: "POST",
      headers: {origin: "http://localhost:3004", "content-type": "application/json"},
      body: JSON.stringify({
        action: "DELETE",
        payload: {
          postId: "post-1",
          expectedVersion: 1,
          actor: "admin",
          role: "ADMIN",
          type: "PENGUMUMAN",
          status: "PUBLISHED",
        },
      }),
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(getPrismaClient().post.findFirst).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
