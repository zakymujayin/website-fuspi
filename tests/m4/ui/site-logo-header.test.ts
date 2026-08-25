import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("site header logo management", () => {
  const read = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), "utf8");

  it("adds a logo picker to the admin homepage settings form", () => {
    const form = read("src/components/admin/home-nav/site-setting-editor-form.tsx");
    expect(form).toContain("initialLogo: CoverPreview | null");
    expect(form).toContain("const [logoId, setLogoId]");
    expect(form).toContain("label={t(\"settings.logo\")}");
    expect(form).toContain("description={t(\"settings.logoDescription\")}");
    expect(form).toContain("logoMediaId: logoId");
  });

  it("loads logo media for admin preview and public header rendering", () => {
    const detail = read("src/features/home-nav/admin-detail.ts");
    const publicQuery = read("src/features/home-nav/public-query.ts");
    expect(detail).toContain("logoMedia: true");
    expect(detail).toContain("logoMedia: adminImageMediaPreview(row.logoMedia)");
    expect(publicQuery).toContain("logoMedia: true");
    expect(publicQuery).toContain("logo: mediaView(row.logoMedia, uploadBase)");
  });

  it("passes the configured logo into the public header identity cluster", () => {
    const header = read("src/components/public/site-header.tsx");
    const badges = read("src/components/public/identity-badges.tsx");
    expect(header).toContain("getPublicSiteSetting");
    expect(header).toContain("<IdentityBadges logo={siteSetting?.logo ?? null} />");
    expect(badges).toContain("logo?: PublicSiteSetting[\"logo\"] | null");
    expect(badges).toContain("<ImageWithFallback");
    expect(badges).toContain("{!logo ? (");
  });

  it("defines logo setting labels in every locale", () => {
    for (const locale of ["id", "en", "ar"]) {
      const messages = JSON.parse(read(`messages/${locale}.json`));
      expect(messages.AdminHomeNav.settings.identity, `${locale} identity`).toBeTruthy();
      expect(messages.AdminHomeNav.settings.logo, `${locale} logo`).toBeTruthy();
      expect(messages.AdminHomeNav.settings.logoDescription, `${locale} logoDescription`).toBeTruthy();
    }
  });
});
