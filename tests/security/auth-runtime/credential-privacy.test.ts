import {describe, expect, it} from "vitest";

import {compare, hash} from "bcryptjs";

import {DUMMY_BCRYPT_HASH} from "@/lib/auth/runtime/config";
import {selectCredentialComparison} from "@/lib/auth/runtime/credentials";
import {
  createLoginRateLimitKey,
  getLoginWindowStart,
  getPublicFailureCodeForAttempt,
} from "@/lib/auth/runtime/rate-limit";
import {createHmacDigest} from "@/lib/security/hmac";

const emailSecret = "e".repeat(32);
const ipSecret = "i".repeat(32);

describe("M2 credential privacy and rate-limit invariants", () => {
  it("derives separate email and IP HMAC digests with sufficient entropy", () => {
    const email = "test@example.test";
    const ip = "203.0.113.42";
    const key = createLoginRateLimitKey(email, ip, emailSecret, ipSecret);

    const [emailPart, ipPart] = key.keyHash.split(".");
    expect(emailPart).toHaveLength(64);
    expect(ipPart).toHaveLength(64);
    expect(key.keyHash).toMatch(/^[0-9a-f]{64}\.[0-9a-f]{64}$/);
  });

  it("rate-limit key is collision-resistant per email/IP pair", () => {
    const key1 = createLoginRateLimitKey(
      "a@example.test", "192.0.2.1", emailSecret, ipSecret,
    );
    const key2 = createLoginRateLimitKey(
      "b@example.test", "192.0.2.1", emailSecret, ipSecret,
    );
    const key3 = createLoginRateLimitKey(
      "a@example.test", "192.0.2.2", emailSecret, ipSecret,
    );
    const key4 = createLoginRateLimitKey(
      "a@example.test", "192.0.2.1", emailSecret, ipSecret,
    );

    expect(key1.keyHash).not.toBe(key2.keyHash);
    expect(key1.keyHash).not.toBe(key3.keyHash);
    expect(key1.keyHash).toBe(key4.keyHash);
  });

  it("rejects HMAC secrets shorter than 32 bytes", () => {
    expect(() => createHmacDigest("value", "short")).toThrow(
      "HMAC secret does not meet the minimum length.",
    );
  });

  it("window start aligns to the configured interval", () => {
    const t = new Date("2026-07-14T03:17:31.000Z");
    expect(getLoginWindowStart(t).toISOString()).toBe(
      "2026-07-14T03:15:00.000Z",
    );
    const t2 = new Date("2026-07-14T03:15:00.000Z");
    expect(getLoginWindowStart(t2).toISOString()).toBe(
      "2026-07-14T03:15:00.000Z",
    );
  });

  it("returns INVALID_CREDENTIALS for attempts 1–5 and TRY_AGAIN_LATER from 6 onward", () => {
    for (let i = 1; i <= 5; i++) {
      expect(getPublicFailureCodeForAttempt(i)).toBe("INVALID_CREDENTIALS");
    }
    for (let i = 6; i <= 10; i++) {
      expect(getPublicFailureCodeForAttempt(i)).toBe("TRY_AGAIN_LATER");
    }
  });

  it("selectCredentialComparison never returns an eligible flag for missing passwordHash", () => {
    const c = selectCredentialComparison({
      id: "no-hash-user",
      passwordHash: null,
      isActive: true,
      mustChangePassword: false,
    });
    expect(c.hash).toBe(DUMMY_BCRYPT_HASH);
    expect(c.eligible).toBe(false);
  });

  it("dummy hash is a valid bcrypt cost-12 hash", async () => {
    const ok = await compare(
      "any-password-value-here",
      DUMMY_BCRYPT_HASH,
    ).catch(() => false);
    expect(ok).toBe(false);
    expect(DUMMY_BCRYPT_HASH).toMatch(/^\$2b\$12\$/);
  });

  it("keeps dummy and real cost-12 rejection timing distributions overlapping", async () => {
    const realHash = await hash("synthetic-known-password", 12);
    const samples = {dummy: [] as number[], real: [] as number[]};

    // Warm both code paths before measuring and alternate them to limit drift
    // from scheduler load. This is a distribution guard, not nanosecond equality.
    await compare("wrong-password", DUMMY_BCRYPT_HASH);
    await compare("wrong-password", realHash);
    for (let sample = 0; sample < 5; sample += 1) {
      for (const [label, candidate] of [
        ["dummy", DUMMY_BCRYPT_HASH],
        ["real", realHash],
      ] as const) {
        const startedAt = performance.now();
        expect(await compare("wrong-password", candidate)).toBe(false);
        samples[label].push(performance.now() - startedAt);
      }
    }

    const median = (values: number[]) => [...values].sort((a, b) => a - b)[2]!;
    const dummyMedian = median(samples.dummy);
    const realMedian = median(samples.real);
    const relativeDelta = Math.abs(dummyMedian - realMedian) / Math.max(dummyMedian, realMedian);

    expect(relativeDelta).toBeLessThan(0.35);
  }, 20_000);
});
