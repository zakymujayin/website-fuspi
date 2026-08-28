import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const { buildFacilityHref } = await import("@/components/admin/facility/facility-list-query");

describe("buildFacilityHref", () => {
  it("serialises active/search/pageSize/page, canonical stays bare", () => {
    expect(buildFacilityHref({})).toBe("/admin/fasilitas");
    expect(buildFacilityHref({ active: "ACTIVE", search: "lab", pageSize: 50, page: 3 }))
      .toBe("/admin/fasilitas?active=ACTIVE&search=lab&pageSize=50&page=3");
  });
});

describe("facility list page", () => {
  it("uses the shared controls and drops the plain GET form", () => {
    const src = readFileSync(path.join(process.cwd(), "src/app/[locale]/admin/fasilitas/page.tsx"), "utf8");
    expect(src).toContain("AdminListSearch");
    expect(src).toContain("AdminPageSizeSelect");
    expect(src).not.toContain('name="search"'); // raw input gone
  });
  it("defaults the facility normalizer page size to 10", () => {
    const src = readFileSync(path.join(process.cwd(), "src/features/facility/domain.ts"), "utf8");
    expect(src).toMatch(/pageSize:\s*raw\.pageSize === undefined \? 10 : Number\(raw\.pageSize\)/);
  });
});
