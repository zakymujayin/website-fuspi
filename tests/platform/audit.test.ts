import {describe, expect, it} from "vitest";

import {sanitizeAuditMetadata} from "@/lib/audit/sanitize";

describe("audit metadata sanitizer", () => {
  it("redacts secrets and sensitive ticket metadata recursively", () => {
    expect(
      sanitizeAuditMetadata({
        route: "/admin/post",
        token: "raw-token",
        nested: {passwordHash: "hash", reporterIdentity: "person"},
      }),
    ).toEqual({
      route: "/admin/post",
      token: "[REDACTED]",
      nested: {passwordHash: "[REDACTED]", reporterIdentity: "[REDACTED]"},
    });
  });

  it("normalizes dates, bigint, non-finite values, and long strings", () => {
    const result = sanitizeAuditMetadata({
      at: new Date("2026-07-12T00:00:00.000Z"),
      count: 12n,
      invalid: Number.NaN,
      long: "x".repeat(600),
    }) as Record<string, unknown>;

    expect(result.at).toBe("2026-07-12T00:00:00.000Z");
    expect(result.count).toBe("12");
    expect(result.invalid).toBeNull();
    expect(result.long).toHaveLength(500);
  });

  it("rejects metadata that remains too large after sanitization", () => {
    const metadata = Object.fromEntries(
      Array.from({length: 40}, (_, index) => [`field${index}`, "x".repeat(500)]),
    );
    expect(() => sanitizeAuditMetadata(metadata)).toThrow("exceeds 16 KiB");
  });
});
