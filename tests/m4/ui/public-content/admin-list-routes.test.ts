import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const RESOURCES = [
  "agenda", "album", "beasiswa", "dokumen", "faq",
  "kegiatan", "kerjasama", "layanan", "prestasi", "testimoni",
] as const;

const appDir = path.join(process.cwd(), "src/app/[locale]/admin");

describe("public-content admin list pages link to routes that exist", () => {
  it.each(RESOURCES)("%s: the create action targets a real route segment", (resource) => {
    const source = readFileSync(path.join(appDir, resource, "page.tsx"), "utf8");
    const match = source.match(new RegExp(`/admin/${resource}/([a-z-]+)\``));
    expect(match, `${resource}/page.tsx has no create link`).not.toBeNull();
    const segment = match![1];
    expect(
      existsSync(path.join(appDir, resource, segment, "page.tsx")),
      `/admin/${resource}/${segment} has no page.tsx`,
    ).toBe(true);
  });

  it.each(RESOURCES)("%s: the edit link targets the [id]/edit route", (resource) => {
    const source = readFileSync(path.join(appDir, resource, "page.tsx"), "utf8");
    expect(source).toContain(`/admin/${resource}/${"${item.id}"}/edit`);
    expect(existsSync(path.join(appDir, resource, "[id]", "edit", "page.tsx"))).toBe(true);
  });

  it.each(RESOURCES)("%s: uses the shared search + page-size controls", (resource) => {
    const source = readFileSync(path.join(appDir, resource, "page.tsx"), "utf8");
    expect(source).toContain("AdminListSearch");
    expect(source).toContain("AdminPageSizeSelect");
    expect(source).not.toContain('method="GET"');
  });

  it("defines searchClear + pageSizeLabel for AdminPublicContent in all locales", () => {
    for (const locale of ["id", "en", "ar"]) {
      const m = JSON.parse(
        readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8"),
      );
      expect(m.AdminPublicContent.searchClear).toBeTruthy();
      expect(m.AdminPublicContent.pageSizeLabel).toBeTruthy();
    }
  });
});
