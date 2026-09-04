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
    expect(page).toContain("border-slate-200 bg-white shadow-[0_14px_34px");
    expect(page).toContain("bg-royal-50");
    expect(page).toContain("text-slate-950");
    expect(page).not.toContain("bg-navy-950");
  });

  it("uses a consistent editorial image ratio for leadership portraits", () => {
    expect(page).toContain("aspect-[4/3]");
    expect(page).toContain("object-contain");
    expect(page).not.toContain("object-cover");
  });

  it("keeps the dean card focused on identity and links to the official LHKPN search", () => {
    expect(page).not.toContain("deanMessage");
    expect(page).toContain("https://elhkpn.kpk.go.id/portal/user/check_search_announ");
    expect(page).toContain("lhkpnLabels[locale]");
    expect(page).toContain('target="_blank"');
  });

  it("offers the LHKPN action for every leadership profile group", () => {
    expect(page.match(/href=\{LHKPN_URL\}/g)).toHaveLength(3);
    expect(page).toContain("mt-auto inline-flex");
  });

  it("keeps leadership groups semantically labelled and responsive", () => {
    expect(page).toContain('aria-labelledby="dean-profile"');
    expect(page).toContain('aria-labelledby="vice-deans"');
    expect(page).toContain('aria-labelledby="admin-leadership"');
    expect(page).toContain("grid gap-5 sm:grid-cols-2 lg:grid-cols-3");
    expect(page).toContain("relative size-full overflow-hidden rounded-xl");
    expect(page).not.toContain("lg:col-span-6");
  });

  it("uses logical direction utilities for the RTL-ready layout", () => {
    expect(page).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d/);
    expect(page).not.toMatch(/\btext-(?:left|right)\b/);
  });
});
