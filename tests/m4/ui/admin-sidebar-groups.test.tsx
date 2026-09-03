import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

describe("admin navigation groups", () => {
  it("contains a dedicated academic group and programme editor link", () => {
    const data = read("src/components/admin/admin-sidebar-data.ts");
    expect(data).toContain('labelKey: "academics"');
    expect(data).toContain('href: "/admin/program-studi"');
  });

  it("uses accessible expandable group controls and preserves the active group", () => {
    const sidebar = read("src/components/admin/admin-sidebar.tsx");
    expect(sidebar).toContain('aria-expanded={isOpen}');
    expect(sidebar).toContain("setOpenGroups");
    expect(sidebar).toContain("groupActive || openGroups.has");
    expect(sidebar).toContain('className={isOpen ? undefined : "hidden"}');
  });
});
