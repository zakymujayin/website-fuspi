import { describe, expect, it } from "vitest";

const {
  normalizePublicContentAdminQuery,
  buildPublicContentAdminHref,
  totalPagesFor,
  buildPaginationItems,
  PUBLIC_CONTENT_SLUG_MAP,
  PUBLIC_CONTENT_LABEL_KEYS,
  PUBLIC_CONTENT_SEARCH_MAX_LENGTH,
} = await import("@/components/admin/public-content/public-content-query");

import type { PublicContentResource } from "@/contracts/public-content";

const RESOURCE: PublicContentResource = "SERVICE";

describe("normalizePublicContentAdminQuery", () => {
  it("returns correct normalized query for valid input", () => {
    expect(
      normalizePublicContentAdminQuery(
        { page: "3", visibility: "HIDDEN", translationStatus: "en", category: "umum", year: "2025", search: "profil", direction: "desc" },
        RESOURCE,
      ),
    ).toEqual({
      resource: RESOURCE,
      page: 3,
      visibility: "HIDDEN",
      translationStatus: "en",
      category: "umum",
      year: 2025,
      search: "profil",
      direction: "desc",
      pageSize: 10,
    });
  });

  it("collapses to canonical when unknown keys are present", () => {
    expect(
      normalizePublicContentAdminQuery({ unknownKey: "value" } as Record<string, unknown> as Parameters<typeof normalizePublicContentAdminQuery>[0], RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("collapses to canonical when array values are present", () => {
    expect(
      normalizePublicContentAdminQuery({ page: ["2", "3"] } as Record<string, unknown> as Parameters<typeof normalizePublicContentAdminQuery>[0], RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when page is invalid (non-numeric)", () => {
    expect(
      normalizePublicContentAdminQuery({ page: "abc" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when page is zero", () => {
    expect(
      normalizePublicContentAdminQuery({ page: "0" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when page is negative", () => {
    expect(
      normalizePublicContentAdminQuery({ page: "-4" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when page exceeds max (10000)", () => {
    expect(
      normalizePublicContentAdminQuery({ page: "10001" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when visibility is invalid", () => {
    expect(
      normalizePublicContentAdminQuery({ visibility: "SCHEDULED" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when direction is invalid", () => {
    expect(
      normalizePublicContentAdminQuery({ direction: "up" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when search exceeds max length", () => {
    const longSearch = "x".repeat(PUBLIC_CONTENT_SEARCH_MAX_LENGTH + 1);
    expect(
      normalizePublicContentAdminQuery({ search: longSearch }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when search contains control characters", () => {
    expect(
      normalizePublicContentAdminQuery({ search: "profil\u0000" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when year is invalid (before 1900)", () => {
    expect(
      normalizePublicContentAdminQuery({ year: "1800" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when year is invalid (after 2100)", () => {
    expect(
      normalizePublicContentAdminQuery({ year: "2200" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("returns canonical when year is non-integer", () => {
    expect(
      normalizePublicContentAdminQuery({ year: "2025.5" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("accepts a valid year", () => {
    expect(
      normalizePublicContentAdminQuery({ year: "2025" }, RESOURCE),
    ).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: 2025,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("uses default values when fields are omitted", () => {
    expect(normalizePublicContentAdminQuery({}, RESOURCE)).toEqual({
      resource: RESOURCE,
      page: 1,
      visibility: "ALL",
      translationStatus: null,
      category: null,
      year: null,
      search: "",
      direction: "asc",
      pageSize: 10,
    });
  });

  it("preserves all non-default values", () => {
    expect(
      normalizePublicContentAdminQuery(
        { page: "5", visibility: "EXPIRED", translationStatus: "id", category: "akademik", year: "2024", search: "beasiswa", direction: "desc" },
        RESOURCE,
      ),
    ).toEqual({
      resource: RESOURCE,
      page: 5,
      visibility: "EXPIRED",
      translationStatus: "id",
      category: "akademik",
      year: 2024,
      search: "beasiswa",
      direction: "desc",
      pageSize: 10,
    });
  });

  it("trims whitespace-only search to empty", () => {
    const result = normalizePublicContentAdminQuery({ search: "   " }, RESOURCE);
    expect(result.search).toBe("");
  });

  it("strips whitespace from category", () => {
    const result = normalizePublicContentAdminQuery({ category: "  umum  " }, RESOURCE);
    expect(result.category).toBe("umum");
  });

  it("defaults page size to 10 and accepts the enum values", () => {
    expect(normalizePublicContentAdminQuery({}, RESOURCE).pageSize).toBe(10);
    expect(normalizePublicContentAdminQuery({ pageSize: "50" }, RESOURCE).pageSize).toBe(50);
  });

  it("collapses when pageSize is not an allowed literal", () => {
    expect(normalizePublicContentAdminQuery({ visibility: "PUBLIC", pageSize: "25" }, RESOURCE))
      .toMatchObject({ visibility: "ALL", pageSize: 10 });
  });
});

describe("buildPublicContentAdminHref", () => {
  it("serializes a non-default page size in the href", () => {
    expect(buildPublicContentAdminHref("kerjasama", { pageSize: 20 }))
      .toBe("/admin/kerjasama?pageSize=20");
  });

  it("omits page size 10 from the href", () => {
    expect(buildPublicContentAdminHref("kerjasama", { pageSize: 10 }))
      .toBe("/admin/kerjasama");
  });

  it("omits the canonical direction (asc) from the href", () => {
    expect(buildPublicContentAdminHref("kerjasama", { direction: "asc" }))
      .toBe("/admin/kerjasama");
    expect(buildPublicContentAdminHref("kerjasama")).toBe("/admin/kerjasama");
  });

  it("preserves a non-canonical direction (desc) in the href", () => {
    expect(buildPublicContentAdminHref("kerjasama", { direction: "desc" }))
      .toBe("/admin/kerjasama?direction=desc");
  });
});

describe("totalPagesFor", () => {
  it("returns 1 when total is zero", () => {
    expect(totalPagesFor(0, 20)).toBe(1);
  });

  it("returns 1 when total <= pageSize", () => {
    expect(totalPagesFor(15, 20)).toBe(1);
  });

  it("returns exact division", () => {
    expect(totalPagesFor(40, 20)).toBe(2);
  });

  it("returns ceil for remainder", () => {
    expect(totalPagesFor(41, 20)).toBe(3);
  });
});

describe("buildPaginationItems", () => {
  it("returns [1] for a single page", () => {
    expect(buildPaginationItems(1, 1)).toEqual([1]);
  });

  it("returns sequential for range without gaps", () => {
    expect(buildPaginationItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("includes ellipsis for gaps in mid-range", () => {
    expect(buildPaginationItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("first page shows 1,2,3,...,last", () => {
    expect(buildPaginationItems(1, 10)).toEqual([1, 2, "ellipsis", 10]);
  });

  it("last page shows 1,...,prev,last", () => {
    expect(buildPaginationItems(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });

  it("neighbor pages show correctly when current is near start", () => {
    expect(buildPaginationItems(3, 10)).toEqual([1, 2, 3, 4, "ellipsis", 10]);
  });

  it("neighbor pages show correctly when current is near end", () => {
    expect(buildPaginationItems(8, 10)).toEqual([1, "ellipsis", 7, 8, 9, 10]);
  });
});

describe("PUBLIC_CONTENT_SLUG_MAP", () => {
  it("has a mapping for all PUBLIC_CONTENT_RESOURCES", () => {
    const expected: PublicContentResource[] = [
      "SERVICE", "PARTNERSHIP", "SCHOLARSHIP", "ACHIEVEMENT", "STUDENT_ACTIVITY",
      "DOCUMENT", "ALBUM", "EVENT", "FAQ", "TESTIMONIAL",
    ];
    for (const r of expected) {
      expect(typeof PUBLIC_CONTENT_SLUG_MAP[r]).toBe("string");
    }
  });

  it("maps SERVICE to layanan", () => {
    expect(PUBLIC_CONTENT_SLUG_MAP["SERVICE"]).toBe("layanan");
  });

  it("maps FAQ to faq", () => {
    expect(PUBLIC_CONTENT_SLUG_MAP["FAQ"]).toBe("faq");
  });

  it("maps TESTIMONIAL to testimoni", () => {
    expect(PUBLIC_CONTENT_SLUG_MAP["TESTIMONIAL"]).toBe("testimoni");
  });
});

describe("PUBLIC_CONTENT_LABEL_KEYS", () => {
  it("has label keys for all resources", () => {
    const expected: PublicContentResource[] = [
      "SERVICE", "PARTNERSHIP", "SCHOLARSHIP", "ACHIEVEMENT", "STUDENT_ACTIVITY",
      "DOCUMENT", "ALBUM", "EVENT", "FAQ", "TESTIMONIAL",
    ];
    for (const r of expected) {
      expect(typeof PUBLIC_CONTENT_LABEL_KEYS[r]).toBe("string");
    }
  });

  it("maps ACHIEVEMENT to achievement", () => {
    expect(PUBLIC_CONTENT_LABEL_KEYS["ACHIEVEMENT"]).toBe("achievement");
  });

  it("maps STUDENT_ACTIVITY to studentActivity", () => {
    expect(PUBLIC_CONTENT_LABEL_KEYS["STUDENT_ACTIVITY"]).toBe("studentActivity");
  });
});
