import {describe, expect, it} from "vitest";

import {SharedRateLimitInputSchema} from "@/contracts/operations";
import {
  createSharedRateLimitKey,
  getSharedRateLimitWindow,
  SHARED_RATE_LIMIT_POLICIES,
} from "@/lib/rate-limit/persistent";

describe("shared persistent rate-limit contract", () => {
  it("freezes every documented non-login policy", () => {
    expect(SHARED_RATE_LIMIT_POLICIES).toEqual({
      CONTACT_SUBMIT: {scope: "CONTACT_SUBMIT", limit: 5, windowMs: 3_600_000},
      SURVEY_SUBMIT: {scope: "SURVEY_SUBMIT", limit: 5, windowMs: 3_600_000},
      PPKS_SUBMIT: {scope: "PPKS_SUBMIT", limit: 10, windowMs: 86_400_000},
      AUTOCOMPLETE: {scope: "AUTOCOMPLETE", limit: 60, windowMs: 60_000},
      TICKET_TRACK_IP: {scope: "TICKET_TRACK_IP", limit: 10, windowMs: 900_000},
      TICKET_TRACK_NUMBER: {scope: "TICKET_TRACK_NUMBER", limit: 5, windowMs: 900_000},
    });
  });

  it("calculates fixed UTC windows at exact boundaries", () => {
    expect(getSharedRateLimitWindow(
      "TICKET_TRACK_IP",
      new Date("2026-07-15T10:14:59.999Z"),
    )).toEqual({
      windowStart: new Date("2026-07-15T10:00:00.000Z"),
      windowResetAt: new Date("2026-07-15T10:15:00.000Z"),
    });
    expect(getSharedRateLimitWindow(
      "TICKET_TRACK_IP",
      new Date("2026-07-15T10:15:00.000Z"),
    )).toEqual({
      windowStart: new Date("2026-07-15T10:15:00.000Z"),
      windowResetAt: new Date("2026-07-15T10:30:00.000Z"),
    });
  });

  it("derives domain-separated HMAC keys without retaining the identifier", () => {
    const secret = "shared-rate-limit-test-secret-at-least-32-bytes";
    const raw = "192.0.2.44";
    const ipKey = createSharedRateLimitKey("TICKET_TRACK_IP", raw, secret);
    const formKey = createSharedRateLimitKey("CONTACT_SUBMIT", raw, secret);
    expect(ipKey).toMatch(/^[a-f0-9]{64}$/);
    expect(formKey).toMatch(/^[a-f0-9]{64}$/);
    expect(ipKey).not.toBe(formKey);
    expect(ipKey).not.toContain(raw);
  });

  it("rejects raw, malformed, empty, and oversized identifiers", () => {
    expect(SharedRateLimitInputSchema.safeParse({
      policy: "CONTACT_SUBMIT",
      keyHash: "192.0.2.44",
      now: new Date(),
    }).success).toBe(false);
    expect(() => createSharedRateLimitKey(
      "CONTACT_SUBMIT",
      "",
      "shared-rate-limit-test-secret-at-least-32-bytes",
    )).toThrow();
    expect(() => createSharedRateLimitKey(
      "CONTACT_SUBMIT",
      "x".repeat(1_025),
      "shared-rate-limit-test-secret-at-least-32-bytes",
    )).toThrow();
  });
});
