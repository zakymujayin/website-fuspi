import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("academic accreditation runtime", () => {
  it("reads active program accreditation from StudyProgram instead of dummy content", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/[locale]/(public)/akademik/akreditasi/page.tsx"), "utf8");
    expect(source).toContain("getPrismaClient().studyProgram.findMany");
    expect(source).toContain("isActive: true");
    expect(source).not.toContain("dummyAccreditations");
  });

  it("does not render a faculty accreditation block", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/[locale]/(public)/akademik/akreditasi/page.tsx"), "utf8");
    expect(source).not.toContain("accreditationFaculty");
    expect(source).not.toContain('scope === "faculty"');
  });

  it("keeps a single page-level heading instead of a duplicate welcome banner", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/[locale]/(public)/akademik/akreditasi/page.tsx"), "utf8");
    expect(source).not.toContain("bg-slate-950");
    expect(source).not.toContain("BadgeCheck");
  });
});
