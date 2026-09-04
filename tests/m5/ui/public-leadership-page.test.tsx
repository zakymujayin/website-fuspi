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
    expect(page).toContain('aria-labelledby="leadership-team"');
    expect(page).toContain("Jajaran Pimpinan");
    expect(page).not.toContain('aria-labelledby="vice-deans"');
    expect(page).toContain("grid items-stretch gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4");
    expect(page).toContain("relative size-full overflow-hidden rounded-xl");
  });

  it("separates leadership roles from their areas of responsibility", () => {
    expect(page).toContain("function LeadershipPosition");
    expect(page).toContain('position.indexOf("—")');
    expect(page).toContain("whitespace-nowrap text-[13px] font-semibold leading-5");
    expect(page).toContain("max-w-[15rem] text-pretty text-sm leading-6");
  });

  it("keeps the roster readable and names on one line", () => {
    expect(page).toContain("vd.bio");
    expect(page).toContain("headOfAdminBio");
    expect(page).toContain("whitespace-nowrap font-display text-[13px] font-bold leading-5 tracking-tight");
    expect(page).not.toContain("text-[clamp");
    expect(page).toContain("max-w-[15rem] text-pretty text-sm leading-6 text-slate-500");
    expect(page).toContain("min-h-24 max-w-[18rem] self-center text-pretty text-sm leading-6");
  });

  it("uses logical direction utilities for the RTL-ready layout", () => {
    expect(page).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d/);
    expect(page).not.toMatch(/\btext-(?:left|right)\b/);
  });
});
