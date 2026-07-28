import { createHash, randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Pool, type PoolClient } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (typeof DATABASE_URL !== "string" || DATABASE_URL.length === 0) {
  throw new Error("DATABASE_URL is required for Media Library browser tests.");
}

const validated = new URL(DATABASE_URL);
const LOCAL_PG_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DB_NAME = decodeURIComponent(validated.pathname.replace(/^\//, ""));
const REQUIRED_NAME_PATTERN = /(test|qa|e2e|audit)/i;
if (
  validated.protocol !== "postgresql:"
  || !LOCAL_PG_HOSTS.has(validated.hostname)
  || validated.hostname.includes("prod")
  || validated.hostname.includes("staging")
  || validated.pathname.includes("prod")
  || validated.pathname.includes("staging")
  || !REQUIRED_NAME_PATTERN.test(DB_NAME)
) {
  throw new Error(
    "Refusing non-local, non-PostgreSQL, production/staging, or non-test/qa/e2e/audit database.",
  );
}

const BREAKPOINTS = [360, 390, 768, 1024, 1440] as const;

test.describe("M3 Media Library browse QA", () => {
  test.skip(!DATABASE_URL, "Media Library browser tests require an isolated PostgreSQL database.");

  const MARKER_BASE = "m3-media-qa-browse";
  /** Fixture identity is scoped per Playwright project. Chromium and mobile must never share
   *  rows, storage keys, emails, or cleanup scope, or a combined run collides on the
   *  "User_email_key" and "Media_storageKey_key" unique constraints. */
  let marker = MARKER_BASE;
  let database!: Pool;
  /** ADMIN-visible counts and pagination are global, so only one Playwright project may hold
   *  fixtures at a time. Projects serialize on a PostgreSQL advisory lock rather than depending
   *  on a particular --workers value. */
  const FIXTURE_LOCK_KEY = 883_112_045;
  let lockClient: PoolClient | null = null;
  let adminId = "";
  let editorAId = "";
  let editorBId = "";
  let adminSessionToken = "";
  let editorASessionToken = "";
  let editorBSessionToken = "";
  // Track all auxiliary users/tokens for cleanup regardless of assertion outcome
  const auxiliaryUserIds: string[] = [];
  const auxiliaryTokens: string[] = [];

  /** Derive a deterministic 64-hex storage key for frozen storage-key shape.
   *  Each key is `YYYY/MM/<sha256 hex>.ext` — never appended with index suffixes. */
  function storageKey(ownerMarker: string, mime: "image" | "pdf", index: number): string {
    const digest = createHash("sha256").update(`${marker}-${ownerMarker}-${mime}-${index}`).digest("hex");
    const ext = mime === "image" ? "webp" : "pdf";
    return `2026/07/${digest}.${ext}`;
  }

  /** Deterministic checksum matching the same key shape. */
  function checksum(ownerMarker: string, mime: "image" | "pdf", index: number): string {
    return createHash("sha256").update(`${marker}-chk-${ownerMarker}-${mime}-${index}`).digest("hex");
  }

  /** Remove every fixture row belonging to this suite, in foreign-key-safe order. Callers hold
   *  the advisory lock, so sweeping the shared base prefix also clears rows abandoned by an
   *  aborted earlier run of the other project. Used both to make setup idempotent and to
   *  guarantee teardown after a beforeAll that failed part-way through. */
  async function purgeFixtures() {
    const prefix = `${MARKER_BASE}-%`;
    await database.query(
      `DELETE FROM "Session" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" LIKE $1)`,
      [prefix],
    ).catch(() => {});
    await database.query(`DELETE FROM "Media" WHERE "originalName" LIKE $1`, [prefix]).catch(() => {});
    await database.query(`DELETE FROM "User" WHERE "email" LIKE $1`, [prefix]).catch(() => {});
  }

  test.beforeAll(async ({}, testInfo) => {
    // Waiting for the other project to finish its whole run can exceed the default hook timeout.
    testInfo.setTimeout(300_000);
    marker = `${MARKER_BASE}-${testInfo.project.name}`;
    database = new Pool({ connectionString: DATABASE_URL });

    lockClient = await database.connect();
    await lockClient.query("SELECT pg_advisory_lock($1)", [FIXTURE_LOCK_KEY]);

    // Idempotent setup: clear any leftover rows, then insert fresh. Never early-return when
    // rows already exist — that would leave the ids and session tokens below empty for the
    // whole project run.
    await purgeFixtures();

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
      `INSERT INTO "Session" ("sessionToken", "userId", "expires") VALUES ($1, $2, $3)`,
      [adminSessionToken, adminId, expiresAt],
    );
    editorASessionToken = randomUUID();
    await database.query(
      `INSERT INTO "Session" ("sessionToken", "userId", "expires") VALUES ($1, $2, $3)`,
      [editorASessionToken, editorAId, expiresAt],
    );
    editorBSessionToken = randomUUID();
    await database.query(
      `INSERT INTO "Session" ("sessionToken", "userId", "expires") VALUES ($1, $2, $3)`,
      [editorBSessionToken, editorBId, expiresAt],
    );

    // Create 30 image rows: 15 by Editor A, 10 by Editor B, 5 by Admin
    // Use deterministic unique storage keys meeting frozen StorageKeySchema
    for (let i = 1; i <= 30; i += 1) {
      let ownerId: string;
      let ownerMarker: string;
      if (i <= 15) { ownerId = editorAId; ownerMarker = "a"; }
      else if (i <= 25) { ownerId = editorBId; ownerMarker = "b"; }
      else { ownerId = adminId; ownerMarker = "admin"; }
      const sk = storageKey(ownerMarker, "image", i);
      const cs = checksum(ownerMarker, "image", i);
      const longSuffix = i === 15 ? "-berkas-panjang-pemotongan-teks-kartu" : "";
      const filename = i === 15 ? `${marker}-image-${i.toString().padStart(2, "0")}${longSuffix}.png` : `${marker}-image-${i.toString().padStart(2, "0")}.png`;
      const isDecorative = i % 2 !== 0;
      const alt = isDecorative ? "" : `Gambar media QA nomor ${i} - dokumentasi kegiatan akademik FUSPI di lingkungan fakultas`;

      await database.query(
        `INSERT INTO "Media" ("id", "storageKey", "storageClass", "checksumSha256", "originalName",
          "mimeType", "size", "alt", "isDecorative", "width", "height", "uploaderId", "createdAt")
         VALUES ($1,$2,'PUBLIC',$3,$4,'image/webp',$5,$6,$7,$8,$9,$10,$11)`,
        [randomUUID(), sk, cs, filename, 100_000 + i * 1_000, alt, isDecorative,
         640 + (i % 3) * 80, 480 + (i % 2) * 60, ownerId, new Date(now.getTime() - i * 60_000)],
      );
    }

    // Create 5 PDF rows: 2 by Editor A, 2 by Editor B, 1 by Admin
    for (let i = 1; i <= 5; i += 1) {
      let ownerId: string;
      let ownerMarker: string;
      if (i <= 2) { ownerId = editorAId; ownerMarker = "a"; }
      else if (i <= 4) { ownerId = editorBId; ownerMarker = "b"; }
      else { ownerId = adminId; ownerMarker = "admin"; }
      const sk = storageKey(ownerMarker, "pdf", i);
      const cs = checksum(ownerMarker, "pdf", i);
      await database.query(
        `INSERT INTO "Media" ("id", "storageKey", "storageClass", "checksumSha256", "originalName",
          "mimeType", "size", "alt", "isDecorative", "width", "height", "uploaderId", "createdAt")
         VALUES ($1,$2,'PUBLIC',$3,$4,'application/pdf',$5,'',false,NULL,NULL,$6,$7)`,
        [randomUUID(), sk, cs, `${marker}-document-${i.toString().padStart(2, "0")}.pdf`,
         5_000_000 + i * 10_000, ownerId, new Date(now.getTime() - (30 + i) * 60_000)],
      );
    }
  });

  test.afterAll(async () => {
    try {
      const allUserIds = [adminId, editorAId, editorBId, ...auxiliaryUserIds].filter(Boolean);
      const allTokens = [adminSessionToken, editorASessionToken, editorBSessionToken, ...auxiliaryTokens].filter(Boolean);
      if (allTokens.length > 0) {
        await database.query(`DELETE FROM "Session" WHERE "sessionToken" = ANY($1::text[])`, [allTokens]).catch(() => {});
      }
      await database.query(`DELETE FROM "Media" WHERE "originalName" LIKE $1`, [`${marker}-%`]).catch(() => {});
      if (allUserIds.length > 0) {
        await database.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[])`, [allUserIds]).catch(() => {});
      }
      // Marker-scoped sweep catches anything the tracked id lists missed, including rows
      // created by a beforeAll that failed part-way through.
      await purgeFixtures();
    } finally {
      auxiliaryUserIds.length = 0;
      auxiliaryTokens.length = 0;
      // Release the lock only after cleanup, so the next project starts from an empty database.
      if (lockClient) {
        await lockClient.query("SELECT pg_advisory_unlock($1)", [FIXTURE_LOCK_KEY]).catch(() => {});
        lockClient.release();
        lockClient = null;
      }
      await database.end().catch(() => {});
    }
  });

  /** 1x1 deterministic PNG. Thumbnail assertions must never pass or fail based on real
   *  storage bytes or network conditions, so synthetic media requests are fulfilled locally. */
  const DETERMINISTIC_IMAGE = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  test.beforeEach(async ({ page }) => {
    // Intercept only synthetic media traffic: the next/image optimizer endpoint and the
    // /uploads/ prefix this isolated environment serves fixture bytes from.
    for (const pattern of ["**/_next/image**", "**/uploads/**"]) {
      await page.route(pattern, async (route) => {
        await route.fulfill({ status: 200, contentType: "image/png", body: DETERMINISTIC_IMAGE });
      });
    }
  });

  // Bind the auth cookie to the base URL's host instead of a hardcoded domain, so the whole e2e/m3
  // admin suite runs at one host. The editor spec must run at localhost:3004 (its mutations hit the
  // CSRF same-origin check against AUTH_URL); a cookie pinned to 127.0.0.1 would not be sent there.
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3004";
  function sessionCookie(token: string) {
    return { name: "authjs.session-token", value: token, url: BASE_URL };
  }

  async function navigateToMediaLibrary(page: Page, locale = "id") {
    await page.goto(`/${locale}/admin/media`, { waitUntil: "networkidle" });
  }

  test.describe("Session and redirect", () => {
    test("redirects unauthenticated visitor to locale login", async ({ page }) => {
      await page.goto("/id/admin/media");
      await expect(page).toHaveURL(/\/id\/login/);
      await expect(page.locator("h1")).toBeVisible();
    });

    test("redirects expired session to locale login", async ({ page }) => {
      const expiredToken = randomUUID();
      auxiliaryTokens.push(expiredToken);
      await database.query(
        `INSERT INTO "Session" ("sessionToken", "userId", "expires") VALUES ($1, $2, NOW() - INTERVAL '1 day')`,
        [expiredToken, editorAId],
      );
      await page.context().addCookies([sessionCookie(expiredToken)]);
      await page.goto("/id/admin/media");
      await expect(page).toHaveURL(/\/id\/login/);
      await expect(page.locator("h1")).toBeVisible();
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
      const bOwnerImageSuffix = "-image-16"; // Editor B's image starts here
      const bOwnerPdfSuffix = "-document-03"; // Editor B's PDF starts here
      expect(text).not.toContain(bOwnerImageSuffix);
      expect(text).not.toContain(bOwnerPdfSuffix);
      await page.context().clearCookies();
    });

    test("EDITOR pagination total is ownership-scoped", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await navigateToMediaLibrary(page);
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      // With 17 items at pageSize=24, there should be only 1 page — no pagination nav
      const nav = page.locator("nav[aria-label='Navigasi halaman pustaka media']");
      await expect(nav).not.toBeVisible();
      await page.context().clearCookies();
    });
  });

  test.describe("ALL/IMAGE/PDF filter", () => {
    test("IMAGE filter shows only images, resets to page 1, preserves locale", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);
      await page.click("a:has-text('Gambar')");
      await page.waitForURL(/kind=IMAGE/);
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const countText = await page.locator("p", { hasText: "item media" }).textContent() ?? "";
      expect(countText).toContain("30");
      expect(page.url()).toContain("kind=IMAGE");
      const activeTab = page.locator("a[aria-current='page']");
      await expect(activeTab).toContainText("Gambar");
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
      const itemsCount = await gridItems.count();
      for (let i = 0; i < itemsCount; i += 1) {
        const text2 = await gridItems.nth(i).textContent() ?? "";
        expect(text2).not.toContain("Gambar");
      }
      await page.context().clearCookies();
    });

    test("filter switching preserves the active locale EN and AR", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      // EN: navigate with filter and verify page loads
      await page.goto("/en/admin/media?kind=PDF", { waitUntil: "networkidle" });
      await page.waitForSelector("h1");
      await expect(page.locator("h1")).toContainText("Media Library");
      expect(page.url()).toContain("/en/admin/media");
      expect(page.url()).toContain("kind=PDF");

      // AR: page loads without crash
      await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("h1");
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

      await nextLink.click();
      await page.waitForURL(/page=2/);
      await page.waitForSelector("ul[aria-label='Daftar item media']");
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
    test("renders canonical page-1/ALL content for unknown, repeated, excessive, and invalid page values", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);

      const cases = [
        { query: "page=99999&kind=IMAGE", desc: "excessive page" },
        { query: "page=10001", desc: "out-of-bound page" },
        { query: "page=0", desc: "zero page" },
        { query: "page=-5", desc: "negative page" },
        { query: "page=abc", desc: "non-numeric page" },
        { query: "page=2.5", desc: "fractional page" },
        { query: "kind=OTHER", desc: "unknown kind" },
        { query: "page=1&page=2", desc: "repeated page" },
        { query: "pageSize=48&kind=IMAGE", desc: "unknown key" },
        { query: "owner=other&page=2", desc: "unknown key with valid page" },
      ];

      for (const { query, desc } of cases) {
        await page.goto(`/id/admin/media?${query}`, { waitUntil: "networkidle" });
        await page.waitForSelector("h1");
        // Must show canonical content: page 1, ALL filter, 35 items
        const countText = await page.locator("p", { hasText: "item media" }).textContent() ?? "";
        expect(countText, `${desc} — count`).toContain("35");
        // Active filter must be ALL (Semua)
        const activeTab = page.locator("a[aria-current='page']");
        await expect(activeTab, `${desc} — active filter`).toContainText("Semua");
        // No hostile input reflected
        const mainText = await page.locator("main").textContent() ?? "";
        expect(mainText, `${desc} — no 99999`).not.toContain("99999");
        expect(mainText, `${desc} — no pageSize`).not.toContain("pageSize");
        expect(mainText, `${desc} — no owner`).not.toContain("owner");
        // No technical disclosure
        expect(mainText, `${desc} — no DATABASE_URL`).not.toContain("DATABASE_URL");
        expect(mainText, `${desc} — no Prisma`).not.toContain("Prisma");
      }
      await page.context().clearCookies();
    });

    test("hostile query does not leak hidden Media to EDITOR", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await page.goto("/id/admin/media?page=99999&kind=IMAGE&pageSize=48&owner=other", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      // EDITOR-A should see only owned items (17), not all 35
      const countText = await page.locator("p", { hasText: "item media" }).textContent() ?? "";
      expect(countText).toContain("17");
      await page.context().clearCookies();
    });
  });

  test.describe("Display fields — thumbnail, filename, type, size, dimensions, alt, uploader, Jakarta time", () => {
    test("shows filename, type badge, size, dimensions, Jakarta time for an image item", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const firstItem = page.locator("ul[aria-label='Daftar item media'] li").first();
      await expect(firstItem.locator("span:has-text('Gambar')")).toBeVisible();
      const itemText = await firstItem.textContent() ?? "";
      expect(itemText).toContain(`${marker}-image`);
      expect(itemText).toMatch(/KB|MB/);
      await expect(firstItem.locator("time")).not.toBeEmpty();
      const timeText = await firstItem.locator("time").textContent() ?? "";
      expect(timeText).toContain("Juli"); // July in Indonesian
      await page.context().clearCookies();
    });

    test("shows uploader label when uploaderName is present", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await navigateToMediaLibrary(page);
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const firstItem = page.locator("ul[aria-label='Daftar item media'] li").first();
      await expect(firstItem.locator("p", { hasText: "Diunggah oleh" })).toBeVisible();
      await page.context().clearCookies();
    });

    test("both decorative and informative states are proven", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const items = page.locator("ul[aria-label='Daftar item media'] li");
      const allText = await items.allTextContents();

      const hasDecorative = allText.some((t) => t.includes("Dekoratif"));
      const hasAlt = allText.some((t) => t.includes("Teks alternatif:"));
      expect(hasDecorative, "must find at least one decorative image").toBe(true);
      expect(hasAlt, "must find at least one informative image with alt text").toBe(true);
      await page.context().clearCookies();
    });

    test("long filename wraps without horizontal overflow", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      // The long-filename row (image-15) is on page 1
      await page.goto("/id/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const longItem = page.locator("ul[aria-label='Daftar item media'] li", {
        hasText: "berkas-panjang",
      });
      await expect(longItem).toBeVisible();

      // Verify no horizontal overflow on the entire page
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
          || document.body.scrollWidth > document.body.clientWidth;
      });
      expect(hasOverflow).toBe(false);
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

    test("displays EN copy with correct labels: Image (not Images) and PDF", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/en/admin/media", { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toContainText("Media Library");
      await expect(page.locator("a", { hasText: "All" })).toBeVisible();
      // Frozen copy uses singular "Image", not "Images"
      await expect(page.locator("a", { hasText: "Image" })).toBeVisible();
      await expect(page.locator("a", { hasText: "PDF" })).toBeVisible();
      await page.context().clearCookies();
    });

    test("displays AR copy, has genuine Arabic text, and does not mirror Media thumbnails", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
      await expect(page.locator("h1")).not.toBeEmpty();

      const allLink = page.locator("a", { hasText: /الكل|جميع/ });
      await expect(allLink).toBeVisible();

      // Images must not be mirrored in RTL
      const imgElements = page.locator("ul li img");
      const imgCount = await imgElements.count();
      for (let i = 0; i < Math.min(imgCount, 3); i += 1) {
        const transform = await imgElements.nth(i).evaluate((el) => getComputedStyle(el).transform);
        expect(transform).not.toContain("matrix(-1");
      }
      await page.context().clearCookies();
    });

    test("pagination chevrons use rtl:rotate-180 for Arabic", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul li");

      const nextLink = page.locator("nav a[aria-label='الصفحة التالية']");
      if (await nextLink.isVisible().catch(() => false)) {
        const svgClass = await nextLink.locator("svg").first().getAttribute("class") ?? "";
        expect(svgClass).toContain("rtl:rotate-180");
      }
      await page.context().clearCookies();
    });

    test("locale-aware date/number formatting", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);

      // ID: month in Indonesian
      await page.goto("/id/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");
      const idText = await page.locator("main").textContent() ?? "";
      expect(idText).toContain("Juli");

      // AR: time element visible
      await page.goto("/ar/admin/media?kind=IMAGE", { waitUntil: "networkidle" });
      await page.waitForSelector("ul li time");
      const arTime = await page.locator("ul li time").first().textContent() ?? "";
      expect(arTime.length).toBeGreaterThan(0);

      await page.context().clearCookies();
    });
  });

  test.describe("axe WCAG A/AA — ID and AR", () => {
    const ALL_AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

    test("passes axe WCAG A/AA on populated ID Media page for ADMIN", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const results = await new AxeBuilder({ page }).withTags(ALL_AXE_TAGS).analyze();
      expect(results.violations).toEqual([]);
      await page.context().clearCookies();
    });

    test("passes axe WCAG A/AA on populated AR Media page for ADMIN", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/ar/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul li");

      const results = await new AxeBuilder({ page }).withTags(ALL_AXE_TAGS).analyze();
      expect(results.violations).toEqual([]);
      await page.context().clearCookies();
    });

    test("passes axe WCAG A/AA on populated Media page for EDITOR", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const results = await new AxeBuilder({ page }).withTags(ALL_AXE_TAGS).analyze();
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

    test("keyboard focus order accounts for skip link and verifies visible focus indicator", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      async function expectVisibleFocusIndicator(locator: ReturnType<typeof page.locator>) {
        await expect(locator).toBeFocused();
        const hasVisibleFocus = await locator.evaluate((element) => {
          const style = getComputedStyle(element);
          const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
          const boxShadow = style.boxShadow !== "none" && !style.boxShadow.includes("0 0 0 0");
          return outline || boxShadow;
        });
        expect(hasVisibleFocus, "focused control must have a visible focus indicator").toBe(true);
      }

      await page.keyboard.press("Tab");
      const skipLink = page.locator("#skip-link, [href='#main']").first();
      await expectVisibleFocusIndicator(skipLink);

      await page.keyboard.press("Tab");
      const imagePolicy = page.getByRole("button", { name: "Gambar", exact: true });
      await expectVisibleFocusIndicator(imagePolicy);

      await page.keyboard.press("Tab");
      const pdfPolicy = page.getByRole("button", { name: "PDF", exact: true });
      await expectVisibleFocusIndicator(pdfPolicy);

      await page.keyboard.press("Tab");
      const imageInput = page.getByLabel("Berkas gambar", { exact: true });
      await expectVisibleFocusIndicator(imageInput);

      await page.keyboard.press("Tab");
      const uploadButton = page.getByRole("button", { name: "Unggah", exact: true });
      await expectVisibleFocusIndicator(uploadButton);

      await page.keyboard.press("Tab");
      const firstFilter = page.locator("nav[aria-label='Saring media berdasarkan jenis'] a").first();
      await expectVisibleFocusIndicator(firstFilter);
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
    test("does not leak session token, storageKey, checksum, DATABASE_URL, or Prisma details in DOM", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("ul[aria-label='Daftar item media']");

      const text = await page.locator("main").innerHTML();

      for (const value of [
        adminSessionToken, editorASessionToken, editorBSessionToken,
        "storageKey", "checksumSha256", "storageClass", "uploaderId",
        "DATABASE_URL", "Prisma", "ECONNREFUSED", "at Object.", "@example.invalid",
      ]) {
        expect(text, `must not leak: ${value}`).not.toContain(value);
      }
      await page.context().clearCookies();
    });

    test("does not leak technical error when visiting hostile query page", async ({ page }) => {
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
    test("shows empty state when owner has no items", async ({ page }) => {
      const emptyUserId = randomUUID();
      auxiliaryUserIds.push(emptyUserId);

      await database.query(
        `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "mustChangePassword", "updatedAt")
         VALUES ($1, $2, $3, $4, 'EDITOR', false, NOW())`,
        [emptyUserId, "Empty Owner QA", `${marker}-empty@example.invalid`, "irrelevant-bcrypt-hash"],
      );
      const emptyToken = randomUUID();
      auxiliaryTokens.push(emptyToken);
      await database.query(
        `INSERT INTO "Session" ("sessionToken", "userId", "expires") VALUES ($1, $2, $3)`,
        [emptyToken, emptyUserId, new Date(Date.now() + 8 * 3600_000)],
      );

      await page.context().addCookies([sessionCookie(emptyToken)]);
      await page.goto("/id/admin/media", { waitUntil: "networkidle" });
      await page.waitForSelector("h1");

      await expect(page.locator("h2", { hasText: "Belum ada media" })).toBeVisible();
      // Empty state must NOT have role="alert"
      const emptyHeading = page.locator("h2", { hasText: "Belum ada media" });
      await expect(emptyHeading).not.toHaveAttribute("role", "alert");
      await page.context().clearCookies();
    });
  });
});
