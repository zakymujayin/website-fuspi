import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("Program Studi CMS surface", () => {
  it("exposes a protected list and edit route", () => {
    const list = read("src/app/[locale]/admin/program-studi/page.tsx");
    const edit = read("src/app/[locale]/admin/program-studi/[id]/edit/page.tsx");
    const form = read("src/components/admin/academic/program-studi-editor-form.tsx");

    expect(list).toContain('roles: ["ADMIN"]');
    expect(edit).toContain('roles: ["ADMIN"]');
    for (const field of ["vision", "mission", "objectives", "learningOutcomes", "graduateProfile", "careerProspects"]) {
      expect(form).toContain(`"${field}"`);
    }
    expect(form).toContain('fetch("/api/admin/academic/people"');
    expect(form).toContain('resource: "STUDY_PROGRAM"');
  });

  it("keeps program identity fixed while allowing official content edits", () => {
    const form = read("src/components/admin/academic/program-studi-editor-form.tsx");
    expect(form).toContain('degree: "S1"');
    expect(form).toContain('readOnly aria-readonly="true"');
    expect(form).toContain("accreditationExpiry");
    expect(form).toContain("translations");
  });

  it("revalidates the actual public prodi route after saving", () => {
    const route = read("src/app/api/admin/academic/people/route.ts");
    expect(route).toContain("/admin/program-studi");
    expect(route).toContain("/prodi/[slug]");
    expect(route).not.toContain("/program-studi/[slug]");
  });

  it("centers programme facts and reduces the vision treatment", () => {
    const page = read("src/app/[locale]/(public)/prodi/[slug]/page.tsx");
    expect(page).toContain("border-white/15 pt-6 text-center");
    expect(page).toContain("font-display text-base font-semibold");
    expect(page).toContain("md:text-lg");
  });
});
