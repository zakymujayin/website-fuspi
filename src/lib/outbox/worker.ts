import {Prisma} from "@/generated/prisma/client";

import {
  OutboxWorkerConfigSchema,
  type OutboxWorkerConfig,
} from "@/contracts/platform";
import {createPrismaClient} from "@/lib/db/client";

const GENERIC_DELIVERY_FAILURE = "DELIVERY_FAILED";

export type OutboxDatabase = ReturnType<typeof createPrismaClient>;

export type ClaimedOutboxMessage = {
  id: string;
  type: string;
  recipient: string;
  locale: "id" | "en" | "ar";
  template: string;
  payload: Prisma.JsonValue | null;
  payloadEncrypted: boolean;
  payloadCiphertext: string | null;
  encryptionNonce: string | null;
  encryptionTag: string | null;
  keyVersion: number | null;
  idempotencyKey: string;
  attempts: number;
};

export type OutboxClaimOptions = {
  workerId: string;
  batchSize: number;
  maxAttempts: 5;
  now: Date;
  staleBefore: Date;
};

export interface OutboxRepository {
  claimBatch(options: OutboxClaimOptions): Promise<ClaimedOutboxMessage[]>;
  markSent(messageId: string, workerId: string, sentAt: Date): Promise<boolean>;
  markFailed(
    messageId: string,
    workerId: string,
    nextAttemptAt: Date,
    failureCode: typeof GENERIC_DELIVERY_FAILURE,
  ): Promise<boolean>;
}

export interface OutboxSender {
  send(message: Readonly<ClaimedOutboxMessage>): Promise<void>;
}

export type ProcessOutboxResult = {
  claimed: number;
  sent: number;
  failed: number;
  ownershipLost: number;
};

export function calculateOutboxBackoffMs(
  attempt: number,
  baseBackoffMs: number,
  maxBackoffMs: number,
) {
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > 5) {
    throw new Error("Outbox attempt must be between one and five.");
  }
  if (!Number.isSafeInteger(baseBackoffMs) || baseBackoffMs < 1_000) {
    throw new Error("Outbox base backoff is invalid.");
  }
  if (!Number.isSafeInteger(maxBackoffMs) || maxBackoffMs < baseBackoffMs) {
    throw new Error("Outbox maximum backoff is invalid.");
  }
  return Math.min(maxBackoffMs, baseBackoffMs * 2 ** (attempt - 1));
}

export function createPrismaOutboxRepository(database: OutboxDatabase): OutboxRepository {
  return {
    async claimBatch(options) {
      return database.$transaction((tx) =>
        tx.$queryRaw<ClaimedOutboxMessage[]>(Prisma.sql`
          WITH candidates AS (
            SELECT "id"
            FROM "NotificationOutbox"
            WHERE "attempts" < ${options.maxAttempts}
              AND (
                (
                  "status" IN ('PENDING'::"OutboxStatus", 'FAILED'::"OutboxStatus")
                  AND "nextAttemptAt" <= ${options.now}
                )
                OR (
                  "status" = 'PROCESSING'::"OutboxStatus"
                  AND ("lockedAt" IS NULL OR "lockedAt" <= ${options.staleBefore})
                )
              )
            ORDER BY "nextAttemptAt" ASC, "createdAt" ASC, "id" ASC
            FOR UPDATE SKIP LOCKED
            LIMIT ${options.batchSize}
          )
          UPDATE "NotificationOutbox" AS outbox
          SET "status" = 'PROCESSING'::"OutboxStatus",
              "attempts" = outbox."attempts" + 1,
              "lockedAt" = ${options.now},
              "lockedBy" = ${options.workerId},
              "lastError" = NULL,
              "updatedAt" = ${options.now}
          FROM candidates
          WHERE outbox."id" = candidates."id"
          RETURNING outbox."id", outbox."type", outbox."recipient", outbox."locale",
                    outbox."template", outbox."payload", outbox."payloadEncrypted",
                    outbox."payloadCiphertext", outbox."encryptionNonce",
                    outbox."encryptionTag", outbox."keyVersion",
                    outbox."idempotencyKey", outbox."attempts"
        `),
      );
    },

    async markSent(messageId, workerId, sentAt) {
      const result = await database.notificationOutbox.updateMany({
        where: {id: messageId, status: "PROCESSING", lockedBy: workerId},
        data: {
          status: "SENT",
          sentAt,
          lastError: null,
          lockedAt: null,
          lockedBy: null,
        },
      });
      return result.count === 1;
    },

    async markFailed(messageId, workerId, nextAttemptAt, failureCode) {
      const result = await database.notificationOutbox.updateMany({
        where: {id: messageId, status: "PROCESSING", lockedBy: workerId},
        data: {
          status: "FAILED",
          nextAttemptAt,
          lastError: failureCode,
          lockedAt: null,
          lockedBy: null,
        },
      });
      return result.count === 1;
    },
  };
}

export async function processOutboxBatch(input: {
  repository: OutboxRepository;
  sender: OutboxSender;
  config: OutboxWorkerConfig;
  now?: Date;
}): Promise<ProcessOutboxResult> {
  const config = OutboxWorkerConfigSchema.parse(input.config);
  const now = input.now ? new Date(input.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Outbox processing time is invalid.");

  const claimed = await input.repository.claimBatch({
    workerId: config.workerId,
    batchSize: config.batchSize,
    maxAttempts: config.maxAttempts,
    now,
    staleBefore: new Date(now.getTime() - config.lockTimeoutMs),
  });
  const result: ProcessOutboxResult = {
    claimed: claimed.length,
    sent: 0,
    failed: 0,
    ownershipLost: 0,
  };

  for (const message of claimed) {
    try {
      await input.sender.send(Object.freeze({...message}));
      if (await input.repository.markSent(message.id, config.workerId, now)) {
        result.sent += 1;
      } else {
        result.ownershipLost += 1;
      }
    } catch {
      const backoff = calculateOutboxBackoffMs(
        message.attempts,
        config.baseBackoffMs,
        config.maxBackoffMs,
      );
      const nextAttemptAt = new Date(now.getTime() + backoff);
      if (
        await input.repository.markFailed(
          message.id,
          config.workerId,
          nextAttemptAt,
          GENERIC_DELIVERY_FAILURE,
        )
      ) {
        result.failed += 1;
      } else {
        result.ownershipLost += 1;
      }
    }
  }

  return result;
}
