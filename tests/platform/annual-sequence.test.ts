import {describe, expect, it} from "vitest";

import {
  formatAnnualReference,
  getJakartaYear,
  isRetryableAnnualSequenceError,
} from "@/lib/sequence/annual";

describe("annual sequence contract", () => {
  it("derives the counter year at the Asia/Jakarta boundary", () => {
    expect(getJakartaYear(new Date("2026-12-31T16:59:59.999Z"))).toBe(2026);
    expect(getJakartaYear(new Date("2026-12-31T17:00:00.000Z"))).toBe(2027);
  });

  it("formats independent ticket and booking references with a minimum width of four", () => {
    expect(formatAnnualReference("TICKET", 2026, 1)).toBe("FUSPI-2026-0001");
    expect(formatAnnualReference("BOOKING", 2026, 17)).toBe("PJM-2026-0017");
    expect(formatAnnualReference("TICKET", 2026, 10_001)).toBe("FUSPI-2026-10001");
  });

  it("rejects invalid instants, counters, and sequence kinds", () => {
    expect(() => getJakartaYear(new Date(Number.NaN))).toThrow();
    expect(() => formatAnnualReference("TICKET", 2026, 0)).toThrow();
    expect(() => formatAnnualReference("OTHER" as "TICKET", 2026, 1)).toThrow();
  });

  it("retries only bounded transaction and PostgreSQL concurrency failures", () => {
    expect(isRetryableAnnualSequenceError({code: "P2034"})).toBe(true);
    expect(isRetryableAnnualSequenceError({cause: {code: "40001"}})).toBe(true);
    expect(isRetryableAnnualSequenceError({code: "P2010", meta: {code: "40001"}}))
      .toBe(true);
    expect(isRetryableAnnualSequenceError({meta: {cause: {code: "40P01"}}})).toBe(true);
    expect(isRetryableAnnualSequenceError({code: "P2002"})).toBe(false);
    expect(isRetryableAnnualSequenceError(new Error("serialization secret"))).toBe(false);
  });
});
