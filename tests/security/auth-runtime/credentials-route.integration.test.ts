import {hash} from "bcryptjs";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {POST} from "@/app/api/auth/credentials/route";
import {createLoginRateLimitKey} from "@/lib/auth/runtime/rate-limit";
import {SESSION_MAX_AGE_SECONDS} from "@/lib/auth/runtime/config";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M2 credentials route adversarial (MariaDB)", () => {
  const marker = `m2-route-${Date.now()}`;
  const emailSecret = "e".repeat(32);
  const ipSecret = "i".repeat(32);
  const oldPassword = "Synthetic-Route-Pass-12";
  const configuredOrigin = process.env.AUTH_URL ?? "http://localhost:3000";
  let prisma: ReturnType<typeof createPrismaClient>;
  let activeUserId: string;
  let activeEmail: string;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const passwordHash = await hash(oldPassword, 12);
    activeEmail = `${marker}-active@example.test`;
    const user = await prisma.user.create({
      data: {
        name: "Synthetic Route Active",
        email: activeEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    activeUserId = user.id;
  });

  afterAll(async () => {
    const rateLimitKeys = ["192.0.2.70", "192.0.2.71", "192.0.2.72"].map(
      (ip) =>
        createLoginRateLimitKey(activeEmail, ip, emailSecret, ipSecret)
          .keyHash,
    );
    await prisma.rateLimitBucket.deleteMany({
      where: {keyHash: {in: rateLimitKeys}},
    });
    await prisma.session.deleteMany({where: {userId: activeUserId}});
    await prisma.user.deleteMany({where: {email: activeEmail}});
    await prisma.$disconnect();
  });

  it("hostile-origin request returns 403 and creates no session or rate-limit mutation", async () => {
    const beforeSessions = await prisma.session.count({where: {userId: activeUserId}});
    const req = new Request(
      `${configuredOrigin}/api/auth/credentials`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.example.test",
          "x-real-ip": "192.0.2.70",
        },
        body: JSON.stringify({
          email: activeEmail,
          password: oldPassword,
        }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(403);

    const bodyText = await res.text();
    expect(bodyText).toBe("");

    const afterSessions = await prisma.session.count({where: {userId: activeUserId}});
    expect(afterSessions).toBe(beforeSessions);
  });

  it("successful login returns 200, cookie, and expected JSON shape", async () => {
    const req = new Request(
      `${configuredOrigin}/api/auth/credentials?redirectTo=%2Fid%2Fadmin`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: configuredOrigin,
          "x-real-ip": "192.0.2.71",
        },
        body: JSON.stringify({
          email: activeEmail,
          password: oldPassword,
        }),
      },
    );
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.redirectTo).toBe("/id/admin");
    expect(body).toHaveProperty("requiresPasswordChange");
    expect(Object.keys(body).sort()).toEqual(
      ["ok", "redirectTo", "requiresPasswordChange"].sort(),
    );
    expect(JSON.stringify(body)).not.toContain(oldPassword);
    expect(JSON.stringify(body)).not.toContain(activeEmail);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(JSON.stringify(body)).not.toContain("sessionToken");
    expect(JSON.stringify(body)).not.toContain("192.0.2");
    expect(JSON.stringify(body)).not.toContain("__Secure");

    const cookieHeader = res.headers.getSetCookie?.() ?? [];
    expect(cookieHeader.length).toBeGreaterThanOrEqual(1);
    const cookie = cookieHeader[0];
    expect(cookie).toContain("authjs.session-token=");
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("path=/");
    expect(cookie).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
    expect(cookie).not.toContain("password");
    expect(cookie).not.toContain("ADMIN");

    const stored = await prisma.session.findFirst({
      where: {userId: activeUserId},
      orderBy: {expires: "desc"},
    });
    expect(stored).toBeDefined();
    if (stored) {
      const ttl = stored.expires.getTime() - Date.now();
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThan(SESSION_MAX_AGE_SECONDS * 1_000 + 5_000);
    }
  });

  it("wrong password returns 401 with sanitized public shape", async () => {
    const req = new Request(
      `${configuredOrigin}/api/auth/credentials`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: configuredOrigin,
          "x-real-ip": "192.0.2.72",
        },
        body: JSON.stringify({
          email: activeEmail,
          password: "Wrong-Password-For-Sure",
        }),
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body).toEqual({ok: false, code: "INVALID_CREDENTIALS"});
    expect(Object.keys(body).sort()).toEqual(["code", "ok"].sort());
    expect(JSON.stringify(body)).not.toContain(oldPassword);
    expect(JSON.stringify(body)).not.toContain(activeEmail);
  });
});
