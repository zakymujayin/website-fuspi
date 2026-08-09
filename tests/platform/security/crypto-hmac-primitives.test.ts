import {createHmac} from "node:crypto";
import {describe, expect, it} from "vitest";
import {z} from "zod";

import {
  AesGcmEnvelopeSchema,
  HmacSha256DigestSchema,
  TrackingTokenSchema,
  type AesGcmEnvelope,
  type ProtectedDataContext,
} from "@/contracts/security";
import {
  decryptProtectedData,
  decryptProtectedJson,
  encryptProtectedData,
  encryptProtectedJson,
  ProtectedDataError,
} from "@/lib/security/encryption";
import {
  createDomainSeparatedHmacDigest,
  createHmacDigest,
  verifyHmacDigest,
} from "@/lib/security/hmac";
import {
  createTrackingTokenDigest,
  generateTrackingToken,
  verifyTrackingTokenDigest,
} from "@/lib/security/tracking-token";

const keyV1 = Buffer.alloc(32, 0x11);
const keyV2 = Buffer.alloc(32, 0x22);
const hmacSecret = "tracking-secret-with-at-least-32-bytes";
const context: ProtectedDataContext = {
  purpose: "PPKS_TICKET",
  resourceId: "ticket-synthetic-1",
  field: "protected-payload",
};

function resolver(version: number): Uint8Array | undefined {
  return new Map<number, Uint8Array>([[1, keyV1], [2, keyV2]]).get(version);
}

function flipBase64UrlByte(value: string): string {
  const bytes = Buffer.from(value, "base64url");
  bytes[0] ^= 0x01;
  return bytes.toString("base64url");
}

