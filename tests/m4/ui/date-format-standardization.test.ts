import {describe, expect, it} from "vitest";

import {formatDateDdMmYyyy, formatDateTimeDdMmYyyy} from "@/lib/format/date";

describe("institutional date format", () => {
  it("uses day/month/year ordering across locales", () => {
    const instant = "2026-07-15T03:00:00.000Z";
    expect(formatDateDdMmYyyy(instant)).toBe("15/07/2026");
    expect(formatDateTimeDdMmYyyy(instant)).toBe("15/07/2026 10:00");
  });

  it("uses Jakarta business time when the UTC date crosses midnight", () => {
    expect(formatDateDdMmYyyy("2026-01-15T17:30:00.000Z")).toBe("16/01/2026");
  });
});
