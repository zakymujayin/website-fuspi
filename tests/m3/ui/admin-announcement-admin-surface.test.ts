import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const flatten = (value: unknown, prefix = ""): string[] =>
  typeof value === "object" && value !== null
    ? Object.entries(value).flatMap(([key, child]) =>
        flatten(child, prefix ? `${prefix}.${key}` : key))
    : [prefix];

const ROUTE_DIR = "src/app/[locale]/admin/pengumuman";

describe("Pengumuman admin routes", () => {
  it.each([
    "page.tsx",
    "loading.tsx",
    "new/page.tsx",
    "[postId]/edit/page.tsx",
  ])("ships %s", (file) => {
    expect(existsSync(path.join(root, ROUTE_DIR, file))).toBe(true);
  });

  it("list page queries the PENGUMUMAN post type and keeps its own base path", () => {
    const page = read(`${ROUTE_DIR}/page.tsx`);
    expect(page).toContain('toAdminPostTransportQuery(query, "PENGUMUMAN")');
    expect(page).toContain('getTranslations("AdminAnnouncementList")');
    expect(page).toContain('basePath={BASE_PATH}');
    expect(page).toContain('const BASE_PATH = "/admin/pengumuman"');
    expect(page).toContain("editHrefFor={(id) => `${BASE_PATH}/${id}/edit`}");
  });

  it("create link points at a route segment that exists", () => {
    const page = read(`${ROUTE_DIR}/page.tsx`);
    const match = page.match(/href=\{`\$\{BASE_PATH\}\/([a-z-]+)`\}/);
    expect(match).not.toBeNull();
    expect(existsSync(path.join(root, ROUTE_DIR, match![1], "page.tsx"))).toBe(true);
  });

  it("editor pages drive the shared editor with postType PENGUMUMAN", () => {
    const create = read(`${ROUTE_DIR}/new/page.tsx`);
    const edit = read(`${ROUTE_DIR}/[postId]/edit/page.tsx`);
    expect(create).toContain('postType="PENGUMUMAN"');
    expect(create).toContain('listHref="/admin/pengumuman"');
    expect(edit).toContain('postType="PENGUMUMAN"');
    expect(edit).toContain('"PENGUMUMAN",'); // getAdminPostEditor expectedType
  });

  it("appears once in the admin sidebar registry under content", () => {
    const sidebar = read("src/components/admin/admin-sidebar-data.ts");
    expect(sidebar).toContain('href: "/admin/pengumuman"');
    expect(sidebar).toContain('labelKey: "announcements"');
  });

  it("the posts API revalidates the public announcement paths on mutation", () => {
    const route = read("src/app/api/admin/posts/route.ts");
    expect(route).toContain("/${locale}/pengumuman`");
    expect(route).toContain("/${locale}/admin/pengumuman`");
  });
});

describe("Pengumuman admin i18n", () => {
  const locales = ["id", "en", "ar"] as const;
  const messages = Object.fromEntries(
    locales.map((locale) => [locale, JSON.parse(read(`messages/${locale}.json`))]),
  );

  it("defines AdminAnnouncementList / AdminAnnouncementEditor with identical keys across locales", () => {
    for (const namespace of ["AdminAnnouncementList", "AdminAnnouncementEditor"]) {
      const [id, en, ar] = locales.map((locale) => flatten(messages[locale][namespace]).sort());
      expect(id.length).toBeGreaterThan(5);
      expect(en).toEqual(id);
      expect(ar).toEqual(id);
    }
  });

  it("gives the announcement list the same key set as the news list", () => {
    const news = flatten(messages.id.AdminPostList).sort();
    const announcements = flatten(messages.id.AdminAnnouncementList).sort();
    expect(announcements).toEqual(news);
  });

  it("names the sidebar entry in every locale with real Arabic", () => {
    for (const locale of locales) {
      expect(messages[locale].AdminSidebar.items.announcements).toBeTruthy();
    }
    expect(messages.ar.AdminSidebar.items.announcements).toMatch(/[؀-ۿ]/);
    expect(messages.ar.AdminAnnouncementList.title).toMatch(/[؀-ۿ]/);
  });
});