function expectGenericProtectedDataFailure(callback: () => unknown): void {
  try {
    callback();
    throw new Error("Expected protected data operation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(ProtectedDataError);
    expect(error).toMatchObject({
      name: "ProtectedDataError",
      message: "Unable to process protected data.",
    });
    expect(String(error)).not.toMatch(/ticket-synthetic|protected-payload|auth|tag|nonce|key|cipher/i);
  }
}

describe("AES-256-GCM protected data primitives", () => {
  it("round-trips bytes with a strict versioned envelope", () => {
    const envelope = encryptProtectedData("synthetic confidential report", context, {
      key: keyV1,
      keyVersion: 1,
    });

    expect(AesGcmEnvelopeSchema.parse(envelope)).toEqual(envelope);
    expect(Buffer.from(envelope.nonce, "base64url")).toHaveLength(12);
    expect(Buffer.from(envelope.tag, "base64url")).toHaveLength(16);
    expect(decryptProtectedData(envelope, context, {resolveKey: resolver}).toString("utf8"))
      .toBe("synthetic confidential report");
  });

  it("uses a fresh 96-bit nonce for identical plaintext and context", () => {
    const first = encryptProtectedData("same protected value", context, {key: keyV1, keyVersion: 1});
    const second = encryptProtectedData("same protected value", context, {key: keyV1, keyVersion: 1});

    expect(first.nonce).not.toBe(second.nonce);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it.each([
    ["purpose", {...context, purpose: "PPKS_REPLY" as const}],
    ["resource", {...context, resourceId: "ticket-synthetic-2"}],
    ["field", {...context, field: "another-field"}],
  ])("binds additional authenticated data to %s", (_label, changedContext) => {
    const envelope = encryptProtectedData("bound secret", context, {key: keyV1, keyVersion: 1});
    expectGenericProtectedDataFailure(() => decryptProtectedData(envelope, changedContext, {
      resolveKey: resolver,
    }));
  });

  it("selects a copied key by the envelope key version", () => {
    const envelope = encryptProtectedData("rotated secret", context, {key: keyV2, keyVersion: 2});
    expect(decryptProtectedData(envelope, context, {resolveKey: resolver}).toString("utf8"))
      .toBe("rotated secret");
    expectGenericProtectedDataFailure(() => decryptProtectedData(envelope, context, {
      resolveKey: (version) => version === 2 ? keyV1 : undefined,
    }));
    expectGenericProtectedDataFailure(() => decryptProtectedData(
      {...envelope, keyVersion: 99},
      context,
      {resolveKey: resolver},
    ));
  });

  it.each(["ciphertext", "nonce", "tag"] as const)(
    "rejects a modified %s with the same generic failure",
    (field) => {
      const envelope = encryptProtectedData("tamper target", context, {key: keyV1, keyVersion: 1});
      const tampered = {...envelope, [field]: flipBase64UrlByte(envelope[field])};
      expectGenericProtectedDataFailure(() => decryptProtectedData(tampered, context, {
        resolveKey: resolver,
      }));
    },
  );

  it.each([
    {ciphertext: "not+padded=", nonce: "AAAAAAAAAAAAAAAA", tag: "AAAAAAAAAAAAAAAAAAAAAA", keyVersion: 1},
    {ciphertext: "QQ", nonce: "short", tag: "AAAAAAAAAAAAAAAAAAAAAA", keyVersion: 1},
    {ciphertext: "QQ", nonce: "AAAAAAAAAAAAAAAA", tag: "short", keyVersion: 1},
    {ciphertext: "QQ", nonce: "AAAAAAAAAAAAAAAA", tag: "AAAAAAAAAAAAAAAAAAAAAA", keyVersion: 0},
    {ciphertext: "QQ", nonce: "AAAAAAAAAAAAAAAA", tag: "AAAAAAAAAAAAAAAAAAAAAA", keyVersion: 1, extra: true},
  ])("rejects malformed envelopes without leaking parser or crypto details", (malformed) => {
    expectGenericProtectedDataFailure(() => decryptProtectedData(
      malformed as AesGcmEnvelope,
      context,
      {resolveKey: resolver},
    ));
  });

  it("validates and bounds protected JSON without exposing its contents", () => {
    const payloadSchema = z.object({subject: z.string(), anonymous: z.boolean()}).strict();
    const payload = {subject: "synthetic subject", anonymous: true};
    const envelope = encryptProtectedJson(payload, context, {key: keyV1, keyVersion: 1});

    expect(decryptProtectedJson(envelope, context, payloadSchema, {resolveKey: resolver}))
      .toEqual(payload);
    expectGenericProtectedDataFailure(() => decryptProtectedJson(
      envelope,
      context,
      z.object({subject: z.number()}),
      {resolveKey: resolver},
    ));
    expectGenericProtectedDataFailure(() => encryptProtectedJson(
      {subject: "sensitive".repeat(20)},
      context,
      {key: keyV1, keyVersion: 1, maxPlaintextBytes: 32},
    ));
    expectGenericProtectedDataFailure(() => decryptProtectedJson(
      envelope,
      context,
      payloadSchema,
      {resolveKey: resolver, maxPlaintextBytes: 8},
    ));
  });

  it.each([
    {key: Buffer.alloc(31), keyVersion: 1},
    {key: Buffer.alloc(33), keyVersion: 1},
    {key: keyV1, keyVersion: 0},
    {key: keyV1, keyVersion: Number.NaN},
  ])("rejects invalid key configuration generically", (options) => {
    expectGenericProtectedDataFailure(() => encryptProtectedData("secret", context, options));
  });
});

describe("tracking token and HMAC primitives", () => {
  it("creates opaque tokens from exactly 32 random bytes", () => {
    const tokens = new Set(Array.from({length: 64}, generateTrackingToken));
    expect(tokens.size).toBe(64);
    for (const token of tokens) {
      expect(TrackingTokenSchema.parse(token)).toBe(token);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
    }
  });

  it("stores deterministic HMAC digests rather than recoverable tokens", () => {
    const token = generateTrackingToken();
    const digest = createTrackingTokenDigest(token, hmacSecret, "TICKET");

    expect(HmacSha256DigestSchema.parse(digest)).toBe(digest);
    expect(digest).not.toContain(token);
    expect(createTrackingTokenDigest(token, hmacSecret, "TICKET")).toBe(digest);
    expect(verifyTrackingTokenDigest(token, digest, hmacSecret, "TICKET")).toBe(true);
    expect(verifyTrackingTokenDigest(generateTrackingToken(), digest, hmacSecret, "TICKET"))
      .toBe(false);
  });

  it("domain-separates otherwise identical public tokens", () => {
    const token = generateTrackingToken();
    const ticketDigest = createTrackingTokenDigest(token, hmacSecret, "TICKET");
    const bookingDigest = createTrackingTokenDigest(token, hmacSecret, "BOOKING");

    expect(ticketDigest).not.toBe(bookingDigest);
    expect(verifyTrackingTokenDigest(token, ticketDigest, hmacSecret, "BOOKING")).toBe(false);
  });

  it.each([
    ["short", "0".repeat(64)],
    ["A".repeat(42), "0".repeat(64)],
    ["A".repeat(44), "0".repeat(64)],
    ["A".repeat(43), "not-a-digest"],
    ["A".repeat(43), "A".repeat(64)],
  ])("refuses malformed token/digest pairs", (token, digest) => {
    expect(verifyTrackingTokenDigest(token, digest, hmacSecret, "TICKET")).toBe(false);
  });

  it("preserves the existing undomained digest format while enforcing byte length", () => {
    const value = "normalized@example.invalid";
    expect(createHmacDigest(value, hmacSecret)).toBe(
      createHmac("sha256", hmacSecret).update(value, "utf8").digest("hex"),
    );
    expect(() => createHmacDigest(value, "short")).toThrow(
      "HMAC secret does not meet the minimum length.",
    );
    expect(() => createHmacDigest(value, "é".repeat(15))).toThrow(
      "HMAC secret does not meet the minimum length.",
    );
  });

  it("validates domains and compares only canonical SHA-256 digests", () => {
    const first = createDomainSeparatedHmacDigest("value", hmacSecret, "TICKET");
    const second = createDomainSeparatedHmacDigest("value", hmacSecret, "BOOKING");
    expect(first).not.toBe(second);
    expect(verifyHmacDigest(first, first)).toBe(true);
    expect(verifyHmacDigest(first, second)).toBe(false);
    expect(verifyHmacDigest(first, first.toUpperCase())).toBe(false);
    expect(verifyHmacDigest("invalid", first)).toBe(false);
    expect(() => createDomainSeparatedHmacDigest("value", hmacSecret, "bad domain"))
      .toThrow("HMAC domain is invalid.");
  });
});
