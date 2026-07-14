import {compare, hash} from "bcryptjs";
import {afterAll, afterEach, beforeAll, describe, expect, it} from "vitest";

import {
  authenticateCredentials,
  selectCredentialComparison,
} from "@/lib/auth/runtime/credentials";
import {DUMMY_BCRYPT_HASH} from "@/lib/auth/runtime/config";
import {revokeAllUserSessions} from "@/lib/auth/runtime/session";
import {
  changeOwnPassword,
  setUserActiveState,
} from "@/lib/auth/runtime/password";
import {
  createLoginRateLimitKey,
  registerFailedLoginAttempt,
} from "@/lib/auth/runtime/rate-limit";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M2 auth runtime adversarial (MariaDB)", () => {
  const marker = `m2-advc-${Date.now()}`;
  const emailSecret = "e".repeat(32);
  const ipSecret = "i".repeat(32);
  const oldPassword = "Synthetic-Old-Pass-12";
  let prisma: ReturnType<typeof createPrismaClient>;
  let activeUserId: string;
  let inactiveUserId: string;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const passwordHash = await hash(oldPassword, 12);
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: "Synthetic AdvC Active",
          email: `${marker}-active@example.test`,
          passwordHash,
          role: "ADMIN",
        },
      }),
      prisma.user.create({
        data: {
          name: "Synthetic AdvC Inactive",
          email: `${marker}-inactive@example.test`,
          passwordHash,
          role: "EDITOR",
          isActive: false,
        },
      }),
    ]);
    [activeUserId, inactiveUserId] = users.map((user) => user.id);
  });

  afterAll(async () => {
    const allEmails = [
      `${marker}-active@example.test`,
      `${marker}-inactive@example.test`,
    ];
    const allIps = ["192.0.2.60", "192.0.2.61", "192.0.2.62", "192.0.2.63"];
    const rateLimitHashes: string[] = [];
    for (const email of allEmails) {
      for (const ip of allIps) {
        rateLimitHashes.push(
          createLoginRateLimitKey(email, ip, emailSecret, ipSecret).keyHash,
        );
      }
    }
    await prisma.rateLimitBucket.deleteMany({
      where: {keyHash: {in: rateLimitHashes}},
    });
    await prisma.session.deleteMany({
      where: {userId: {in: [activeUserId, inactiveUserId]}},
    });
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  afterEach(async () => {
    const allEmails = [
      `${marker}-active@example.test`,
      `${marker}-inactive@example.test`,
    ];
    const allIps = ["192.0.2.60", "192.0.2.61", "192.0.2.62", "192.0.2.63"];
    const rateLimitHashes: string[] = [];
    for (const email of allEmails) {
      for (const ip of allIps) {
        rateLimitHashes.push(
          createLoginRateLimitKey(email, ip, emailSecret, ipSecret).keyHash,
        );
      }
    }
    await prisma.rateLimitBucket.deleteMany({
      where: {keyHash: {in: rateLimitHashes}},
    });
    await prisma.session.deleteMany({
      where: {userId: {in: [activeUserId, inactiveUserId]}},
    });
  });

  it("rate-limit keyHash does not store raw email or IP", () => {
    const key = createLoginRateLimitKey(
      `${marker}-active@example.test`,
      "192.0.2.60",
      emailSecret,
      ipSecret,
    );
    expect(key.keyHash).not.toContain(marker);
    expect(key.keyHash).not.toContain("@example");
    expect(key.keyHash).not.toContain("192.0.2");
    expect(key.keyHash).toMatch(/^[0-9a-f]+\.[0-9a-f]+$/);
  });

  it("rate-limit counter is not lost under concurrent same-window increments", async () => {
    const key = createLoginRateLimitKey(
      `${marker}-active@example.test`,
      "192.0.2.61",
      emailSecret,
      ipSecret,
    );
    const now = new Date();
    const errors: unknown[] = [];
    await Promise.allSettled(
      Array.from({length: 20}, () =>
        registerFailedLoginAttempt(prisma, key, now).catch((error) => {
          errors.push(error);
          throw error;
        }),
      ),
    );
    expect(errors).toHaveLength(0);

    const bucket = await prisma.rateLimitBucket.findUniqueOrThrow({
      where: {
        keyHash_scope_windowStart: {
          keyHash: key.keyHash,
          scope: key.scope,
          windowStart: new Date(
            Math.floor(now.getTime() / 900_000) * 900_000,
          ),
        },
      },
      select: {count: true},
    });
    expect(bucket.count).toBe(20);
  });

  it("login failure never issues a cookie when the session issuer throws", async () => {
    let issued = false;
    const result = await authenticateCredentials({
      prisma,
      rawCredentials: {
        email: `${marker}-active@example.test`,
        password: oldPassword,
      },
      clientIp: "192.0.2.62",
      now: new Date(),
      emailHmacSecret: emailSecret,
      ipHmacSecret: ipSecret,
      async comparePassword() {
        return true;
      },
      async issueSession() {
        issued = true;
        throw new Error("simulated adapter failure during session creation");
      },
    });
    expect(issued).toBe(true);
    expect(result).toEqual({ok: false, code: "AUTH_UNAVAILABLE"});
  });

  it("deactivating a user revokes all their sessions in the same transaction", async () => {
    const future = new Date(Date.now() + 120_000);
    await prisma.session.createMany({
      data: [1, 2, 3].map((index) => ({
        sessionToken: `${marker}-deact-${index}`,
        userId: activeUserId,
        expires: future,
      })),
    });
    const actor = `${marker}-deact-1`;

    const result = await setUserActiveState(
      prisma,
      actor,
      activeUserId,
      false,
    );
    expect(result).toEqual({ok: true});

    const sessionCount = await prisma.session.count({
      where: {userId: activeUserId},
    });
    expect(sessionCount).toBe(0);

    const user = await prisma.user.findUniqueOrThrow({
      where: {id: activeUserId},
    });
    expect(user.isActive).toBe(false);

    await prisma.user.update({
      where: {id: activeUserId},
      data: {isActive: true},
    });
  });

  it("password change revokes every prior session inside the same transaction", async () => {
    const future = new Date(Date.now() + 120_000);
    const activeSessions = [
      `${marker}-pwd-s1`,
      `${marker}-pwd-s2`,
      `${marker}-pwd-s3`,
    ];
    await prisma.session.createMany({
      data: activeSessions.map((token) => ({
        sessionToken: token,
        userId: activeUserId,
        expires: future,
      })),
    });

    const newPassword = "Synthetic-New-Pass-34";
    const result = await changeOwnPassword(prisma, activeSessions[0], {
      currentPassword: oldPassword,
      newPassword,
      confirmPassword: newPassword,
    });
    expect(result).toEqual({ok: true});

    expect(
      await prisma.session.count({where: {userId: activeUserId}}),
    ).toBe(0);

    const user = await prisma.user.findUniqueOrThrow({
      where: {id: activeUserId},
    });
    expect(await compare(newPassword, user.passwordHash ?? "")).toBe(true);
  });

  it("selectCredentialComparison returns exactly one dummy hash for unknown users", () => {
    const c = selectCredentialComparison(null);
    expect(c.hash).toBe(DUMMY_BCRYPT_HASH);
    expect(c.eligible).toBe(false);
  });

  it("inactive users still trigger one real bcrypt comparison", () => {
    const c = selectCredentialComparison({
      id: inactiveUserId,
      passwordHash: "real-hash-for-inactive",
      isActive: false,
      mustChangePassword: false,
    });
    expect(c.hash).toBe("real-hash-for-inactive");
    expect(c.eligible).toBe(false);
  });

  it("revokeAllUserSessions removes every row for a given user", async () => {
    const future = new Date(Date.now() + 120_000);
    await prisma.session.createMany({
      data: [1, 2].map((index) => ({
        sessionToken: `${marker}-revoke-${index}`,
        userId: activeUserId,
        expires: future,
      })),
    });
    await revokeAllUserSessions(prisma, activeUserId);
    expect(
      await prisma.session.count({where: {userId: activeUserId}}),
    ).toBe(0);
  });
});
