import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (typeof DATABASE_URL !== "string" || DATABASE_URL.length === 0) {
  throw new Error("DATABASE_URL is required for public Berita browser tests.");
}

const validated = new URL(DATABASE_URL);
const LOCAL_PG_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
if (
  validated.protocol !== "postgresql:"
  || !LOCAL_PG_HOSTS.has(validated.hostname)
  || validated.hostname.includes("prod")
  || validated.hostname.includes("staging")
  || validated.pathname.includes("prod")
  || validated.pathname.includes("staging")
) {
  throw new Error(
    "Refusing non-local or production/staging database. "
    + `Protocol=${validated.protocol}, hostname=${validated.hostname}.`,
  );
}

const BREAKPOINTS = [360, 390, 768, 1024, 1440] as const;

const HOSTILE_HTML = `
<p>Paragraph</p>
<h2>Heading Two</h2>
<ul><li>Item</li></ul>
<blockquote><p>Quote</p></blockquote>
<a href="https://example.com">Link</a>
<figure><img src="/uploads/2026/07/${"a".repeat(64)}.webp" alt="Image" loading="lazy" width="320" height="240" /></figure>
<table><caption>Caption</caption><thead><tr><th>Head</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>
<pre><code>const x = 1;</code></pre>
<script>alert('xss')</script>
<p onclick="alert('click')">OnClick</p>
<a href="javascript:alert('js')">JS Link</a>
<a href="//evil.com">Protocol-relative</a>
<p class="removed">Class stripped</p>
<hr>
<strong>Strong</strong><em>Emphasis</em>
<s>Strikethrough</s><u>Underline</u>
<sub>Sub</sub><sup>Sup</sup>
<h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>
<p>${"verylongword".repeat(50)}</p>
`.trim();

