import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("curriculum page visual hierarchy", () => {
  it("uses the shared navy treatment for each program header", () => {
    const page = readFileSync(path.join(process.cwd(), "src/app/[locale]/(public)/akademik/kurikulum/page.tsx"), "utf8");

    expect(page).toContain("bg-navy-800");
    expect(page).toContain("text-white transition-colors hover:text-brass-200");
  });

  it("keeps the curriculum metrics on white surfaces", () => {
    const page = readFileSync(path.join(process.cwd(), "src/app/[locale]/(public)/akademik/kurikulum/page.tsx"), "utf8");

    expect(page).toContain('className="bg-white px-4 py-5"');
  });
});
