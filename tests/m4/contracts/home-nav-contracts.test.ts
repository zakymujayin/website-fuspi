import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

import {
  HomeNavAdminCommandSchema,
  HomeSectionInputSchema,
  HomeSectionKeySchema,
  HomeSliderInputSchema,
  MenuItemInputSchema,
  PublicHomeSnapshotSchema,
  PublicNavigationNodeSchema,
  SiteSettingInputSchema,
  StatisticInputSchema,
} from "@/contracts/home-nav";

const resolution = {requestedLocale: "en", resolvedLocale: "id", isFallback: true} as const;
const emptySnapshot = {
  locale: "en", generatedAt: "2026-08-04T03:00:00.000Z",
  navigation: {contentBar: [], topbar: [], header: [], footer: []}, externalLinks: [], sections: [], sliders: [],
  quickLinks: [], statistics: [], homeVideos: [], siteSetting: {facultyName: "Fakultas", tagline: null, addresses: [], dean: null,
    video: null, logo: null, accreditationLogo: null, bluLogo: null, favicon: null,
    email: null, phone: null, socialLinks: {facebook: null, instagram: null, youtube: null, x: null},
    translation: resolution},
  content: {studyPrograms: [], news: [], announcements: [], columns: [], services: [], partnerships: [], events: [], testimonials: []},
};

