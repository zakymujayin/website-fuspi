import {describe, expect, it} from "vitest";

import {
  calculateOutboxBackoffMs,
  processOutboxBatch,
  type ClaimedOutboxMessage,
  type OutboxRepository,
} from "@/lib/outbox/worker";

function message(id: string, attempts = 1): ClaimedOutboxMessage {
  return {
    id,
    type: "SYNTHETIC",
    recipient: `${id}@example.test`,
    locale: "id",
    template: "synthetic",
    payload: {id},
    payloadEncrypted: false,
    payloadCiphertext: null,
    encryptionNonce: null,
    encryptionTag: null,
    keyVersion: null,
    idempotencyKey: `synthetic:${id}`,
    attempts,
  };
}

function repositoryFor(messages: ClaimedOutboxMessage[]) {
  const sent: string[] = [];
  const failed: Array<{id: string; nextAttemptAt: Date; code: string}> = [];
  let claimOptions: Parameters<OutboxRepository["claimBatch"]>[0] | undefined;
  const repository: OutboxRepository = {
    async claimBatch(options) {
      claimOptions = options;
      return messages;
    },
    async markSent(id) {
      sent.push(id);
      return true;
    },
    async markFailed(id, _workerId, nextAttemptAt, code) {
      failed.push({id, nextAttemptAt, code});
      return true;
    },
  };
  return {repository, sent, failed, get claimOptions() { return claimOptions; }};
}

describe("outbox worker policy", () => {
  it("uses bounded exponential backoff through attempt five", () => {
    expect([1, 2, 3, 4, 5].map((attempt) => calculateOutboxBackoffMs(attempt, 1_000, 10_000)))
      .toEqual([1_000, 2_000, 4_000, 8_000, 10_000]);
    expect(() => calculateOutboxBackoffMs(0, 1_000, 10_000)).toThrow();
    expect(() => calculateOutboxBackoffMs(6, 1_000, 10_000)).toThrow();
  });

  it("derives a stale-lock boundary and applies strict defaults", async () => {
    const fake = repositoryFor([]);
    const now = new Date("2026-07-15T07:00:00.000Z");
    await processOutboxBatch({
      repository: fake.repository,
      sender: {async send() {}},
      config: {workerId: "worker_1"},
      now,
    });

    expect(fake.claimOptions).toEqual({
      workerId: "worker_1",
      batchSize: 25,
      maxAttempts: 5,
      now,
      staleBefore: new Date("2026-07-15T06:55:00.000Z"),
    });
  });

  it("continues the batch after failure and persists only a generic code", async () => {
    const fake = repositoryFor([message("first", 2), message("second", 1)]);
    const now = new Date("2026-07-15T07:00:00.000Z");
    const delivered: string[] = [];
    const result = await processOutboxBatch({
      repository: fake.repository,
      sender: {
        async send(item) {
          delivered.push(item.id);
          if (item.id === "first") {
            throw new Error(`provider leaked ${item.recipient} and token-secret`);
          }
        },
      },
      config: {
        workerId: "worker_1",
        baseBackoffMs: 10_000,
        maxBackoffMs: 60_000,
      },
      now,
    });

    expect(delivered).toEqual(["first", "second"]);
    expect(result).toEqual({claimed: 2, sent: 1, failed: 1, ownershipLost: 0});
    expect(fake.sent).toEqual(["second"]);
    expect(fake.failed).toEqual([
      {
        id: "first",
        nextAttemptAt: new Date("2026-07-15T07:00:20.000Z"),
        code: "DELIVERY_FAILED",
      },
    ]);
    expect(JSON.stringify(fake.failed)).not.toContain("provider");
    expect(JSON.stringify(fake.failed)).not.toContain("token-secret");
  });

  it("reports a lost claim without marking delivery as successful", async () => {
    const repository: OutboxRepository = {
      async claimBatch() { return [message("lost")]; },
      async markSent() { return false; },
      async markFailed() { return false; },
    };
    const result = await processOutboxBatch({
      repository,
      sender: {async send() {}},
      config: {workerId: "worker_2"},
    });
    expect(result).toEqual({claimed: 1, sent: 0, failed: 0, ownershipLost: 1});
  });

  it("rejects unsafe worker configuration before claiming", async () => {
    let claimed = false;
    const repository: OutboxRepository = {
      async claimBatch() { claimed = true; return []; },
      async markSent() { return true; },
      async markFailed() { return true; },
    };
    await expect(processOutboxBatch({
      repository,
      sender: {async send() {}},
      config: {workerId: "worker with spaces"},
    })).rejects.toThrow();
    expect(claimed).toBe(false);
  });
});
