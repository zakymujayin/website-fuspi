import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  isRtlLocale,
  isLtrLocale,
  getLocaleDirection,
  getHtmlAttributes,
  localePermutations,
  assertValidLocale,
  generateLocalePairs,
  withAllLocales,
} from "@/test/locale-helpers";

describe("locale contract", () => {
  it("has exactly three supported locales", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(3);
  });

  it("includes id, en, and ar", () => {
    expect(SUPPORTED_LOCALES).toEqual(["id", "en", "ar"]);
  });

  it("defaults to Indonesian (id)", () => {
    expect(DEFAULT_LOCALE).toBe("id");
  });
});

describe("locale direction detection", () => {
  it("returns rtl for Arabic", () => {
    expect(isRtlLocale("ar")).toBe(true);
    expect(isLtrLocale("ar")).toBe(false);
    expect(getLocaleDirection("ar")).toBe("rtl");
  });

  it("returns ltr for Indonesian", () => {
    expect(isRtlLocale("id")).toBe(false);
    expect(isLtrLocale("id")).toBe(true);
    expect(getLocaleDirection("id")).toBe("ltr");
  });

  it("returns ltr for English", () => {
    expect(isRtlLocale("en")).toBe(false);
    expect(isLtrLocale("en")).toBe(true);
    expect(getLocaleDirection("en")).toBe("ltr");
  });

  it("returns ltr for unknown locales (fallback)", () => {
    expect(isRtlLocale("fr")).toBe(false);
    expect(getLocaleDirection("fr")).toBe("ltr");
  });
});

describe("HTML attributes per locale", () => {
  it("produces correct lang for each locale", () => {
    expect(getHtmlAttributes("id").lang).toBe("id");
    expect(getHtmlAttributes("en").lang).toBe("en");
    expect(getHtmlAttributes("ar").lang).toBe("ar");
  });

  it("produces correct dir for each locale", () => {
    expect(getHtmlAttributes("id").dir).toBe("ltr");
    expect(getHtmlAttributes("en").dir).toBe("ltr");
    expect(getHtmlAttributes("ar").dir).toBe("rtl");
  });
});

describe("localePermutations", () => {
  it("returns all three locales", () => {
    expect(localePermutations()).toEqual(["id", "en", "ar"]);
  });
});

describe("assertValidLocale", () => {
  it("does not throw for valid locales", () => {
    expect(() => assertValidLocale("id")).not.toThrow();
    expect(() => assertValidLocale("en")).not.toThrow();
    expect(() => assertValidLocale("ar")).not.toThrow();
  });

  it("throws for invalid locale", () => {
    expect(() => assertValidLocale("fr")).toThrow("Invalid locale");
  });
});

describe("generateLocalePairs", () => {
  it("generates 9 pairs (3x3)", () => {
    const pairs = generateLocalePairs();
    expect(pairs).toHaveLength(9);
  });

  it("includes id→ar and ar→id pairs", () => {
    const pairs = generateLocalePairs();
    expect(pairs).toContainEqual(["id", "ar"]);
    expect(pairs).toContainEqual(["ar", "id"]);
  });
});

describe("withAllLocales", () => {
  it("invokes callback for all three locales", () => {
    const results = withAllLocales((l) => l.toUpperCase());
    expect(results.get("id")).toBe("ID");
    expect(results.get("en")).toBe("EN");
    expect(results.get("ar")).toBe("AR");
    expect(results.size).toBe(3);
  });
});
