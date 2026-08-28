import { describe, expect, it } from "vitest";

const {
  normalizeAdminPageQuery,
  toAdminPageTransportQuery,
  buildAdminPageHref,
  totalPagesFor,
  buildPaginationItems,
  ADMIN_PAGE_PAGE_SIZE,
  ADMIN_PAGE_SEARCH_MAX_LENGTH,
} = await import("@/components/admin/pages/page-query");

describe("normalizeAdminPageQuery — whole-record fail-closed normalization", () => {
  it("defaults to canonical query", () => {
    expect(normalizeAdminPageQuery({})).toEqual({
      page: 1,
      status: "ALL",
      search: "",
      sort: "UPDATED_DESC",
      pageSize: ADMIN_PAGE_PAGE_SIZE,
    });
  });

  it("accepts valid page, status, search, and sort", () => {
    expect(
      normalizeAdminPageQuery({ page: "3", status: "DRAFT", search: "profil", sort: "TITLE_ASC" }),
    ).toEqual({
      page: 3,
      status: "DRAFT",
      search: "profil",
      sort: "TITLE_ASC",
      pageSize: ADMIN_PAGE_PAGE_SIZE,
    });
  });

  it.each([
    ["unknown key", { page: "2", ownerId: "attacker" }],
    ["free-int page size", { status: "DRAFT", pageSize: "40" }],
    ["repeated page", { page: ["2", "3"] }],
    ["repeated status", { status: ["DRAFT", "PUBLISHED"] }],
    ["repeated search", { search: ["a", "b"] }],
    ["leading-zero page", { page: "01" }],
    ["zero page", { page: "0" }],
    ["negative page", { page: "-4" }],
    ["over-bound page", { page: "10001" }],
    ["non-numeric page", { page: "2; DROP TABLE" }],
    ["unknown status", { status: "SCHEDULED" }],
    ["lowercase status", { status: "draft" }],
    ["unknown sort", { sort: "CREATED_ASC" }],
    ["search with control chars", { search: "profil\u0000" }],
    ["search too long", { search: "x".repeat(ADMIN_PAGE_SEARCH_MAX_LENGTH + 1) }],
  ])("collapses the entire query to canonical for %s", (_label, raw) => {
    expect(normalizeAdminPageQuery(raw as Record<string, string | string[] | undefined>)).toEqual({
      page: 1,
      status: "ALL",
      search: "",
      sort: "UPDATED_DESC",
      pageSize: ADMIN_PAGE_PAGE_SIZE,
    });
  });

  it("trims a whitespace-only search to empty", () => {
    expect(normalizeAdminPageQuery({ search: "   " }).search).toBe("");
  });

  it("defaults page size to 10 and accepts 10/20/50 from the URL", () => {
    expect(normalizeAdminPageQuery({}).pageSize).toBe(10);
    expect(normalizeAdminPageQuery({ pageSize: "50" }).pageSize).toBe(50);
  });

  it("collapses the whole query when pageSize is a free integer", () => {
    expect(normalizeAdminPageQuery({ status: "DRAFT", pageSize: "40" })).toEqual({
      page: 1, status: "ALL", search: "", sort: "UPDATED_DESC", pageSize: 10,
    });
  });
});

describe("toAdminPageTransportQuery", () => {
  it("produces the full frozen query shape", () => {
    expect(
      toAdminPageTransportQuery({
        page: 2,
        status: "DRAFT",
        search: "profil",
        sort: "TITLE_ASC",
        pageSize: 20,
      }),
    ).toEqual({
      page: 2,
      pageSize: 20,
      status: "DRAFT",
      search: "profil",
      sort: "TITLE_ASC",
    });
  });
});

describe("buildAdminPageHref", () => {
  it("returns bare href for canonical defaults", () => {
    expect(buildAdminPageHref()).toBe("/admin/pages");
  });

  it("preserves status, search, sort, and page", () => {
    expect(
      buildAdminPageHref({ status: "PUBLISHED", search: "profil", sort: "TITLE_ASC", page: 3 }),
    ).toBe("/admin/pages?status=PUBLISHED&search=profil&sort=TITLE_ASC&page=3");
  });

  it("omits default values", () => {
    expect(buildAdminPageHref({ status: "ALL", search: "", sort: "UPDATED_DESC", page: 1 })).toBe(
      "/admin/pages",
    );
  });

  it("serializes a non-default page size", () => {
    expect(buildAdminPageHref({ pageSize: 20 })).toBe("/admin/pages?pageSize=20");
    expect(buildAdminPageHref({ pageSize: 10 })).toBe("/admin/pages");
  });
});

describe("totalPagesFor", () => {
  it("returns 1 when total is zero", () => {
    expect(totalPagesFor(0, 20)).toBe(1);
  });

  it("returns ceil of total / pageSize", () => {
    expect(totalPagesFor(41, 20)).toBe(3);
  });
});

describe("buildPaginationItems", () => {
  it("returns [1] for a single page", () => {
    expect(buildPaginationItems(1, 1)).toEqual([1]);
  });

  it("includes ellipsis for gaps", () => {
    expect(buildPaginationItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });
});
