import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const { buildTaxonomyHref, buildPaginationItems } = await import(
  "@/components/admin/taxonomy/taxonomy-list-query"
);

describe("buildTaxonomyHref", () => {
  it("keeps the canonical view bare and serialises the rest", () => {
    expect(buildTaxonomyHref({})).toBe("/admin/taksonomi");
    expect(buildTaxonomyHref({ kind: "TAG", search: "moderasi", page: 2, pageSize: 20 }))
      .toBe("/admin/taksonomi?kind=TAG&search=moderasi&pageSize=20&page=2");
    expect(buildTaxonomyHref({ pageSize: 10 })).toBe("/admin/taksonomi");
  });
});

describe("taxonomy list page", () => {
  it("renders search + pagination + page-size controls", () => {
    const src = readFileSync(path.join(process.cwd(), "src/app/[locale]/admin/taksonomi/page.tsx"), "utf8");
    expect(src).toContain("AdminListSearch");
    expect(src).toContain("AdminPageSizeSelect");
    expect(src).toMatch(/buildTaxonomyHref/);
  });
  it("defaults the normalizer page size to 10", () => {
    const src = readFileSync(path.join(process.cwd(), "src/contracts/admin-foundation.ts"), "utf8");
    expect(src).toMatch(/pageSize:\s*raw\.pageSize === undefined \? 10 : Number\(raw\.pageSize\)/);
  });
});

it("windows the taxonomy pagination like the other lists", () => {
  expect(buildPaginationItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
});
