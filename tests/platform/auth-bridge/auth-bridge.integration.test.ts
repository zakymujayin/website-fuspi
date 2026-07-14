import {hash, compare} from "bcryptjs";
import {NextRequest} from "next/server";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {POST as changePassword} from "@/app/api/auth/password/route";
import {getSessionCookieName} from "@/lib/auth/runtime/cookie";
import {validateRequestSession} from "@/lib/auth/runtime/request-session";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M2 auth bridge on PostgreSQL", () => {
  const marker = `m2-auth-bridge-${Date.now()}`;
  const oldPassword = "Synthetic-Bridge-Old-12";
  const newPassword = "Synthetic-Bridge-New-34";
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
        name: "Synthetic Auth Bridge",
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

  it("revalidates active cookies and rejects then removes expired sessions", async () => {
    const activeToken = `${marker}-active`;
    const expiredToken = `${marker}-expired`;
    await prisma.session.createMany({
      data: [
        {
          sessionToken: activeToken,
          userId,
          expires: new Date(Date.now() + 60_000),
        },
        {
          sessionToken: expiredToken,
          userId,
          expires: new Date(Date.now() - 60_000),
        },
      ],
    });

    const cookieStore = (token: string) => ({
      get: (name: string) =>
        name === getSessionCookieName(false) ? {value: token} : undefined,
    });
    expect(await validateRequestSession(prisma, cookieStore(activeToken), false)).toMatchObject({
      ok: true,
      session: {role: "ADMIN", mustChangePassword: true},
    });
    expect(await validateRequestSession(prisma, cookieStore(expiredToken), false)).toEqual({
      ok: false,
      code: "SESSION_INVALID",
    });
    expect(await prisma.session.findUnique({where: {sessionToken: expiredToken}})).toBeNull();
  });

  it("rejects cross-origin and missing-session password mutations", async () => {
    const crossOrigin = await changePassword(
      new NextRequest(`${authUrl}/api/auth/password?locale=id`, {
        method: "POST",
        headers: {origin: "https://attacker.example.test"},
      }),
    );
    expect(crossOrigin.status).toBe(403);
    expect(await crossOrigin.text()).toBe("");

    const missing = await changePassword(
      new NextRequest(`${authUrl}/api/auth/password?locale=id`, {
        method: "POST",
        headers: {origin: authUrl},
      }),
    );
    expect(missing.status).toBe(401);
    expect(await missing.json()).toEqual({ok: false, code: "SESSION_INVALID"});
  });

  it("keeps wrong-current-password failures generic and non-destructive", async () => {
    const actorToken = `${marker}-active`;
    const response = await changePassword(
      new NextRequest(`${authUrl}/api/auth/password?locale=id`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${getSessionCookieName(false)}=${actorToken}`,
          origin: authUrl,
        },
        body: JSON.stringify({
          currentPassword: "Synthetic-Wrong-Password-99",
          newPassword,
          confirmPassword: newPassword,
        }),
      }),
    );

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload).toEqual({ok: false, code: "INVALID_CREDENTIALS"});
    expect(Object.keys(payload)).toEqual(["ok", "code"]);
    expect(await prisma.session.findUnique({where: {sessionToken: actorToken}})).not.toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("changes the password, revokes every session, and returns only a safe locale redirect", async () => {
    const actorToken = `${marker}-password-actor`;
    await prisma.session.createMany({
      data: [actorToken, `${marker}-second-session`].map((sessionToken) => ({
        sessionToken,
        userId,
        expires: new Date(Date.now() + 60_000),
      })),
    });

    const response = await changePassword(
      new NextRequest(
        `${authUrl}/api/auth/password?locale=ar&redirectTo=${encodeURIComponent("/id/admin/berita")}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `${getSessionCookieName(false)}=${actorToken}`,
            origin: authUrl,
          },
          body: JSON.stringify({
            currentPassword: oldPassword,
            newPassword,
            confirmPassword: newPassword,
          }),
        },
      ),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({
      ok: true,
      redirectTo: "/ar/login?next=%2Far%2Fadmin%2Fberita",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toContain("authjs.session-token=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await prisma.session.count({where: {userId}})).toBe(0);

    const user = await prisma.user.findUniqueOrThrow({where: {id: userId}});
    expect(user.mustChangePassword).toBe(false);
    expect(await compare(newPassword, user.passwordHash ?? "")).toBe(true);
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("passwordhash");
  });
});
