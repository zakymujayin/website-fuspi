import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {createPrismaClient} from "@/lib/db/client";
import {
  createPrismaOutboxRepository,
  processOutboxBatch,
} from "@/lib/outbox/worker";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M2 transactional outbox worker on PostgreSQL", () => {
  const marker = `m2-outbox-${Date.now()}`;
  const now = new Date("2026-07-15T07:00:00.000Z");
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.notificationOutbox.deleteMany({
      where: {idempotencyKey: {startsWith: marker}},
    });
    await prisma.$disconnect();
  });

  async function createMessage(
    suffix: string,
    overrides: Partial<Parameters<typeof prisma.notificationOutbox.create>[0]["data"]> = {},
  ) {
    return prisma.notificationOutbox.create({
      data: {
        type: "SYNTHETIC",
        recipient: `${suffix}@example.test`,
        template: "synthetic",
        payload: {suffix},
        idempotencyKey: `${marker}:${suffix}`,
        nextAttemptAt: new Date(now.getTime() - 1_000),
        ...overrides,
      },
    });
  }

  it("claims eligible rows once across parallel workers and recovers stale locks", async () => {
    const pendingA = await createMessage("pending-a");
    const pendingB = await createMessage("pending-b");
    const stale = await createMessage("stale", {
      status: "PROCESSING",
      attempts: 1,
      lockedBy: "dead-worker",
      lockedAt: new Date(now.getTime() - 10 * 60_000),
    });
    await createMessage("already-sent", {status: "SENT", sentAt: now});
    await createMessage("exhausted", {status: "FAILED", attempts: 5});
    await createMessage("fresh-lock", {
      status: "PROCESSING",
      attempts: 1,
      lockedBy: "active-worker",
      lockedAt: new Date(now.getTime() - 1_000),
    });

    const delivered: string[] = [];
    const run = (workerId: string) => processOutboxBatch({
      repository: createPrismaOutboxRepository(prisma),
      sender: {async send(message) { delivered.push(message.id); }},
      config: {workerId, batchSize: 2, lockTimeoutMs: 5 * 60_000},
      now,
    });
    const results = await Promise.all([run("worker_a"), run("worker_b")]);

    expect(results.reduce((sum, result) => sum + result.claimed, 0)).toBe(3);
    expect(results.reduce((sum, result) => sum + result.sent, 0)).toBe(3);
    expect(new Set(delivered)).toEqual(new Set([pendingA.id, pendingB.id, stale.id]));
    expect(delivered).toHaveLength(3);

    const rows = await prisma.notificationOutbox.findMany({
      where: {id: {in: [pendingA.id, pendingB.id, stale.id]}},
      orderBy: {id: "asc"},
    });
    expect(rows.every((row) => row.status === "SENT" && row.lockedBy === null)).toBe(true);
    expect(rows.find((row) => row.id === stale.id)?.attempts).toBe(2);

    const replay = await run("worker_replay");
    expect(replay.claimed).toBe(0);
    expect(delivered).toHaveLength(3);
  });

  it("schedules a generic final failure and never reclaims attempt five", async () => {
    const row = await createMessage("final-attempt", {status: "FAILED", attempts: 4});
    const repository = createPrismaOutboxRepository(prisma);
    const result = await processOutboxBatch({
      repository,
      sender: {async send() { throw new Error("SMTP secret and recipient leak"); }},
      config: {
        workerId: "worker_failure",
        baseBackoffMs: 1_000,
        maxBackoffMs: 10_000,
      },
      now,
    });
    expect(result).toEqual({claimed: 1, sent: 0, failed: 1, ownershipLost: 0});

    const failed = await prisma.notificationOutbox.findUniqueOrThrow({where: {id: row.id}});
    expect(failed).toMatchObject({
      status: "FAILED",
      attempts: 5,
      lastError: "DELIVERY_FAILED",
      lockedAt: null,
      lockedBy: null,
    });
    expect(failed.nextAttemptAt).toEqual(new Date(now.getTime() + 10_000));
    expect(JSON.stringify(failed)).not.toContain("SMTP secret");

    const replay = await processOutboxBatch({
      repository,
      sender: {async send() {}},
      config: {workerId: "worker_after_exhaustion"},
      now: new Date(now.getTime() + 60_000),
    });
    expect(replay.claimed).toBe(0);
  });

  it("requires current lock ownership to complete or fail a row", async () => {
    const row = await createMessage("ownership", {
      status: "PROCESSING",
      attempts: 1,
      lockedBy: "rightful_worker",
      lockedAt: now,
    });
    const repository = createPrismaOutboxRepository(prisma);
    expect(await repository.markSent(row.id, "wrong_worker", now)).toBe(false);
    expect(
      await repository.markFailed(
        row.id,
        "wrong_worker",
        new Date(now.getTime() + 1_000),
        "DELIVERY_FAILED",
      ),
    ).toBe(false);
    expect(await prisma.notificationOutbox.findUniqueOrThrow({where: {id: row.id}}))
      .toMatchObject({status: "PROCESSING", lockedBy: "rightful_worker"});
  });
});
