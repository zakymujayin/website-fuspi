import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("admin lecturer profile editor", () => {
  it("mounts the academic record editor below the main lecturer form", () => {
    const page = source("src/app/[locale]/admin/dosen/[id]/edit/page.tsx");
    expect(page).toContain("loadAdminLecturerRelations");
    expect(page).toContain("LecturerRelationsManager");
    expect(page).toContain("relations.data");
  });

  it("keeps relation mutations ADMIN-scoped and lecturer-scoped", () => {
    const domain = source("src/features/academic/lecturer-relations.ts");
    expect(domain).toContain("TrustedAdminFoundationActorSchema");
    expect(domain).toContain("command.lecturerId");
    expect(domain).toContain("lecturerId: command.lecturerId");
    expect(domain).toContain('isolationLevel: "Serializable"');
  });

  it("provides add, update, and delete forms for both collections", () => {
    const manager = source("src/components/admin/lecturer/lecturer-relations-manager.tsx");
    expect(manager).toContain("saveAdminEducationAction");
    expect(manager).toContain("saveAdminPublicationAction");
    expect(manager).toContain('value="delete"');
    expect(manager).toContain("academic-records");
  });

  it("adds a mobile-first directory view and academic record context", () => {
    const list = source("src/components/admin/lecturer/lecturer-list.tsx");
    expect(list).toContain("md:hidden");
    expect(list).toContain("educationCount");
    expect(list).toContain("publicationCount");
    expect(list).toContain("View public");
  });
});
