import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";
import {
  consumeSharedRateLimit,
  createSharedRateLimitKey,
} from "@/lib/rate-limit/persistent";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("shared persistent rate limit on PostgreSQL", () => {
  const secret = "shared-rate-limit-integration-secret-32-bytes";
  const marker = `synthetic-rate-${Date.now()}`;
  const keyHashes: string[] = [];
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.rateLimitBucket.deleteMany({where: {keyHash: {in: keyHashes}}});
    await prisma.$disconnect();
  });

  function key(policy: Parameters<typeof createSharedRateLimitKey>[0], suffix: string) {
    const digest = createSharedRateLimitKey(policy, `${marker}:${suffix}`, secret);
    keyHashes.push(digest);
    return digest;
  }

  it("allows exactly five of 25 simultaneous contact requests", async () => {
    const keyHash = key("CONTACT_SUBMIT", "parallel");
    const now = new Date("2026-07-15T10:10:00.000Z");
    const results = await Promise.all(Array.from({length: 25}, () =>
      consumeSharedRateLimit(prisma, {policy: "CONTACT_SUBMIT", keyHash, now})));

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toHaveLength(20);
    expect(results.filter((result) => !result.allowed).every((result) =>
      result.code === "RATE_LIMITED" && result.retryAfterSeconds === 3_000)).toBe(true);
    await expect(prisma.rateLimitBucket.findUniqueOrThrow({
      where: {
        keyHash_scope_windowStart: {
          keyHash,
          scope: "CONTACT_SUBMIT",
          windowStart: new Date("2026-07-15T10:00:00.000Z"),
        },
      },
    })).resolves.toMatchObject({
      count: 25,
      blockedUntil: new Date("2026-07-15T11:00:00.000Z"),
    });
  });

  it("stores only the HMAC digest and keeps policy scopes independent", async () => {
    const raw = `${marker}:raw-identifier`;
    const contactKey = createSharedRateLimitKey("CONTACT_SUBMIT", raw, secret);
    const surveyKey = createSharedRateLimitKey("SURVEY_SUBMIT", raw, secret);
    keyHashes.push(contactKey, surveyKey);
    const now = new Date("2026-07-15T11:00:00.000Z");
    await consumeSharedRateLimit(prisma, {policy: "CONTACT_SUBMIT", keyHash: contactKey, now});
    await consumeSharedRateLimit(prisma, {policy: "SURVEY_SUBMIT", keyHash: surveyKey, now});

    const rows = await prisma.rateLimitBucket.findMany({
      where: {keyHash: {in: [contactKey, surveyKey]}},
      orderBy: {scope: "asc"},
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.scope)).toEqual(["CONTACT_SUBMIT", "SURVEY_SUBMIT"]);
    expect(JSON.stringify(rows)).not.toContain(raw);
  });

  it("starts a clean counter at the next fixed window", async () => {
    const keyHash = key("TICKET_TRACK_NUMBER", "window-reset");
    const first = await consumeSharedRateLimit(prisma, {
      policy: "TICKET_TRACK_NUMBER",
      keyHash,
      now: new Date("2026-07-15T11:14:59.999Z"),
    });
    const next = await consumeSharedRateLimit(prisma, {
      policy: "TICKET_TRACK_NUMBER",
      keyHash,
      now: new Date("2026-07-15T11:15:00.000Z"),
    });
    expect(first).toMatchObject({allowed: true, remaining: 4});
    expect(next).toMatchObject({allowed: true, remaining: 4});
    await expect(prisma.rateLimitBucket.count({where: {
      keyHash,
      scope: "TICKET_TRACK_NUMBER",
    }})).resolves.toBe(2);
  });
});
