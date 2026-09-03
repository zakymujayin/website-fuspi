import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("admin lecturer academic records editor", () => {
  it("loads the ADMIN-only academic records on the lecturer edit page", () => {
    const page = source("src/app/[locale]/admin/dosen/[id]/edit/page.tsx");
    expect(page).toContain("loadAdminLecturerAcademicRecords");
    expect(page).toContain("LecturerAcademicRecordsManager");
    expect(page).toContain("academicRecords.data");
  });

  it("provides scoped HKI and teaching assignment actions", () => {
    const actions = source("src/components/admin/lecturer/lecturer-academic-records-actions.ts");
    const manager = source("src/components/admin/lecturer/lecturer-academic-records-manager.tsx");
    expect(actions).toContain("executeAdminLecturerAcademicCommand");
    expect(actions).toContain('action: "HKI_DELETE"');
    expect(actions).toContain('action: "TEACHING_DELETE"');
    expect(manager).toContain("saveAdminHkiAction");
    expect(manager).toContain("saveAdminTeachingAction");
    expect(manager).toContain("registrationNumber");
    expect(manager).toContain("academicYearStart");
    expect(manager).toContain('value="delete"');
  });
});
