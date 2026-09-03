import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

function source(file: string) {
  return readFileSync(path.join(process.cwd(), file), "utf8");
}

describe("lecturer admin UI fidelity", () => {
  it("uses one tabbed workspace for the three lecturer editor areas", () => {
    const page = source("src/app/[locale]/admin/dosen/[id]/edit/page.tsx");
    const workspace = source("src/components/admin/lecturer/lecturer-admin-workspace.tsx");
    expect(page).toContain("LecturerAdminWorkspace");
    expect(workspace).toContain('role="tablist"');
    expect(workspace).toContain('role="tabpanel"');
    expect(workspace).toContain('id: "profile"');
    expect(workspace).toContain('id: "records"');
    expect(workspace).toContain('id: "academic"');
  });

  it("keeps the desktop directory compact and avoids a cramped records column", () => {
    const list = source("src/components/admin/lecturer/lecturer-list.tsx");
    expect(list).toContain("max-w-[1180px]");
    expect(list).toContain("table-fixed");
    expect(list).toContain("md:hidden");
    expect(list).not.toContain("{t.records}</th>");
  });
});