describe("home and navigation frozen contracts", () => {
  it("freezes all seventeen editable home section keys", () => {
    expect(HomeSectionKeySchema.options).toEqual([
      "HERO", "QUICKLINK", "DEAN", "STATS", "INTRO", "PRODI", "ANNOUNCEMENT", "SERVICE",
      "FACILITY", "NEWS", "PARTNERSHIP", "COLUMN", "ACHIEVEMENT", "VIDEO", "AGENDA", "TESTIMONIAL", "CTA",
    ]);
    expect(HomeSectionKeySchema.safeParse("OTHER").success).toBe(false);
  });

  it("requires Indonesian translations and rejects selector injection", () => {
    const input = {location: "HEADER", link: null, pageId: null, parentId: null, order: 0, isVisible: true,
      translations: {id: {label: "Profil"}}};
    expect(MenuItemInputSchema.safeParse(input).success).toBe(true);
    expect(MenuItemInputSchema.safeParse({...input, translations: {en: {label: "Profile"}}}).success).toBe(false);
    expect(MenuItemInputSchema.safeParse({...input, where: {id: {not: "menu-1"}}}).success).toBe(false);
    expect(MenuItemInputSchema.safeParse({...input, link: {kind: "INTERNAL", href: "/profil"}, pageId: "page-1"}).success).toBe(false);
  });

  it("fails closed for SSRF URLs and enforces CTA completeness", () => {
    const section = {key: "CTA", isVisible: true, order: 14, itemLimit: 1, backgroundMediaId: null,
      cta: {kind: "EXTERNAL", href: "https://example.org/apply"},
      translations: {id: {title: "Daftar", subtitle: null, ctaLabel: "Mulai"}}};
    expect(HomeSectionInputSchema.safeParse(section).success).toBe(true);
    expect(HomeSectionInputSchema.safeParse({...section, cta: {kind: "EXTERNAL", href: "https://127.0.0.1/private"}}).success).toBe(false);
    expect(HomeSectionInputSchema.safeParse({...section, translations: {id: {title: "Daftar", subtitle: null, ctaLabel: null}}}).success).toBe(false);
    expect(HomeSliderInputSchema.safeParse({imageMediaId: "media-1", cta: null, order: 0, isVisible: true,
      translations: {id: {title: null, subtitle: null, ctaLabel: null}}}).success).toBe(false);
  });

  it("separates statistic values from suffixes and rejects invented formatting", () => {
    const statistic = {value: "1250", suffix: "+", icon: "users", order: 0, isVisible: true,
      translations: {id: {label: "Mahasiswa"}}};
    expect(StatisticInputSchema.safeParse(statistic).success).toBe(true);
    expect(StatisticInputSchema.safeParse({...statistic, value: "sekitar seribu"}).success).toBe(false);
    expect(StatisticInputSchema.safeParse({...statistic, suffix: "+\t="}).success).toBe(false);
  });

  it("requires complete dean and video asset pairs with safe public URLs", () => {
    const setting = {deanName: null, deanPhotoMediaId: null, videoUrl: null, videoPosterMediaId: null,
      email: null, phone: null, facebookUrl: null, instagramUrl: null, youtubeUrl: null, xUrl: null,
      logoMediaId: null, accreditationLogoMediaId: null, bluLogoMediaId: null,
      faviconMediaId: null, contentOwnerId: null, expiresAt: null,
      translations: {id: {facultyName: "Fakultas", tagline: null, address1: null, address2: null,
        deanPosition: null, deanMessage: null, videoTitle: null, videoDesc: null}}};
    expect(SiteSettingInputSchema.safeParse(setting).success).toBe(true);
    expect(SiteSettingInputSchema.safeParse({...setting, deanName: "Nama"}).success).toBe(false);
    expect(SiteSettingInputSchema.safeParse({...setting, videoUrl: "https://video.example.org/watch"}).success).toBe(false);
    expect(SiteSettingInputSchema.safeParse({...setting, facebookUrl: "https://localhost/social"}).success).toBe(false);
  });

  it("keeps singleton media identifiers in the admin site setting payload", () => {
    const formSource = readFileSync(path.join(process.cwd(), "src/components/admin/home-nav/site-setting-editor-form.tsx"), "utf8");
    const detailSource = readFileSync(path.join(process.cwd(), "src/features/home-nav/admin-detail.ts"), "utf8");
    const pageSource = readFileSync(path.join(process.cwd(), "src/app/[locale]/admin/beranda/pengaturan/page.tsx"), "utf8");

    expect(formSource).toContain("logoMediaId:");
    expect(formSource).toContain("const [logoId, setLogoId]");
    expect(formSource).toContain("const [accreditationLogoId, setAccreditationLogoId]");
    expect(formSource).toContain("const [bluLogoId, setBluLogoId]");
    expect(formSource).toContain("logoMediaId: logoId");
    expect(formSource).toContain("accreditationLogoMediaId: accreditationLogoId");
    expect(formSource).toContain("bluLogoMediaId: bluLogoId");
    expect(formSource).toContain("initialMedia={initialLogo}");
    expect(formSource).toContain("initialMedia={initialAccreditationLogo}");
    expect(formSource).toContain("initialMedia={initialBluLogo}");
    expect(formSource).toContain("faviconMediaId:");
    expect(detailSource).toContain("logoMediaId: row.logoMediaId");
    expect(detailSource).toContain("logoMedia: true");
    expect(detailSource).toContain("logoMedia: adminImageMediaPreview(row.logoMedia)");
    expect(detailSource).toContain("accreditationLogoMediaId: row.accreditationLogoMediaId");
    expect(detailSource).toContain("bluLogoMediaId: row.bluLogoMediaId");
    expect(detailSource).toContain("faviconMediaId: row.faviconMediaId");
    expect(formSource).not.toContain("defaultValue=");
    expect(formSource).toContain("value={idTr.videoTitle}");
    expect(formSource).toContain("onChange={updateTranslation(\"id\", \"videoTitle\")}");
    expect(pageSource).toContain("key={`site-setting-${result.data.version ?? 0}`}");
    expect(pageSource).toContain("initialLogo={result.data.logoMedia ?? null}");
    expect(pageSource).toContain("initialAccreditationLogo={result.data.accreditationLogoMedia ?? null}");
    expect(pageSource).toContain("initialBluLogo={result.data.bluLogoMedia ?? null}");
  });

  it("defines translated AdminHomeNav mutation failures in every locale", () => {
    const codes = [
      "SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "VALIDATION_FAILED", "NOT_FOUND", "VERSION_CONFLICT",
      "INVALID_STATE", "URL_INVALID", "MEDIA_INVALID", "RELATION_INVALID", "IN_USE", "UNAVAILABLE",
    ];

    for (const locale of ["id", "en", "ar"]) {
      const messages = JSON.parse(readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8")) as {
        AdminHomeNav?: {errors?: Record<string, string>};
      };
      for (const code of codes) {
        expect(messages.AdminHomeNav?.errors?.[code], `${locale} AdminHomeNav.errors.${code}`).toBeTruthy();
      }
    }
  });

  it("encodes version intent and protects structural singleton resources", () => {
    const quick = {link: {kind: "INTERNAL", href: "/layanan"}, icon: null, order: 0, isVisible: true,
      translations: {id: {label: "Layanan"}}};
    expect(HomeNavAdminCommandSchema.safeParse({action: "UPDATE", resource: "QUICK_LINK",
      mutation: {id: "quick-1", expectedVersion: null}, payload: quick}).success).toBe(true);
    expect(HomeNavAdminCommandSchema.safeParse({action: "UPDATE", resource: "QUICK_LINK",
      mutation: {id: "quick-1", expectedVersion: 1}, payload: quick}).success).toBe(false);
    expect(HomeNavAdminCommandSchema.safeParse({action: "DELETE", resource: "HOME_SECTION", id: "section-1", expectedVersion: null}).success).toBe(false);
    expect(HomeNavAdminCommandSchema.safeParse({action: "DELETE", resource: "SITE_SETTING", id: "singleton", expectedVersion: 1}).success).toBe(false);
  });

  it("validates navigation fallback metadata and rejects technical fields", () => {
    const node = {id: "menu-1", label: "Profil", link: {kind: "INTERNAL", href: "/profil"}, children: [], translation: resolution};
    expect(PublicNavigationNodeSchema.safeParse(node).success).toBe(true);
    expect(PublicNavigationNodeSchema.safeParse({...node, translation: {...resolution, resolvedLocale: "ar"}}).success).toBe(false);
    expect(PublicNavigationNodeSchema.safeParse({...node, storageKey: "2026/08/secret.webp"}).success).toBe(false);
  });

  it("accepts an empty truthful snapshot and rejects cross-resource or private payloads", () => {
    expect(PublicHomeSnapshotSchema.safeParse(emptySnapshot).success).toBe(true);
    const testimonial = {id: "testimonial-1", resource: "TESTIMONIAL", slug: null, title: "Alumni", summary: null,
      badge: null, startsAt: null, endsAt: null, media: null, link: null, translation: resolution};
    expect(PublicHomeSnapshotSchema.safeParse({...emptySnapshot,
      content: {...emptySnapshot.content, services: [testimonial]}}).success).toBe(false);
    expect(PublicHomeSnapshotSchema.safeParse({...emptySnapshot, contentOwnerId: "admin-1"}).success).toBe(false);
    const emptyHero = {id: "section-hero", key: "HERO", order: 0, itemLimit: 4, cta: null, background: null,
      translation: {...resolution, title: "Sorotan", subtitle: null, ctaLabel: null}};
    expect(PublicHomeSnapshotSchema.safeParse({...emptySnapshot, sections: [emptyHero]}).success).toBe(false);
  });

  it("requires the five study programs in the institutional order when present", () => {
    const program = (code: "IAT" | "IH" | "AFI" | "SAA" | "TASPI") => ({id: `program-${code}`, code,
      slug: code.toLowerCase(), name: code, degree: "S1", accreditation: null, logo: null, translation: resolution});
    const ordered = ["IAT", "IH", "AFI", "SAA", "TASPI"].map((code) => program(code as "IAT" | "IH" | "AFI" | "SAA" | "TASPI"));
    const section = {id: "section-prodi", key: "PRODI", order: 0, itemLimit: 5, cta: null, background: null,
      translation: {...resolution, title: "Program Studi", subtitle: null, ctaLabel: null}};
    expect(PublicHomeSnapshotSchema.safeParse({...emptySnapshot, sections: [section], content: {...emptySnapshot.content, studyPrograms: ordered}}).success).toBe(true);
    expect(PublicHomeSnapshotSchema.safeParse({...emptySnapshot, sections: [section], content: {...emptySnapshot.content, studyPrograms: [...ordered].reverse()}}).success).toBe(false);
    expect(PublicHomeSnapshotSchema.safeParse({...emptySnapshot, sections: [section], content: {...emptySnapshot.content, studyPrograms: ordered.slice(0, 4)}}).success).toBe(false);
  });
});
