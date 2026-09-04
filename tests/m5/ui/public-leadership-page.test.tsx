import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const page = readFileSync(
  path.join(process.cwd(), "src/app/[locale]/(public)/profil/pimpinan/page.tsx"),
  "utf8",
);

describe("public leadership page visual contract", () => {
  it("separates the page introduction and dean identity into high-contrast surfaces", () => {
    expect(page).toContain("bg-navy-950");
    expect(page).toContain("bg-white shadow-md");
    expect(page).toContain("bg-royal-50");
    expect(page).toContain("text-slate-950");
  });

  it("uses a consistent editorial image ratio for leadership portraits", () => {
    expect(page).toContain("aspect-[4/3]");
    expect(page).not.toContain("aspect-[3/4]");
  });

  it("keeps leadership groups semantically labelled and responsive", () => {
    expect(page).toContain('aria-labelledby="dean-profile"');
    expect(page).toContain('aria-labelledby="vice-deans"');
    expect(page).toContain('aria-labelledby="admin-leadership"');
    expect(page).toContain("sm:grid-cols-2 lg:grid-cols-3");
  });

  it("uses logical direction utilities for the RTL-ready layout", () => {
    expect(page).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d/);
    expect(page).not.toMatch(/\btext-(?:left|right)\b/);
  });
});
