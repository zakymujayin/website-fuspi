import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("accreditation CMS surface", () => {
  it("provides editable decree, agency, expiry, and upload controls", () => {
    const form = readFileSync(path.join(process.cwd(), "src/components/admin/academic/program-studi-editor-form.tsx"), "utf8");
    expect(form).toContain("accreditationAgency");
    expect(form).toContain("accreditationDecreeNumber");
    expect(form).toContain("ProgramCertificatePicker");
    expect(form).toContain("accreditationCertificateMediaId");
  });

  it("renders a public PDF link only when a certificate exists", () => {
    const page = readFileSync(path.join(process.cwd(), "src/app/[locale]/(public)/akademik/akreditasi/page.tsx"), "utf8");
    expect(page).toContain("target=\"_blank\"");
    expect(page).toContain("certificate ? (");
    expect(page).toContain("t(\"accreditationUnavailable\")");
  });

  it("uses the shared navy table header color for program cards", () => {
    const page = readFileSync(path.join(process.cwd(), "src/app/[locale]/(public)/akademik/akreditasi/page.tsx"), "utf8");
    expect(page).toContain("border-navy-700 bg-navy-800");
    expect(page).toContain("text-white md:text-3xl");
  });
});
