import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {recordActivity} from "@/lib/audit/activity-log";
import {createContentRevision} from "@/lib/db/revision";
import {createPrismaClient} from "@/lib/db/client";
import {enqueueNotification} from "@/lib/outbox/enqueue";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("platform database primitives", () => {
  const marker = `m1-${Date.now()}`;
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.notificationOutbox.deleteMany({
      where: {idempotencyKey: {startsWith: marker}},
    });
    await prisma.activityLog.deleteMany({where: {resourceId: marker}});
    await prisma.contentRevision.deleteMany({where: {resourceId: marker}});
    await prisma.$disconnect();
  });

  it("writes revision, audit, and outbox atomically", async () => {
    await prisma.$transaction(async (tx) => {
      await createContentRevision(tx, {
        resourceType: "Page",
        resourceId: marker,
        version: 1,
        snapshot: {title: "Synthetic M1 page"},
      });
      await recordActivity(tx, {
        action: "CREATE",
        resourceType: "Page",
        resourceId: marker,
        metadata: {route: "/synthetic", token: "must-not-persist"},
      });
      await enqueueNotification(tx, {
        sensitive: false,
        type: "CONTENT_REVIEW_DUE",
        recipient: "synthetic@example.invalid",
        template: "content-review-due",
        idempotencyKey: `${marker}:outbox`,
        payload: {resourceId: marker},
      });
    });

    const [revision, audit, outbox] = await Promise.all([
      prisma.contentRevision.findFirstOrThrow({where: {resourceId: marker}}),
      prisma.activityLog.findFirstOrThrow({where: {resourceId: marker}}),
      prisma.notificationOutbox.findUniqueOrThrow({
        where: {idempotencyKey: `${marker}:outbox`},
      }),
    ]);

    expect(revision.scopeKey).toBe("root");
    expect(audit.metadata).toMatchObject({token: "[REDACTED]"});
    expect(outbox.payloadEncrypted).toBe(false);
  });

  it("enforces revision and outbox idempotency constraints", async () => {
    await expect(
      prisma.contentRevision.create({
        data: {
          resourceType: "Page",
          resourceId: marker,
          scopeKey: "root",
          version: 1,
          snapshotJson: {title: "duplicate"},
        },
      }),
    ).rejects.toMatchObject({code: "P2002"});

    await expect(
      prisma.notificationOutbox.create({
        data: {
          type: "CONTENT_REVIEW_DUE",
          recipient: "synthetic@example.invalid",
          template: "content-review-due",
          idempotencyKey: `${marker}:outbox`,
          payload: {resourceId: marker},
        },
      }),
    ).rejects.toMatchObject({code: "P2002"});
  });
});
