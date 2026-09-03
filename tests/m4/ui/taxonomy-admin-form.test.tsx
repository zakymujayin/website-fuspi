import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("taxonomy admin UI wiring", () => {
  it("uses the existing taxonomy server action and routes back to taxonomy list", () => {
    const form = readFileSync(
      path.join(process.cwd(), "src/components/admin/taxonomy/taxonomy-editor-form.tsx"),
      "utf8",
    );

    expect(form).toContain("executeTaxonomyAdminCommand");
    expect(form).toContain('action: "CREATE"');
    expect(form).toContain('action: "UPDATE"');
    expect(form).toContain('action: "DELETE"');
    expect(form).toContain('router.push(listHref)');
  });

  it("exposes taxonomy and the lecturer directory in the admin sidebar", () => {
    const sidebar = readFileSync(
      path.join(process.cwd(), "src/components/admin/admin-sidebar-data.ts"),
      "utf8",
    );

    expect(sidebar).toContain('/admin/taksonomi');
    expect(sidebar).toContain('labelKey: "taxonomies"');
    expect(sidebar).toContain('/admin/dosen');
    expect(sidebar).toContain('labelKey: "lecturers"');
    expect(sidebar).not.toContain('/admin/menu');
  });

  it("defines the same AdminTaxonomy keys in id, en, and ar", () => {
    const flatten = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([key, child]) =>
            flatten(child, prefix ? `${prefix}.${key}` : key))
        : [prefix];

    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      return flatten(JSON.parse(raw).AdminTaxonomy).sort();
    });
    expect(id.length).toBeGreaterThan(30);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);
  });
});
