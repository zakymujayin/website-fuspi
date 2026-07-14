import {compare, hash} from "bcryptjs";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createActiveSessionAdapter} from "@/lib/auth/runtime/adapter";
import type {SessionCookieDefinition} from "@/lib/auth/runtime/cookie";
import {createDatabaseSession, validateDatabaseSession} from "@/lib/auth/runtime/session";
import {authenticateCredentials} from "@/lib/auth/runtime/credentials";
import {
  changeOwnPassword,
  changeUserRole,
  setUserActiveState,
} from "@/lib/auth/runtime/password";
import {createLoginRateLimitKey} from "@/lib/auth/runtime/rate-limit";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M2 auth runtime on MariaDB", () => {
  const marker = `m2-auth-${Date.now()}`;
  const emailSecret = "e".repeat(32);
  const ipSecret = "i".repeat(32);
  const oldPassword = "Synthetic-Old-Password-12";
  const newPassword = "Synthetic-New-Password-34";
  const now = new Date("2026-07-14T03:00:00.000Z");
  let prisma: ReturnType<typeof createPrismaClient>;
  let activeUserId: string;
  let inactiveUserId: string;
  let passwordUserId: string;
  let targetUserId: string;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const passwordHash = await hash(oldPassword, 12);
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: "Synthetic Active",
          email: `${marker}-active@example.test`,
          passwordHash,
          role: "ADMIN",
          mustChangePassword: true,
        },
      }),
      prisma.user.create({
        data: {
          name: "Synthetic Inactive",
          email: `${marker}-inactive@example.test`,
          passwordHash,
          role: "EDITOR",
          isActive: false,
        },
      }),
      prisma.user.create({
        data: {
          name: "Synthetic Password",
          email: `${marker}-password@example.test`,
          passwordHash,
          role: "EDITOR",
          mustChangePassword: true,
        },
      }),
      prisma.user.create({
        data: {
          name: "Synthetic Target",
          email: `${marker}-target@example.test`,
          passwordHash,
          role: "EDITOR",
        },
      }),
    ]);
    [activeUserId, inactiveUserId, passwordUserId, targetUserId] = users.map(
      (user) => user.id,
    );
  });

  afterAll(async () => {
    const rateLimitKeys = [
      [`${marker}-active@example.test`, "192.0.2.10"],
      [`${marker}-active@example.test`, "192.0.2.21"],
      [`${marker}-unknown@example.test`, "192.0.2.22"],
      [`${marker}-inactive@example.test`, "192.0.2.23"],
    ].map(([email, ip]) =>
      createLoginRateLimitKey(email, ip, emailSecret, ipSecret).keyHash,
    );
    await prisma.rateLimitBucket.deleteMany({where: {keyHash: {in: rateLimitKeys}}});
    await prisma.session.deleteMany({
      where: {userId: {in: [activeUserId, inactiveUserId, passwordUserId, targetUserId]}},
    });
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  it("creates an opaque eight-hour database session consumable by the Auth.js adapter", async () => {
    let comparisons = 0;
    let cookie: SessionCookieDefinition | undefined;
    const result = await authenticateCredentials({
      prisma,
      rawCredentials: {
        email: `${marker}-active@example.test`,
        password: oldPassword,
      },
      clientIp: "192.0.2.10",
      now,
      emailHmacSecret: emailSecret,
      ipHmacSecret: ipSecret,
      async comparePassword(password, passwordHash) {
        comparisons += 1;
        return compare(password, passwordHash);
      },
      async issueSession(userId) {
        const issued = await createDatabaseSession(prisma, userId, {
          now,
          production: false,
          tokenFactory: () => `${marker}-opaque-session`,
        });
        cookie = issued.cookie;
      },
    });

    expect(comparisons).toBe(1);
    expect(result).toEqual({
      ok: true,
      redirectTo: "/id/admin",
      requiresPasswordChange: true,
    });
    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining(["email", "passwordHash", "sessionToken"]),
    );
    expect(JSON.stringify(result)).not.toContain(oldPassword);
    expect(cookie).toMatchObject({
      name: "authjs.session-token",
      options: {httpOnly: true, sameSite: "lax", path: "/", maxAge: 28_800},
    });

    const stored = await prisma.session.findUniqueOrThrow({
      where: {sessionToken: `${marker}-opaque-session`},
    });
    expect(stored.expires.getTime() - now.getTime()).toBe(28_800_000);
    expect(
      await validateDatabaseSession(prisma, `${marker}-opaque-session`, now),
    ).toMatchObject({ok: true, session: {userId: activeUserId, role: "ADMIN"}});

    const adapterSession = await createActiveSessionAdapter(prisma).getSessionAndUser?.(
      `${marker}-opaque-session`,
    );
    expect(adapterSession?.session).toMatchObject({userId: activeUserId});
    expect(adapterSession?.user.id).toBe(activeUserId);
  });

  it("returns identical failure sequences for existing, unknown, and inactive accounts", async () => {
    const attempts = async (email: string, clientIp: string) => {
      const codes = [];
      let comparisons = 0;
      for (let attempt = 1; attempt <= 6; attempt += 1) {
        const result = await authenticateCredentials({
          prisma,
          rawCredentials: {email, password: "wrong-password"},
          clientIp,
          now,
          emailHmacSecret: emailSecret,
          ipHmacSecret: ipSecret,
          comparePassword: async () => {
            comparisons += 1;
            return false;
          },
          async issueSession() {
            throw new Error("A rejected login must not issue a session.");
          },
        });
        if (result.ok) throw new Error("Expected a rejected login.");
        codes.push(result.code);
      }
      return {codes, comparisons};
    };

    const [existing, unknown, inactive] = await Promise.all([
      attempts(`${marker}-active@example.test`, "192.0.2.21"),
      attempts(`${marker}-unknown@example.test`, "192.0.2.22"),
      attempts(`${marker}-inactive@example.test`, "192.0.2.23"),
    ]);
    expect(existing.codes).toEqual([
      "INVALID_CREDENTIALS",
      "INVALID_CREDENTIALS",
      "INVALID_CREDENTIALS",
      "INVALID_CREDENTIALS",
      "INVALID_CREDENTIALS",
      "TRY_AGAIN_LATER",
    ]);
    expect(unknown.codes).toEqual(existing.codes);
    expect(inactive.codes).toEqual(existing.codes);
    expect([existing.comparisons, unknown.comparisons, inactive.comparisons]).toEqual([
      6, 6, 6,
    ]);

    const buckets = await prisma.rateLimitBucket.findMany({
      where: {
        keyHash: {
          in: [
            createLoginRateLimitKey(
              `${marker}-active@example.test`,
              "192.0.2.21",
              emailSecret,
              ipSecret,
            ).keyHash,
            createLoginRateLimitKey(
              `${marker}-unknown@example.test`,
              "192.0.2.22",
              emailSecret,
              ipSecret,
            ).keyHash,
            createLoginRateLimitKey(
              `${marker}-inactive@example.test`,
              "192.0.2.23",
              emailSecret,
              ipSecret,
            ).keyHash,
          ],
        },
      },
      select: {keyHash: true, count: true},
    });
    expect(buckets).toHaveLength(3);
    expect(buckets.every((bucket) => bucket.count === 6)).toBe(true);
    expect(JSON.stringify(buckets)).not.toContain(marker);
    expect(JSON.stringify(buckets)).not.toContain("192.0.2.");
  });

  it("rejects expired and inactive sessions and removes their rows", async () => {
    await prisma.session.createMany({
      data: [
        {
          sessionToken: `${marker}-expired`,
          userId: activeUserId,
          expires: new Date(now.getTime() - 1),
        },
        {
          sessionToken: `${marker}-inactive`,
          userId: inactiveUserId,
          expires: new Date(now.getTime() + 60_000),
        },
      ],
    });
    expect(await validateDatabaseSession(prisma, `${marker}-expired`, now)).toEqual({
      ok: false,
      code: "SESSION_INVALID",
    });
    expect(await validateDatabaseSession(prisma, `${marker}-inactive`, now)).toEqual({
      ok: false,
      code: "SESSION_INVALID",
    });
    expect(
      await prisma.session.count({
        where: {sessionToken: {in: [`${marker}-expired`, `${marker}-inactive`]}},
      }),
    ).toBe(0);
  });

  it("changes password atomically and revokes every prior session", async () => {
    await prisma.session.createMany({
      data: [1, 2, 3].map((index) => ({
        sessionToken: `${marker}-password-${index}`,
        userId: passwordUserId,
        expires: new Date(Date.now() + 60_000),
      })),
    });
    const result = await changeOwnPassword(
      prisma,
      `${marker}-password-1`,
      {
        currentPassword: oldPassword,
        newPassword,
        confirmPassword: newPassword,
      },
    );
    expect(result).toEqual({ok: true});
    const user = await prisma.user.findUniqueOrThrow({where: {id: passwordUserId}});
    expect(user.mustChangePassword).toBe(false);
    expect(await compare(newPassword, user.passwordHash ?? "")).toBe(true);
    expect(await prisma.session.count({where: {userId: passwordUserId}})).toBe(0);
  });

  it("revokes sessions transactionally on role change and deactivation", async () => {
    await prisma.session.upsert({
      where: {sessionToken: `${marker}-admin-actor`},
      create: {
        sessionToken: `${marker}-admin-actor`,
        userId: activeUserId,
        expires: new Date(Date.now() + 60_000),
      },
      update: {expires: new Date(Date.now() + 60_000)},
    });
    await prisma.session.create({
      data: {
        sessionToken: `${marker}-target-role`,
        userId: targetUserId,
        expires: new Date(now.getTime() + 60_000),
      },
    });
    expect(
      await changeUserRole(
        prisma,
        `${marker}-admin-actor`,
        targetUserId,
        "PETUGAS",
      ),
    ).toEqual({ok: true});
    expect(await prisma.session.count({where: {userId: targetUserId}})).toBe(0);

    await prisma.session.create({
      data: {
        sessionToken: `${marker}-target-active`,
        userId: targetUserId,
        expires: new Date(now.getTime() + 60_000),
      },
    });
    expect(
      await setUserActiveState(
        prisma,
        `${marker}-admin-actor`,
        targetUserId,
        false,
      ),
    ).toEqual({ok: true});
    expect(await prisma.session.count({where: {userId: targetUserId}})).toBe(0);
  });

  it("rejects stale sessions and non-admin security mutations without changing data", async () => {
    expect(
      await changeOwnPassword(prisma, `${marker}-missing-session`, {
        currentPassword: oldPassword,
        newPassword,
        confirmPassword: newPassword,
      }),
    ).toEqual({ok: false, code: "SESSION_INVALID"});

    const editorSession = `${marker}-editor-actor`;
    await prisma.session.create({
      data: {
        sessionToken: editorSession,
        userId: passwordUserId,
        expires: new Date(Date.now() + 60_000),
      },
    });
    const before = await prisma.user.findUniqueOrThrow({where: {id: activeUserId}});
    expect(
      await changeUserRole(prisma, editorSession, activeUserId, "SATGAS_PPKS"),
    ).toEqual({ok: false, code: "NOT_AUTHORIZED"});
    const after = await prisma.user.findUniqueOrThrow({where: {id: activeUserId}});
    expect(after.role).toBe(before.role);
  });
});
