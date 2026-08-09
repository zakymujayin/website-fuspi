import {hash} from "bcryptjs";
import {NextRequest} from "next/server";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {POST as changePassword} from "@/app/api/auth/password/route";
import {getSessionCookieName} from "@/lib/auth/runtime/cookie";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M2 auth bridge adversarial on MariaDB", () => {
  const marker = `m2-ab-adv-${Date.now()}`;
  const oldPassword = "AdvBridgeOld-12";
  const newPassword = "AdvBridgeNew-34";
  const authUrl = "http://127.0.0.1:3004";
  let prisma: ReturnType<typeof createPrismaClient>;
  let userId: string;
  let previousAuthUrl: string | undefined;

  beforeAll(async () => {
    previousAuthUrl = process.env.AUTH_URL;
    process.env.AUTH_URL = authUrl;
    prisma = createPrismaClient();
    await prisma.$connect();
    const user = await prisma.user.create({
      data: {
        name: "Synthetic Adv Bridge",
        email: `${marker}@example.test`,
        passwordHash: await hash(oldPassword, 12),
        role: "ADMIN",
        mustChangePassword: true,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({where: {userId}});
    await prisma.user.deleteMany({where: {id: userId}});
    await prisma.$disconnect();
    if (previousAuthUrl === undefined) delete process.env.AUTH_URL;
    else process.env.AUTH_URL = previousAuthUrl;
  });

  async function createActorSession(): Promise<string> {
    const token = `${marker}-actor`;
    await prisma.session.create({
      data: {
        sessionToken: token,
        userId,
        expires: new Date(Date.now() + 60_000),
      },
    });
    return token;
  }

  function passwordRequest(body: unknown, contentType = "application/json") {
    return changePassword(
      new NextRequest(`${authUrl}/api/auth/password?locale=id`, {
        method: "POST",
        headers: {
          "content-type": contentType,
          cookie: `${getSessionCookieName(false)}=${marker}-actor`,
          origin: authUrl,
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  }

  // -----------------------------------------------------------------------
  // PASSWORD_POLICY rejection — mismatch, same-as-current, common password
  // -----------------------------------------------------------------------
  it("rejects mismatched password confirmation as PASSWORD_POLICY", async () => {
    await createActorSession();
    const response = await passwordRequest({
      currentPassword: oldPassword,
      newPassword,
      confirmPassword: "NotTheSamePassword!!",
    });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toEqual({ok: false, code: "PASSWORD_POLICY"});
    expect(Object.keys(payload)).toEqual(["ok", "code"]);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await prisma.session.count({where: {userId}})).toBeGreaterThan(0);
  });

  it("rejects same-as-current password as PASSWORD_POLICY", async () => {
    await prisma.session.deleteMany({where: {userId}});
    await createActorSession();
    const response = await passwordRequest({
      currentPassword: oldPassword,
      newPassword: oldPassword,
      confirmPassword: oldPassword,
    });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toEqual({ok: false, code: "PASSWORD_POLICY"});
    expect(await prisma.session.count({where: {userId}})).toBeGreaterThan(0);
  });

  it("rejects a common password as PASSWORD_POLICY", async () => {
    await prisma.session.deleteMany({where: {userId}});
    await createActorSession();
    const response = await passwordRequest({
      currentPassword: oldPassword,
      newPassword: "password1234",
      confirmPassword: "password1234",
    });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload).toEqual({ok: false, code: "PASSWORD_POLICY"});
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await prisma.session.count({where: {userId}})).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // Malformed body — non-object JSON types
  // -----------------------------------------------------------------------
  it.each([
    ["null", null],
    ["string", "not-an-object"],
    ["number", 42],
    ["array", ["a", "b"]],
    ["empty object", {}],
  ])("rejects malformed body %s as PASSWORD_POLICY", async (_label, body) => {
    await prisma.session.deleteMany({where: {userId}});
    await createActorSession();
    const response = await passwordRequest(body);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(["PASSWORD_POLICY", "SESSION_INVALID"]).toContain(payload.code);
    expect(Object.keys(payload)).toEqual(["ok", "code"]);
  });

  // -----------------------------------------------------------------------
  // Form-urlencoded body
  // -----------------------------------------------------------------------
  it("accepts form-urlencoded password change body", async () => {
    await prisma.session.deleteMany({where: {userId}});
    await createActorSession();
    const params = new URLSearchParams();
    params.set("currentPassword", oldPassword);
    params.set("newPassword", newPassword);
    params.set("confirmPassword", newPassword);
    const response = await passwordRequest(params.toString(), "application/x-www-form-urlencoded");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({
      ok: true,
      redirectTo: "/id/login?next=%2Fid%2Fadmin",
    });
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await prisma.session.count({where: {userId}})).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Route-level body sanitization — no secrets in error
  // -----------------------------------------------------------------------
  it("wrong current password exposes no PII or account data", async () => {
    await prisma.session.deleteMany({where: {userId}});
    await createActorSession();
    const response = await passwordRequest({
      currentPassword: "TotallyWrong-Password-99",
      newPassword: "ProperNewPassword34",
      confirmPassword: "ProperNewPassword34",
    });
    expect(response.status).toBe(400);
    const bodyText = JSON.stringify(await response.json());
    expect(bodyText).not.toContain(oldPassword);
    expect(bodyText).not.toContain("hash");
    expect(bodyText).not.toContain("passwordHash");
    expect(bodyText).not.toContain(marker);
    expect(bodyText).not.toContain(userId);
  });

  // -----------------------------------------------------------------------
  // Extra keys are rejected
  // -----------------------------------------------------------------------
  it("rejects body with extra unknown properties", async () => {
    await prisma.session.deleteMany({where: {userId}});
    await createActorSession();
    const response = await passwordRequest({
      currentPassword: oldPassword,
      newPassword,
      confirmPassword: newPassword,
      role: "ADMIN",
    });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
  });
});
