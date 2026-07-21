import {beforeEach, describe, expect, it, vi} from "vitest";

const {getRequestSession, getPrismaClient, revalidatePath} = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  getPrismaClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/runtime/request-session", () => ({getRequestSession}));
vi.mock("@/lib/db/client", () => ({getPrismaClient}));
vi.mock("next/cache", () => ({revalidatePath}));

import {POST as commandPost} from "@/app/api/admin/media/route";
import {POST as uploadPost} from "@/app/api/admin/media/upload/route";

describe("M3 Media admin HTTP adversarial boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_URL = "http://localhost:3004";
    process.env.UPLOAD_DIR = "/tmp/fuspi-media-http-public";
    process.env.UPLOAD_PRIVATE_DIR = "/tmp/fuspi-media-http-private";
    process.env.PPKS_PRIVATE_DIR = "/tmp/fuspi-media-http-ppks";
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
    getPrismaClient.mockReturnValue({$transaction: vi.fn()});
  });

  it("rejects hostile origins before session, body, database, or filesystem work", async () => {
    for (const handler of [commandPost, uploadPost]) {
      const response = await handler(new Request("http://localhost:3004/api/admin/media", {
        method: "POST",
        headers: {origin: "https://attacker.invalid", "content-type": "application/json"},
        body: "{}",
      }));
      expect(response.status).toBe(403);
      expect(response.headers.get("cache-control")).toContain("no-store");
      await expect(response.json()).resolves.toEqual({ok: false, code: "CSRF_INVALID"});
    }
    expect(getRequestSession).not.toHaveBeenCalled();
    expect(getPrismaClient).not.toHaveBeenCalled();
  });

  it("rejects an invalid session before consuming a large upload body", async () => {
    getRequestSession.mockResolvedValue({ok: false, code: "SESSION_INVALID"});
    const response = await uploadPost(new Request("http://localhost:3004/api/admin/media/upload", {
      method: "POST",
      headers: {origin: "http://localhost:3004", "content-type": "multipart/form-data; boundary=x"},
      body: "--x\r\ninvalid",
    }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ok: false, code: "SESSION_INVALID"});
    expect(getPrismaClient).not.toHaveBeenCalled();
  });

  it("rejects command identity and force-delete injection before Prisma", async () => {
    const response = await commandPost(new Request("http://localhost:3004/api/admin/media", {
      method: "POST",
      headers: {origin: "http://localhost:3004", "content-type": "application/json"},
      body: JSON.stringify({
        action: "DELETE",
        payload: {mediaId: "media-1", force: true, uploaderId: "attacker", role: "ADMIN"},
      }),
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(getPrismaClient().$transaction).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects unknown multipart fields without invoking Prisma", async () => {
    const form = new FormData();
    form.set("metadata", JSON.stringify({
      policy: "CMS_IMAGE",
      uploadCount: 1,
      intents: [{policy: "CMS_IMAGE", alt: "Fixture", isDecorative: false}],
    }));
    form.set("files", new File([new Uint8Array([1, 2, 3])], "fixture.png", {type: "image/png"}));
    form.set("uploaderId", "attacker");
    const response = await uploadPost(new Request("http://localhost:3004/api/admin/media/upload", {
      method: "POST",
      headers: {origin: "http://localhost:3004"},
      body: form,
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(getPrismaClient).not.toHaveBeenCalled();
  });
});