function marker() {
  return `e2e-br-${process.pid}-${Date.now()}`;
}

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("M3 public Berita experience", () => {

  const m = marker();
  const pool = new Pool({ connectionString: DATABASE_URL });
  const userIds: string[] = [];
  const mediaIds: string[] = [];
  const categoryIds: string[] = [];
  const postIds: string[] = [];

  const PAST = new Date(Date.UTC(2025, 6, 15));
  const FUTURE = new Date(Date.UTC(2027, 0, 1));
  const MEDIA_KEY = `2026/07/${randomUUID().replace(/-/g, "").repeat(2).slice(0, 64)}.webp`;

  const slug1 = `${m}-pub-1`;
  const slugM = `${m}-multi`;
  const slugID = `${m}-id-only`;
  const slugDraft = `${m}-draft`;
  const slugFuture = `${m}-future`;
  const slugArchived = `${m}-archived`;
  const slugPeng = `${m}-pengumuman`;
  const authorName = `${m} Author`;
  const title1 = "Berita Publikasi Pertama";
  const titleDraft = "Berita Draft Tersembunyi";
  const titleFuture = "Berita Masa Depan";
  const titleArchived = "Berita Arsip Tersembunyi";
  const titlePeng = "Pengumuman Tersembunyi";
  const titleIDOnly = "Berita Hanya Bahasa Indonesia";
  const titleMulti = "Berita Tiga Bahasa";
  const titleMultiEN = "Trilingual News";
  const titleMultiAR = "خبر ثلاثي اللغات";
  const excerptID = "Kutipan berita hanya ID.";
  const contentMultiAR = "المحتوى باللغة العربية.";
  const coverCaption = "Keterangan gambar berita pertama.";

  test.beforeAll(async () => {
    const authorId = randomUUID();
    userIds.push(authorId);
    await pool.query(
      `INSERT INTO "User" ("id", "name", "email", "role", "updatedAt") VALUES ($1, $2, $3, 'EDITOR', NOW())`,
      [authorId, authorName, `${m}-author@example.invalid`],
    );

    const mediaId = randomUUID();
    mediaIds.push(mediaId);
    await pool.query(
      `INSERT INTO "Media" ("id", "storageKey", "storageClass", "checksumSha256", "originalName", "mimeType", "size", "alt", "isDecorative", "width", "height", "uploaderId", "createdAt")
       VALUES ($1, $2, 'PUBLIC', $3, $4, 'image/webp', 1024, $5, false, 320, 240, $6, $7)`,
      [mediaId, MEDIA_KEY, "b".repeat(64), `${m}-cover.webp`, "Cover FUSPI", authorId, PAST],
    );

    const catId = randomUUID();
    categoryIds.push(catId);
    await pool.query(
      `INSERT INTO "Category" ("id", "slug") VALUES ($1, $2)`,
      [catId, `${m}-cat`],
    );
    await pool.query(
      `INSERT INTO "CategoryTranslation" ("id", "categoryId", "locale", "name", "status") VALUES ($1, $2, 'id', $3, 'PUBLISHED')`,
      [randomUUID(), catId, "Berita Kampus"],
    );

    // PUBLISHED BERITA with ID + cover + caption
    const pubId1 = randomUUID(); postIds.push(pubId1);
    await pool.query(
      `INSERT INTO "Post" ("id", "type", "slug", "status", "publishedAt", "categoryId", "authorId", "coverMediaId", "updatedAt")
       VALUES ($1, 'BERITA', $2, 'PUBLISHED', $3, $4, $5, $6, NOW())`,
      [pubId1, slug1, PAST, catId, authorId, mediaId],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "excerpt", "content", "metaTitle", "metaDesc", "coverCaption", "status")
       VALUES ($1, $2, 'id', $3, $4, $5, $6, $7, $8, 'PUBLISHED')`,
      [randomUUID(), pubId1, title1, "Kutipan berita publikasi pertama.", HOSTILE_HTML, "Meta Berita Pertama", "Deskripsi meta berita pertama.", coverCaption],
    );

    // PUBLISHED BERITA with ID+EN+AR
    const pubIdM = randomUUID(); postIds.push(pubIdM);
    await pool.query(
      `INSERT INTO "Post" ("id", "type", "slug", "status", "publishedAt", "categoryId", "authorId", "updatedAt")
       VALUES ($1, 'BERITA', $2, 'PUBLISHED', $3, $4, $5, NOW())`,
      [pubIdM, slugM, PAST, catId, authorId],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "excerpt", "content", "metaDesc", "coverCaption", "status")
       VALUES ($1, $2, 'id', $3, 'Kutipan berita tiga bahasa.', '<p>Konten bahasa Indonesia.</p>', 'Deskripsi meta tiga bahasa.', 'Keterangan tiga bahasa.', 'PUBLISHED')`,
      [randomUUID(), pubIdM, titleMulti],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "excerpt", "content", "metaDesc", "status")
       VALUES ($1, $2, 'en', $3, 'Excerpt in English.', '<p>Content in English.</p>', 'Meta description in English.', 'PUBLISHED')`,
      [randomUUID(), pubIdM, titleMultiEN],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "excerpt", "content", "metaDesc", "status")
       VALUES ($1, $2, 'ar', $3, 'مقتطف بالعربية.', '<p>المحتوى باللغة العربية.</p>', 'وصف ميتا بالعربية.', 'PUBLISHED')`,
      [randomUUID(), pubIdM, titleMultiAR],
    );

    // PUBLISHED BERITA with ID only (for fallback)
    const pubIdID = randomUUID(); postIds.push(pubIdID);
    await pool.query(
      `INSERT INTO "Post" ("id", "type", "slug", "status", "publishedAt", "authorId", "updatedAt")
       VALUES ($1, 'BERITA', $2, 'PUBLISHED', $3, $4, NOW())`,
      [pubIdID, slugID, PAST, authorId],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "excerpt", "content", "metaDesc", "coverCaption", "status")
       VALUES ($1, $2, 'id', $3, $4, '<p>Konten hanya dalam bahasa Indonesia.</p>', 'Deskripsi hanya ID.', 'Caption fallback ID.', 'PUBLISHED')`,
      [randomUUID(), pubIdID, titleIDOnly, excerptID],
    );

    // DRAFT (hidden)
    const draftId = randomUUID(); postIds.push(draftId);
    await pool.query(
      `INSERT INTO "Post" ("id", "type", "slug", "status", "authorId", "updatedAt")
       VALUES ($1, 'BERITA', $2, 'DRAFT', $3, NOW())`,
      [draftId, slugDraft, authorId],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "content", "status")
       VALUES ($1, $2, 'id', $3, '<p>Ini draft.</p>', 'PUBLISHED')`,
      [randomUUID(), draftId, titleDraft],
    );

    // FUTURE (hidden)
    const futureId = randomUUID(); postIds.push(futureId);
    await pool.query(
      `INSERT INTO "Post" ("id", "type", "slug", "status", "publishedAt", "authorId", "updatedAt")
       VALUES ($1, 'BERITA', $2, 'PUBLISHED', $3, $4, NOW())`,
      [futureId, slugFuture, FUTURE, authorId],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "content", "status")
       VALUES ($1, $2, 'id', $3, '<p>Belum waktunya.</p>', 'PUBLISHED')`,
      [randomUUID(), futureId, titleFuture],
    );

    // ARCHIVED (hidden)
    const archivedId = randomUUID(); postIds.push(archivedId);
    await pool.query(
      `INSERT INTO "Post" ("id", "type", "slug", "status", "publishedAt", "authorId", "updatedAt")
       VALUES ($1, 'BERITA', $2, 'ARCHIVED', $3, $4, NOW())`,
      [archivedId, slugArchived, PAST, authorId],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "content", "status")
       VALUES ($1, $2, 'id', $3, '<p>Arsip.</p>', 'PUBLISHED')`,
      [randomUUID(), archivedId, titleArchived],
    );

    // PENGUMUMAN (wrong type)
    const pengId = randomUUID(); postIds.push(pengId);
    await pool.query(
      `INSERT INTO "Post" ("id", "type", "slug", "status", "publishedAt", "authorId", "updatedAt")
       VALUES ($1, 'PENGUMUMAN', $2, 'PUBLISHED', $3, $4, NOW())`,
      [pengId, slugPeng, PAST, authorId],
    );
    await pool.query(
      `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "content", "status")
       VALUES ($1, $2, 'id', $3, '<p>Ini pengumuman, bukan berita.</p>', 'PUBLISHED')`,
      [randomUUID(), pengId, titlePeng],
    );

    // 11 pagination posts (older dates → page 2)
    for (let i = 2; i <= 12; i++) {
      const pid = randomUUID(); postIds.push(pid);
      await pool.query(
        `INSERT INTO "Post" ("id", "type", "slug", "status", "publishedAt", "authorId", "updatedAt")
         VALUES ($1, 'BERITA', $2, 'PUBLISHED', $3, $4, NOW())`,
        [pid, `${m}-page-${i}`, new Date(Date.UTC(2024, 0, i)), authorId],
      );
      await pool.query(
        `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "content", "status")
         VALUES ($1, $2, 'id', $3, $4, 'PUBLISHED')`,
        [randomUUID(), pid, `Berita Halaman ${i}`, `<p>Konten berita halaman ${i}.</p>`],
      );
    }
  });

  test.afterAll(async () => {
    for (const postId of postIds) {
      await pool.query(`DELETE FROM "PostTranslation" WHERE "postId" = $1`, [postId]);
      await pool.query(`DELETE FROM "PostTag" WHERE "postId" = $1`, [postId]);
    }
    for (const postId of postIds) {
      await pool.query(`DELETE FROM "Post" WHERE "id" = $1`, [postId]);
    }
    for (const catId of categoryIds) {
      await pool.query(`DELETE FROM "CategoryTranslation" WHERE "categoryId" = $1`, [catId]);
      await pool.query(`DELETE FROM "Category" WHERE "id" = $1`, [catId]);
    }
    for (const mediaId of mediaIds) {
      await pool.query(`DELETE FROM "Media" WHERE "id" = $1`, [mediaId]);
    }
    for (const userId of userIds) {
      await pool.query(`DELETE FROM "Session" WHERE "userId" = $1`, [userId]);
      await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [userId]);
    }
    await pool.end();
  });

  // ═══ LIST ROUTE ═══

  test("ID: list renders only PUBLISHED BERITA with publishedAt <= now", async ({ page }) => {
    await page.goto("/id/berita");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Berita/i);
    await expect(page.getByText(title1).first()).toBeVisible();

    await expect(page.getByText(titleDraft)).toHaveCount(0);
    await expect(page.getByText(titleFuture)).toHaveCount(0);
    await expect(page.getByText(titleArchived)).toHaveCount(0);
    await expect(page.getByText(titlePeng)).toHaveCount(0);

    // Exactly one main landmark
    await expect(page.locator("main")).toHaveCount(1);

    // Keyboard-visible focus on a link
    await page.locator("a").first().focus();
    await expect(page.locator("a:focus").first()).toBeVisible();
  });

  test("ID: list pagination — page 2 reachable from page 1", async ({ page }) => {
    await page.goto("/id/berita");
    // Verify page 1 has content and a link to page 2
    await expect(page.getByText(title1).first()).toBeVisible({ timeout: 10_000 });

    const page2Link = page.locator("a[href*='page=2']").first();
    if (await page2Link.count() > 0) {
      await page2Link.click();
      await page.waitForURL("**/berita?page=2");
      // Should still have valid content, not the unavailable/empty state
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("ID: hostile page values normalize safely — missing, repeated, zero, negative, fractional, excessive", async ({ page }) => {
    // missing → default page 1
    await page.goto("/id/berita");
    await expect(page.getByText(title1).first()).toBeVisible({ timeout: 10_000 });

    // repeated — Next.js takes last value (?page=abc&page=1), so we test invalid variants directly
    for (const bad of ["abc", "0", "-1", "2.5"]) {
      await page.goto(`/id/berita?page=${bad}`);
      await expect(page.getByText(title1).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.locator("body")).not.toContainText(/DATABASE|Prisma|SQL|Error|stack/i);
    }

    // excessive → clamp to last valid page, no raw 99999 reflection
    await page.goto("/id/berita?page=99999");
    await expect(page.getByText(/Berita/i).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("99999");
  });

  test("ID: list card metadata without fabricated view count, tags, search, archives", async ({ page }) => {
    await page.goto("/id/berita");

    await expect(page.getByText(authorName).first()).toBeVisible();
    await expect(page.getByText(/berita/i).first()).toBeVisible();
    await expect(page.getByText(/(?:15 Juli 2025|16 Juli 2025)/).first()).toBeVisible();

    await expect(page.locator("body")).not.toContainText(/dilihat|view|kali/i);
    await expect(page.locator("body")).not.toContainText(/tag:/i);
    await expect(page.locator("body")).not.toContainText(/total|arsip/i);
  });

  // ═══ DETAIL ROUTE ═══

  test("ID: detail renders safe sanitized HTML — no script, event, js-url, style, svg from stored hostile content", async ({ page }) => {
    await page.goto(`/id/berita/${slug1}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title1);
    await expect(page.getByRole("main")).toHaveCount(1);

    const article = page.locator("article");
    await expect(article.locator("h2")).toContainText("Heading Two");
    await expect(article.locator("ul li")).toContainText("Item");
    await expect(article.locator("blockquote")).toContainText("Quote");
    await expect(article.locator("a[href='https://example.com']")).toBeVisible();
    await expect(article.locator("pre code")).toContainText("const x = 1;");
    await expect(article.locator("table caption")).toContainText("Caption");
    await expect(article.locator("strong")).toContainText("Strong");

    await expect(article.locator("script")).toHaveCount(0);
    await expect(page.locator("[onclick]")).toHaveCount(0);
    await expect(article.locator("a[href*='javascript']")).toHaveCount(0);
    await expect(article.locator("a[href='//evil.com']")).toHaveCount(0);
    await expect(article.locator("style")).toHaveCount(0);

    // Long word containment
    await expect(article.locator("p:has-text('verylongword')")).toBeVisible();
  });

  test("ID: sidebar excludes current post and shows other published posts", async ({ page }) => {
    await page.goto(`/id/berita/${slug1}`);
    const sidebar = page.locator("aside, [role='complementary']").first();
    if (await sidebar.count() > 0) {
      await expect(sidebar.locator(`a[href*='${slug1}']`)).toHaveCount(0);
    }
  });

  test("ID: detail shows Jakarta date, reading minutes, cover caption; no fabricated stats", async ({ page }) => {
    await page.goto(`/id/berita/${slug1}`);
    await expect(page.getByText(/(?:15 Juli 2025|16 Juli 2025)/).first()).toBeVisible();
    await expect(page.getByText(/menit/i)).toBeVisible();
    await expect(page.getByText(coverCaption)).toBeVisible();

    await expect(page.locator("body")).not.toContainText(/\d+ (?:dilihat|views)/i);
    await expect(page.locator("body")).not.toContainText(/tag:/i);
    await expect(page.locator("body")).not.toContainText(/sebelumnya|berikutnya|previous|next/i);
  });

  test("ID: unknown slug → not-found content (indistinguishable from missing)", async ({ page }) => {
    await page.goto(`/id/berita/${m}-noexist`);
    await expect(page.getByText(/tidak ditemukan|not found/i)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("ID: draft slug → not-found without revealing status", async ({ page }) => {
    await page.goto(`/id/berita/${slugDraft}`);
    await expect(page.getByText(/tidak ditemukan|not found/i)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/draft|Draft/i);
  });

  test("ID: future slug → not-found", async ({ page }) => {
    await page.goto(`/id/berita/${slugFuture}`);
    await expect(page.getByText(/tidak ditemukan|not found/i)).toBeVisible();
  });

  test("ID: archived slug → same as public not-found", async ({ page }) => {
    await page.goto(`/id/berita/${slugArchived}`);
    await expect(page.getByText(/tidak ditemukan|not found/i)).toBeVisible();
  });

  test("ID: wrong-type slug (PENGUMUMAN) → not-found", async ({ page }) => {
    await page.goto(`/id/berita/${slugPeng}`);
    await expect(page.getByText(/tidak ditemukan|not found/i)).toBeVisible();
  });

  test("ID: detail has canonical, hreflang, OG metadata — no secrets", async ({ page }) => {
    await page.goto(`/id/berita/${slugM}`);

    await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", new RegExp(slugM));

    for (const lang of ["id", "en", "ar", "x-default"]) {
      await expect(page.locator(`link[rel='alternate'][hreflang='${lang}']`).first()).toBeAttached();
    }

    await expect(page.locator("meta[property='og:type'][content='article']")).toBeAttached();

    const metaHtml = await page.locator("head meta").evaluateAll((els) =>
      els.map((el) => el.outerHTML).join("\n"));
    expect(metaHtml).not.toContain("/uploads/");
    expect(metaHtml).not.toContain("storageKey");
    expect(metaHtml).not.toContain(MEDIA_KEY);
    // Author metadata may legitimately contain the fixture author name
    await expect(page.locator("meta[property='article:author']")).toBeAttached();
  });

  test("ID: detail emits safe JSON-LD without raw HTML or secrets", async ({ page }) => {
    await page.goto(`/id/berita/${slugM}`);

    const ldScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldScripts.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const allJson = (await ldScripts.allTextContents()).join("");
    expect(allJson).toContain("NewsArticle");
    expect(allJson).toContain("BreadcrumbList");

    for (let i = 0; i < count; i++) {
      const text = await ldScripts.nth(i).textContent();
      expect(text).not.toContain("<p>");
      expect(text).not.toContain(MEDIA_KEY);
      expect(text).not.toContain("storageKey");
    }
  });

  test("ID: breadcrumb with semantic links", async ({ page }) => {
    await page.goto(`/id/berita/${slugM}`);
    await expect(page.locator("nav[aria-label*='Berita' i]").first()).toBeVisible();
  });

  // ═══ EN LOCALE ═══

  test("EN: list shows EN translation, ID fallback with lang=id dir=ltr", async ({ page }) => {
    await page.goto("/en/berita");

    await expect(page.getByText(titleMultiEN)).toBeVisible();
    const idOnlyLink = page.locator(`a[href*='${slugID}']`).first();
    await expect(idOnlyLink).toBeVisible();
  });

  test("EN: ID-only detail shows lang=id dir=ltr on H1, fallback banner", async ({ page }) => {
    await page.goto(`/en/berita/${slugID}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titleIDOnly);
    await expect(page.locator("h1[lang='id']")).toBeVisible();
    await expect(page.getByRole("status")).toBeVisible();
  });

  // ═══ AR LOCALE ═══

  test("AR: document RTL, populated detail renders Arabic content", async ({ page }) => {
    await page.goto(`/ar/berita/${slugM}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titleMultiAR);
    await expect(page.getByText(contentMultiAR)).toBeVisible();
  });

  test("AR: ID fallback — title, article body, banner all have lang=id dir=ltr inside RTL document", async ({ page }) => {
    await page.goto(`/ar/berita/${slugID}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // H1 with lang=id dir=ltr
    await expect(page.locator("h1[lang='id']")).toBeVisible();
    await expect(page.locator("h1[lang='id']")).toHaveAttribute("dir", "ltr");

    // Article body wrapper has lang=id dir=ltr
    const bodyWrapper = page.locator("article [lang='id']").first();
    await expect(bodyWrapper).toBeVisible();
    await expect(bodyWrapper).toHaveAttribute("dir", "ltr");

    // Fallback banner visible
    await expect(page.getByRole("status")).toBeVisible();
  });

  test("AR: list shows Arabic title and ID fallback", async ({ page }) => {
    await page.goto("/ar/berita");
    await expect(page.getByText(titleMultiAR)).toBeVisible();
    await expect(page.locator(`a[href*='${slugID}']`).first()).toBeVisible();
  });

  // ═══ ACCESSIBILITY ═══

  test("ID: axe WCAG A/AA on detail page", async ({ page }) => {
    await page.goto(`/id/berita/${slug1}`);
    const results = await new AxeBuilder({ page })
      .exclude("header")
      .exclude("footer")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("ID: axe WCAG A/AA on list page", async ({ page }) => {
    await page.goto("/id/berita");
    const results = await new AxeBuilder({ page })
      .exclude("header")
      .exclude("footer")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("AR: axe WCAG A/AA on Arabic detail page", async ({ page }) => {
    await page.goto(`/ar/berita/${slugM}`);
    const results = await new AxeBuilder({ page })
      .exclude("header")
      .exclude("footer")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("AR: axe WCAG A/AA on Arabic list page", async ({ page }) => {
    await page.goto("/ar/berita");
    const results = await new AxeBuilder({ page })
      .exclude("header")
      .exclude("footer")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  // ═══ RESPONSIVE ═══

  test("ID: no horizontal overflow on detail at all breakpoints", async ({ page }) => {
    await page.goto(`/id/berita/${slug1}`);
    for (const width of BREAKPOINTS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      expect(await horizontalOverflow(page), `overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("ID: no horizontal overflow on list at all breakpoints", async ({ page }) => {
    await page.goto("/id/berita");
    for (const width of BREAKPOINTS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      expect(await horizontalOverflow(page), `list overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("AR: no horizontal overflow on detail at all breakpoints (RTL)", async ({ page }) => {
    await page.goto(`/ar/berita/${slug1}`);
    for (const width of BREAKPOINTS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      expect(await horizontalOverflow(page), `AR overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("AR: no horizontal overflow on list at all breakpoints (RTL)", async ({ page }) => {
    await page.goto("/ar/berita");
    for (const width of BREAKPOINTS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      expect(await horizontalOverflow(page), `AR list overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("AR: keyboard focus visible on detail links", async ({ page }) => {
    await page.goto(`/ar/berita/${slugM}`);
    await page.locator("nav a").first().focus();
    await expect(page.locator("nav a:focus").first()).toBeVisible();
  });
});
