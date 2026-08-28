import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PAGES = [
  "posts", "kolom", "pengumuman", "pages",
  "agenda", "album", "beasiswa", "dokumen", "faq", "kegiatan",
  "kerjasama", "layanan", "prestasi", "testimoni",
  "taksonomi", "fasilitas",
];
const appDir = path.join(process.cwd(), "src/app/[locale]/admin");

describe("every in-scope admin list has search + page-size + pagination", () => {
  it.each(PAGES)("%s", (slug) => {
    const src = readFileSync(path.join(appDir, slug, "page.tsx"), "utf8");
    // `/admin/pages` wires search through the delegating `AdminPageSearch`
    // wrapper (which itself renders the shared `AdminListSearch` primitive);
    // every other list uses `AdminListSearch` directly.
    if (slug === "pages") {
      expect(src, `${slug}: search`).toMatch(/AdminListSearch|AdminPageSearch/);
    } else {
      expect(src, `${slug}: search`).toContain("AdminListSearch");
    }
    expect(src, `${slug}: page-size`).toContain("AdminPageSizeSelect");
    expect(src, `${slug}: pagination`).toMatch(/Pagination|pagination/);
  });
});

describe("default page size is 10 across every list query module", () => {
  it.each([
    ["src/components/admin/posts/post-query.ts", "ADMIN_POST_PAGE_SIZE = 10"],
    ["src/components/admin/pages/page-query.ts", "ADMIN_PAGE_PAGE_SIZE = 10"],
    ["src/components/admin/public-content/public-content-query.ts", "PUBLIC_CONTENT_ADMIN_PAGE_SIZE = 10"],
  ])("%s", (rel, needle) => {
    expect(readFileSync(path.join(process.cwd(), rel), "utf8")).toContain(needle);
  });
});
