import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const page = readFileSync(
  path.join(process.cwd(), "src/app/[locale]/(public)/profil/pimpinan/page.tsx"),
  "utf8",
);

describe("public leadership page visual contract", () => {
  it("separates the page introduction and dean identity into high-contrast surfaces", () => {
    expect(page).toContain("rounded-2xl border border-royal-100 bg-royal-50");
    expect(page).toContain("bg-royal-50");
    expect(page).toContain("text-slate-950");
    expect(page).not.toContain("bg-navy-950");
  });

  it("uses a consistent editorial image ratio for leadership portraits", () => {
    expect(page).toContain("aspect-[4/3]");
    expect(page).toContain("object-contain");
    expect(page).not.toContain("object-cover");
  });

  it("keeps the dean profile focused on identity", () => {
    expect(page).not.toContain("deanMessage");
    expect(page).not.toContain("LHKPN");
    expect(page).not.toContain("elhkpn.kpk.go.id");
  });

  it("keeps leadership groups semantically labelled and responsive", () => {
    expect(page).toContain('aria-labelledby="dean-profile"');
    expect(page).toContain('aria-labelledby="vice-deans"');
    expect(page).toContain("grid items-stretch gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4");
    expect(page).toContain("relative size-full overflow-hidden rounded-xl");
  });

  it("uses logical direction utilities for the RTL-ready layout", () => {
    expect(page).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d/);
    expect(page).not.toMatch(/\btext-(?:left|right)\b/);
  });
});
