import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("public lecturer detail page redesign", () => {
  const page = source("src/app/[locale]/(public)/dosen/[id]/page.tsx");

  it("renders a hero band naming the study program and lecturer identity above the fold", () => {
    expect(page).toContain("lecturer-hero");
    expect(page).toContain("lecturer.studyProgram");
  });

  it("shows NIP and NIDN as separate identity rows instead of collapsing them into one line", () => {
    expect(page).toContain("lecturer.nip");
    expect(page).toContain("lecturer.nidn");
    expect(page).toMatch(/label="NIP"/);
    expect(page).toMatch(/label="NIDN"/);
  });

  it("renders expertise as individual chips via the shared splitter", () => {
    expect(page).toContain('from "@/components/public/lecturer-profile-utils"');
    expect(page).toContain("splitExpertiseTags");
  });

  it("keeps the academic-record in-page anchors intact for the existing nav", () => {
    expect(page).toContain("lecturer-education");
    expect(page).toContain("lecturer-publications");
  });

  it("keeps the existing accessible section landmarks used by the academic records component", () => {
    const records = source("src/components/public/lecturer-academic-records.tsx");
    expect(records).toContain('id="lecturer-research"');
    expect(records).toContain('id="lecturer-community"');
    expect(records).toContain('id="lecturer-hki"');
    expect(records).toContain('id="lecturer-teaching"');
  });
});
