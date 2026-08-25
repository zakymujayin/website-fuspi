import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("site header logo management", () => {
  const read = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), "utf8");

  it("adds separate logo pickers to the admin homepage settings form", () => {
    const form = read("src/components/admin/home-nav/site-setting-editor-form.tsx");
    expect(form).toContain("initialLogo: CoverPreview | null");
    expect(form).toContain("initialAccreditationLogo: CoverPreview | null");
    expect(form).toContain("initialBluLogo: CoverPreview | null");
    expect(form).toContain("const [logoId, setLogoId]");
    expect(form).toContain("const [accreditationLogoId, setAccreditationLogoId]");
    expect(form).toContain("const [bluLogoId, setBluLogoId]");
    expect(form).toContain("label={t(\"settings.logo\")}");
    expect(form).toContain("label={t(\"settings.accreditationLogo\")}");
    expect(form).toContain("label={t(\"settings.bluLogo\")}");
    expect(form).toContain("description={t(\"settings.logoDescription\")}");
    expect(form).toContain("logoMediaId: logoId");
    expect(form).toContain("accreditationLogoMediaId: accreditationLogoId");
    expect(form).toContain("bluLogoMediaId: bluLogoId");
  });

  it("loads logo media for admin preview and public header rendering", () => {
    const detail = read("src/features/home-nav/admin-detail.ts");
    const publicQuery = read("src/features/home-nav/public-query.ts");
    expect(detail).toContain("logoMedia: true");
    expect(detail).toContain("accreditationLogoMedia: true");
    expect(detail).toContain("bluLogoMedia: true");
    expect(detail).toContain("logoMedia: adminImageMediaPreview(row.logoMedia)");
    expect(detail).toContain("accreditationLogoMedia: adminImageMediaPreview(row.accreditationLogoMedia)");
    expect(detail).toContain("bluLogoMedia: adminImageMediaPreview(row.bluLogoMedia)");
    expect(publicQuery).toContain("logoMedia: true");
    expect(publicQuery).toContain("accreditationLogoMedia: true");
    expect(publicQuery).toContain("bluLogoMedia: true");
    expect(publicQuery).toContain("logo: mediaView(row.logoMedia, uploadBase)");
    expect(publicQuery).toContain("accreditationLogo: mediaView(row.accreditationLogoMedia, uploadBase)");
    expect(publicQuery).toContain("bluLogo: mediaView(row.bluLogoMedia, uploadBase)");
  });

  it("passes the configured logo into the public header identity cluster", () => {
    const header = read("src/components/public/site-header.tsx");
    const badges = read("src/components/public/identity-badges.tsx");
    expect(header).toContain("getPublicSiteSetting");
    expect(header).toContain("accreditationLogo={siteSetting?.accreditationLogo ?? null}");
    expect(header).toContain("bluLogo={siteSetting?.bluLogo ?? null}");
    expect(badges).toContain("logo?: PublicSiteSetting[\"logo\"] | null");
    expect(badges).toContain("accreditationLogo?: PublicSiteSetting[\"accreditationLogo\"] | null");
    expect(badges).toContain("bluLogo?: PublicSiteSetting[\"bluLogo\"] | null");
    expect(badges).toContain("<ImageWithFallback");
    expect(badges).toContain("accreditationLogo ? (");
    expect(badges).toContain("bluLogo ? (");
  });

  it("defines logo setting labels in every locale", () => {
    for (const locale of ["id", "en", "ar"]) {
      const messages = JSON.parse(read(`messages/${locale}.json`));
      expect(messages.AdminHomeNav.settings.identity, `${locale} identity`).toBeTruthy();
      expect(messages.AdminHomeNav.settings.logo, `${locale} logo`).toBeTruthy();
      expect(messages.AdminHomeNav.settings.logoDescription, `${locale} logoDescription`).toBeTruthy();
      expect(messages.AdminHomeNav.settings.accreditationLogo, `${locale} accreditationLogo`).toBeTruthy();
      expect(messages.AdminHomeNav.settings.accreditationLogoDescription, `${locale} accreditationLogoDescription`).toBeTruthy();
      expect(messages.AdminHomeNav.settings.bluLogo, `${locale} bluLogo`).toBeTruthy();
      expect(messages.AdminHomeNav.settings.bluLogoDescription, `${locale} bluLogoDescription`).toBeTruthy();
    }
  });
});
