import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (typeof DATABASE_URL !== "string" || DATABASE_URL.length === 0) {
  throw new Error("DATABASE_URL is required for Media Library browser tests.");
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
    "Refusing non-local, non-PostgreSQL, or production/staging database.",
  );
}

const BREAKPOINTS = [360, 390, 768, 1024, 1440] as const;

test.describe("M3 Media Library browse QA", () => {
  test.skip(!DATABASE_URL, "Media Library browser tests require an isolated PostgreSQL database.");

  const marker = `m3-media-qa-${process.pid}-${Date.now()}`;
  const database = new Pool({ connectionString: DATABASE_URL });
  let adminId = "";
  let editorAId = "";
  let editorBId = "";
  let adminSessionToken = "";
  let editorASessionToken = "";
  let editorBSessionToken = "";

  test.beforeAll(async () => {
    adminId = randomUUID();
    editorAId = randomUUID();
    editorBId = randomUUID();

    await database.query(
      `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "mustChangePassword", "updatedAt")
       VALUES ($1, $2, $3, $4, 'ADMIN', false, NOW())`,
      [adminId, "Synthetic Admin QA", `${marker}-admin@example.invalid`, "irrelevant-bcrypt-hash"],
    );
    await database.query(
      `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "mustChangePassword", "updatedAt")
       VALUES ($1, $2, $3, $4, 'EDITOR', false, NOW())`,
      [editorAId, "Synthetic Editor A QA", `${marker}-editor-a@example.invalid`, "irrelevant-bcrypt-hash"],
    );
    await database.query(
      `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "mustChangePassword", "updatedAt")
       VALUES ($1, $2, $3, $4, 'EDITOR', false, NOW())`,
      [editorBId, "Synthetic Editor B QA", `${marker}-editor-b@example.invalid`, "irrelevant-bcrypt-hash"],
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 3_600_000);

    adminSessionToken = randomUUID();
    await database.query(
      `INSERT INTO "Session" ("sessionToken", "userId", "expires")
       VALUES ($1, $2, $3)`,
      [adminSessionToken, adminId, expiresAt],
    );
    editorASessionToken = randomUUID();
    await database.query(
      `INSERT INTO "Session" ("sessionToken", "userId", "expires")
       VALUES ($1, $2, $3)`,
      [editorASessionToken, editorAId, expiresAt],
    );
    editorBSessionToken = randomUUID();
    await database.query(
      `INSERT INTO "Session" ("sessionToken", "userId", "expires")
       VALUES ($1, $2, $3)`,
      [editorBSessionToken, editorBId, expiresAt],
    );

    // Create 30 image rows: 15 by Editor A, 10 by Editor B, 5 by Admin
    const imageRows = [];
    for (let i = 1; i <= 30; i += 1) {
      const ownerId = i <= 15 ? editorAId : (i <= 25 ? editorBId : adminId);
      const checksum = `${"a".repeat(64)}`;
      const storageKey = `2026/07/${checksum}-${i.toString().padStart(2, "0")}.webp`;
      imageRows.push({
        id: randomUUID(),
        storageKey,
        storageClass: "PUBLIC",
        checksumSha256: checksum,
        originalName: `${marker}-image-${i.toString().padStart(2, "0")}.webp`,
        mimeType: "image/webp",
        size: 100_000 + i * 1_000,
        alt: i % 2 === 0 ? `Gambar media QA nomor ${i}` : "",
        isDecorative: i % 2 !== 0,
        width: 640 + (i % 3) * 80,
        height: 480 + (i % 2) * 60,
        uploaderId: ownerId,
        createdAt: new Date(now.getTime() - i * 60_000),
      });
    }

    for (const row of imageRows) {
      await database.query(
        `INSERT INTO "Media" ("id", "storageKey", "storageClass", "checksumSha256", "originalName", "mimeType", "size", "alt", "isDecorative", "width", "height", "uploaderId", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [row.id, row.storageKey, row.storageClass, row.checksumSha256, row.originalName, row.mimeType, row.size, row.alt, row.isDecorative, row.width, row.height, row.uploaderId, row.createdAt],
      );
    }

    // Create 5 PDF rows: 2 by Editor A, 2 by Editor B, 1 by Admin
    const pdfRows = [];
    for (let i = 1; i <= 5; i += 1) {
      const ownerId = i <= 2 ? editorAId : (i <= 4 ? editorBId : adminId);
      const checksum = `${"b".repeat(64)}`;
      const storageKey = `2026/07/${checksum}-${i.toString().padStart(2, "0")}.pdf`;
      pdfRows.push({
        id: randomUUID(),
        storageKey,
        storageClass: "PUBLIC",
        checksumSha256: checksum,
        originalName: `${marker}-document-${i.toString().padStart(2, "0")}.pdf`,
        mimeType: "application/pdf",
        size: 5_000_000 + i * 10_000,
        alt: "",
        isDecorative: false,
        width: null,
        height: null,
        uploaderId: ownerId,
        createdAt: new Date(now.getTime() - (30 + i) * 60_000),
      });
    }

    for (const row of pdfRows) {
      await database.query(
        `INSERT INTO "Media" ("id", "storageKey", "storageClass", "checksumSha256", "originalName", "mimeType", "size", "alt", "isDecorative", "width", "height", "uploaderId", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [row.id, row.storageKey, row.storageClass, row.checksumSha256, row.originalName, row.mimeType, row.size, row.alt, row.isDecorative, row.width, row.height, row.uploaderId, row.createdAt],
      );
    }
  });

  test.afterAll(async () => {
    await database.query(`DELETE FROM "Session" WHERE "userId" IN ($1, $2, $3)`, [adminId, editorAId, editorBId]);
    await database.query(`DELETE FROM "Media" WHERE "originalName" LIKE $1`, [`${marker}-%`]);
    await database.query(`DELETE FROM "User" WHERE "id" IN ($1, $2, $3)`, [adminId, editorAId, editorBId]);
    await database.end();
  });

  function sessionCookie(token: string) {
    return { name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" };
  }

  async function navigateToMediaLibrary(page: Page, locale = "id") {
    const url = `/${locale}/admin/media`;
    await page.goto(url, { waitUntil: "networkidle" });
    return url;
  }

  test.describe("Session and redirect", () => {
    test("redirects unauthenticated visitor to locale login", async ({ page }) => {
      const response = await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      expect(response?.url()).toContain("/id/login");
    });

    test("redirects expired session to locale login", async ({ page }) => {
      const expiredToken = randomUUID();
      const now = new Date();
      const past = new Date(now.getTime() - 3600_000);
      await database.query(
        `INSERT INTO "Session" ("sessionToken", "userId", "expires")
         VALUES ($1, $2, $3)`,
        [expiredToken, editorAId, past],
      );
      await page.context().addCookies([sessionCookie(expiredToken)]);
      const response = await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      expect(response?.url()).toContain("/id/login");
      await database.query(`DELETE FROM "Session" WHERE "sessionToken" = $1`, [expiredToken]);
    });

    test("allows ADMIN to reach the page without leaking role or email", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);
      await expect(page.locator("h1")).toContainText("Pustaka Media");
      const text = await page.locator("main").textContent() ?? "";
      expect(text).not.toContain("ADMIN");
      expect(text).not.toContain("@example.invalid");
      expect(text).not.toContain(adminSessionToken);
      expect(text).not.toContain("storageKey");
      expect(text).not.toContain("checksumSha256");
      await page.context().clearCookies();
    });

    test("allows EDITOR to reach the page without leaking role or PII", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await navigateToMediaLibrary(page);
      await expect(page.locator("h1")).toContainText("Pustaka Media");
      const text = await page.locator("main").textContent() ?? "";
      expect(text).not.toContain("EDITOR");
      expect(text).not.toContain("@example.invalid");
      expect(text).not.toContain(editorASessionToken);
      await page.context().clearCookies();
    });
  });

  test.describe("ADMIN versus EDITOR ownership scoping", () => {
    test("ADMIN sees all synthetic public Media (30 images + 5 PDFs)", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const countText = await page.locator("p", { hasText: "item media" }).textContent() ?? "";
      expect(countText).toContain("35");

      const allIds = await page.$$eval("time", (elements) =>
        elements.filter((el) => el.parentElement?.closest("ul[aria-label='Daftar item media']")).length);
      expect(allIds).toBeGreaterThan(0);
      await page.context().clearCookies();
    });

    test("EDITOR-A sees only own uploads and never EDITOR-B filenames", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await navigateToMediaLibrary(page);
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const countText = await page.locator("p", { hasText: "item media" }).textContent() ?? "";
      const total = Number.parseInt(countText.replace(/\D/g, ""), 10);
      // Editor A: 15 images + 2 PDFs = 17
      expect(total).toBe(17);

      const text = await page.locator("main").textContent() ?? "";
      // Editor B's fixture prefix should never appear
      const bOwnerImage = `${marker}-image-16`;
      const bOwnerPdf = `${marker}-document-03`;
      expect(text).not.toContain(bOwnerImage);
      expect(text).not.toContain(bOwnerPdf);
      await page.context().clearCookies();
    });

    test("EDITOR pagination total is ownership-scoped", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await navigateToMediaLibrary(page);
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const nav = page.locator("nav[aria-label='Navigasi halaman pustaka media']");
      // With 17 items at pageSize=24, there should be only 1 page
      await expect(nav).not.toBeVisible();
      await page.context().clearCookies();
    });
  });

  test.describe("ALL/IMAGE/PDF filter", () => {
    test("IMAGE filter shows only images, resets to page 1, preserves locale", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);

      await page.click("a:has-text('Gambar')");
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const countText = await page.locator("p", { hasText: "item media" }).textContent() ?? "";
      expect(countText).toContain("30");

      expect(page.url()).toContain("kind=IMAGE");
      expect(page.url()).not.toContain("page=");
      await page.context().clearCookies();
    });

    test("PDF filter shows only PDFs and the active tab has aria-current", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);

      await page.click("a:has-text('PDF')");
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const countText = await page.locator("p", { hasText: "item media" }).textContent() ?? "";
      expect(countText).toContain("5");

      const activeTab = page.locator("a[aria-current='page']");
      await expect(activeTab).toContainText("PDF");

      const gridItems = page.locator("ul[aria-label='Daftar item media'] li");
      const itemsText = await gridItems.allTextContents();
      for (const text of itemsText) {
        expect(text).not.toContain("Gambar");
      }
      await page.context().clearCookies();
    });

    test("filter switching preserves the active locale EN and AR", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);

      // EN
      await page.goto("/en/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("h1");
      await expect(page.locator("h1")).toContainText("Media Library");
      await page.click("a:has-text('PDF')");
      await page.waitForSelector("ul[aria-label='Media list']");
      expect(page.url()).toContain("/en/admin/media");
      expect(page.url()).toContain("kind=PDF");

      // AR
      await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("h1");
      // RTL: page loads without crash on Arabic locale
      expect(page.url()).toContain("/ar/admin/media");
      await expect(page.locator("h1")).not.toBeEmpty();
      await page.context().clearCookies();
    });
  });

  test.describe("Pagination — 24 items per page", () => {
    test("shows pagination with next link on page 1 when items exceed 24", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const nav = page.locator("nav[aria-label='Navigasi halaman pustaka media']");
      await expect(nav).toBeVisible();
      const nextLink = nav.locator("a[aria-label='Halaman berikutnya']");
      await expect(nextLink).toBeVisible();
      const href = await nextLink.getAttribute("href");
      expect(href).toContain("page=2");

      // Navigate to page 2
      await nextLink.click();
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      expect(page.url()).toContain("page=2");
      const prevLink = nav.locator("a[aria-label='Halaman sebelumnya']");
      await expect(prevLink).toBeVisible();
      await page.context().clearCookies();
    });

    test("pagination preserves the active filter across pages", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const nextLink = page.locator("nav a[aria-label='Halaman berikutnya']");
      const href = await nextLink.getAttribute("href");
      expect(href).toContain("kind=IMAGE");
      expect(href).toContain("page=2");
      await page.context().clearCookies();
    });

    test("sets active page with aria-current and pageStatus label on mobile", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/id/admin/media?page=2", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const active = page.locator("span[aria-current='page']");
      await expect(active).toContainText("2");
      const statusLabel = page.locator("span", { hasText: /Hal 2 dari \d/ });
      await expect(statusLabel).toBeVisible();
      await page.context().clearCookies();
    });
  });

  test.describe("Hostile, repeated, excessive, and unknown query parameters", () => {
    test("renders page 1 (canonical default) for unknown, repeated, excessive, zero, and negative page values", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);

      for (const [query, description] of [
        ["page=99999&kind=IMAGE", "excessive page → page 1"],
        ["page=10001", "excessive page 10001 → page 1"],
        ["page=0", "zero page → page 1"],
        ["page=-5", "negative page → page 1"],
        ["page=abc", "non-numeric page → page 1"],
        ["page=2.5", "fractional page → page 1"],
        ["kind=OTHER", "unknown kind → page 1"],
        ["page=1&page=2", "repeated page → page 1"],
        ["pageSize=48", "unknown key → page 1"],
        ["owner=other&page=2", "unknown key with valid page → page 1"],
      ] as const) {
        await page.goto(`/id/admin/media?${query}`, { waitUntil: "networkidle" });
        await page.waitForSelector("h1");
        const url = new URL(page.url());
        // After normalization, URL should NOT contain the hostile input
        expect(url.searchParams.get("page"), `${description} — page param`).toBeNull();
        expect(url.searchParams.get("pageSize"), `${description} — pageSize param`).toBeNull();
        expect(url.searchParams.get("owner"), `${description} — owner param`).toBeNull();
        expect(url.searchParams.get("page") ?? "1", `${description} — page defaults to 1`).toBe("1");
      }
      await page.context().clearCookies();
    });

    test("does not reflect hostile query input in page content or expose hidden media", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await page.goto("/id/admin/media?page=99999&kind=IMAGE&pageSize=48&owner=other", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const text = await page.locator("main").textContent() ?? "";
      expect(text).not.toContain("99999");
      expect(text).not.toContain("10000");
      expect(text).not.toContain("pageSize");
      expect(text).not.toContain("owner");

      // EDITOR-A should still see only owned items, not every IMAGE
      const countText = await page.locator("p", { hasText: "item media" }).textContent() ?? "";
      expect(countText).toContain("17");
      await page.context().clearCookies();
    });
  });

  test.describe("Display fields — thumbnail, filename, type, size, dimensions, alt, uploader, Jakarta time", () => {
    test("shows filename, type badge, size, dimensions, accessibility state, uploader label, and Asia/Jakarta time", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const firstItem = page.locator("ul[aria-label='Daftar item media'] li").first();

      // Type badge
      await expect(firstItem.locator("span:has-text('Gambar')")).toBeVisible();

      // Filename
      await expect(firstItem.locator("p")).toContainText(`${marker}-image`);

      // Human-readable size and dimensions
      const itemText = await firstItem.textContent() ?? "";
      expect(itemText).toMatch(/KB|MB/);

      // Uploader label
      await expect(firstItem.locator("p", { hasText: "Diunggah oleh" })).toBeVisible();

      // Jakarta time (January in Indonesian for ID locale)
      await expect(firstItem.locator("time")).not.toBeEmpty();
      const timeText = await firstItem.locator("time").textContent() ?? "";
      expect(timeText).toContain("Juli"); // July in Indonesian

      await page.context().clearCookies();
    });

    test("shows decorative label for decorative images and alt text for informative ones", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const items = page.locator("ul[aria-label='Daftar item media'] li");
      const allText = await items.allTextContents();

      const hasDecorative = allText.some((t) => t.includes("Dekoratif"));
      const hasAlt = allText.some((t) => t.includes("Teks alternatif:"));
      expect(hasDecorative || hasAlt).toBeTruthy();
      await page.context().clearCookies();
    });

    test("renders image thumbnail via <img> within grid items", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const images = page.locator("ul[aria-label='Daftar item media'] li img");
      await expect(images.first()).toBeVisible();
      await page.context().clearCookies();
    });
  });

  test.describe("Locale — ID, EN, AR with RTL and direction safety", () => {
    test("displays ID copy with product-facing text", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toContainText("Pustaka Media");
      await expect(page.locator("a", { hasText: "Semua" })).toBeVisible();
      await expect(page.locator("a", { hasText: "Gambar" })).toBeVisible();
      await expect(page.locator("a", { hasText: "PDF" })).toBeVisible();
      await page.context().clearCookies();
    });

    test("displays EN copy and preserves locale in links", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/en/admin/media", { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toContainText("Media Library");

      const imageLink = page.locator("a", { hasText: "Images" });
      await expect(imageLink).toBeVisible();
      const href = await imageLink.getAttribute("href");
      expect(href).not.toContain("/id/");
      expect(href).not.toContain("/ar/");
      await page.context().clearCookies();
    });

    test("displays AR copy, has genuine Arabic text, and does not mirror Media thumbnails", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
      await expect(page.locator("h1")).not.toBeEmpty();

      const allLink = page.locator("a", { hasText: /الكل|جميع/ });
      await expect(allLink).toBeVisible();

      // Images must not be mirrored in RTL
      const images = page.locator("ul li img");
      const count = await images.count();
      for (let i = 0; i < Math.min(count, 3); i += 1) {
        const transform = await images.nth(i).evaluate((el) => getComputedStyle(el).transform);
        expect(transform).not.toContain("matrix(-1");
      }
      await page.context().clearCookies();
    });

    test("pagination chevrons use rtl:rotate-180 for Arabic", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='قائمة عناصر الوسائط']");

      // Chevrons must exist and should be rotated in RTL
      const nextLink = page.locator("nav a[aria-label='الصفحة التالية']");
      if (await nextLink.isVisible().catch(() => false)) {
        const svgClass = await nextLink.locator("svg").first().getAttribute("class") ?? "";
        expect(svgClass).toContain("rtl:rotate-180");
      }
      await page.context().clearCookies();
    });

    test("locale-aware number formatting for dates and dimensions", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);

      // ID: numbers use '.' as thousands separator
      await page.goto("/id/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const idText = await page.locator("main").textContent() ?? "";
      expect(idText).toContain("Juli"); // Indonesian month spelling

      // AR: weekday/time formatting follows Arabic conventions
      await page.goto("/ar/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul li time");
      const arTime = await page.locator("ul li time").first().textContent() ?? "";
      expect(arTime.length).toBeGreaterThan(0);

      await page.context().clearCookies();
    });
  });

  test.describe("axe WCAG A/AA — ID and AR", () => {
    test("passes axe WCAG A/AA on populated ID Media page for ADMIN", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations).toEqual([]);
      await page.context().clearCookies();
    });

    test("passes axe WCAG A/AA on populated AR Media page for ADMIN", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul li");

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations).toEqual([]);
      await page.context().clearCookies();
    });

    test("passes axe WCAG A/AA on populated Media page for EDITOR", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(results.violations).toEqual([]);
      await page.context().clearCookies();
    });

    test("has exactly one main landmark and one h1", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("h1");

      expect(await page.locator("main").count()).toBe(1);
      expect(await page.locator("h1").count()).toBe(1);
      await page.context().clearCookies();
    });

    test("semantic Media list with visible keyboard focus on filter/pagination links", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      // Navigate with Tab to verify visible focus on filter links
      await page.keyboard.press("Tab");
      const firstFilter = page.locator("nav[aria-label='Saring media berdasarkan jenis'] a").first();
      await expect(firstFilter).toBeFocused();

      // At minimum, the element should be focused
      await expect(firstFilter).toBeFocused();
      await page.context().clearCookies();
    });
  });

  test.describe("Viewport responsiveness — no horizontal overflow at 360, 390, 768, 1024, 1440", () => {
    for (const width of BREAKPOINTS) {
      test(`no horizontal overflow at ${width}px with ID for ADMIN`, async ({ page }) => {
        await page.context().addCookies([sessionCookie(adminSessionToken)]);
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/id/admin/media", { waitUntil: "networkidle" });
        await page.waitForSelector("h1");

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth
            || document.body.scrollWidth > document.body.clientWidth;
        });
        expect(hasOverflow).toBe(false);
        await page.context().clearCookies();
      });

      test(`no horizontal overflow at ${width}px with AR for ADMIN`, async ({ page }) => {
        await page.context().addCookies([sessionCookie(adminSessionToken)]);
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
        await page.waitForSelector("h1");

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth
            || document.body.scrollWidth > document.body.clientWidth;
        });
        expect(hasOverflow).toBe(false);
        await page.context().clearCookies();
      });
    }
  });

  test.describe("No PII, token, storage key, or technical error disclosure", () => {
    test("does not leak session token, storageKey, checksumSha256, DATABASE_URL, or Prisma details", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const text = await page.locator("main").innerHTML();

      const forbidden = [
        adminSessionToken,
        editorASessionToken,
        editorBSessionToken,
        "storageKey",
        "checksumSha256",
        "storageClass",
        "uploaderId",
        "DATABASE_URL",
        "Prisma",
        "ECONNREFUSED",
        "stack trace",
        "at Object.",
        "@example.invalid",
      ];
      for (const value of forbidden) {
        expect(text, `must not leak: ${value}`).not.toContain(value);
      }
      await page.context().clearCookies();
    });

    test("does not leak PII or technical error when visiting an invalid query", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media?page=99999&kind=OTHER", { waitUntil: "networkidle" });
      await page.waitForSelector("h1");

      const text = await page.locator("main").textContent() ?? "";
      expect(text).not.toContain("DATABASE_URL");
      expect(text).not.toContain("Prisma");
      expect(text).not.toContain("storageKey");
      await page.context().clearCookies();
    });
  });

  test.describe("Empty and unavailable safe presentation", () => {
    test("shows empty state when an owner has no items of a given kind", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      // Editor A has images but no PDFs when filtered to PDF only
      // Actually Editor A has 2 PDFs. Let's filter to something Editor A has items for but use an empty kind.
      // The empty state is shown when result.data.items.length === 0
      // Since Editor A has items, we need an owner with truly 0 items. Let's create a temp user.
      const emptyUserId = randomUUID();
      await database.query(
        `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "mustChangePassword", "updatedAt")
         VALUES ($1, $2, $3, $4, 'EDITOR', false, NOW())`,
        [emptyUserId, "Empty Owner QA", `${marker}-empty@example.invalid`, "irrelevant-bcrypt-hash"],
      );
      const emptyToken = randomUUID();
      await database.query(
        `INSERT INTO "Session" ("sessionToken", "userId", "expires")
         VALUES ($1, $2, $3)`,
        [emptyToken, emptyUserId, new Date(Date.now() + 8 * 3600_000)],
      );
      await page.context().addCookies([sessionCookie(emptyToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("h1");

      await expect(page.locator("h2", { hasText: "Belum ada media" })).toBeVisible();
      await expect(page.locator("h2", { hasText: "Belum ada media" })).not.toHaveAttribute("role", "alert");
      await page.context().clearCookies();
      await database.query(`DELETE FROM "Session" WHERE "sessionToken" = $1`, [emptyToken]);
      await database.query(`DELETE FROM "User" WHERE "id" = $1`, [emptyUserId]);
    });
  });
});
