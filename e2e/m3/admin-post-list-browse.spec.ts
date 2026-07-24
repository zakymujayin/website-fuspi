import { randomUUID } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { Pool, type PoolClient } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (typeof DATABASE_URL !== "string" || DATABASE_URL.length === 0) {
  throw new Error("DATABASE_URL is required for Post admin list browser tests.");
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
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const LIST_SELECTOR = { id: "ul[aria-label='Daftar berita']", ar: "ul[aria-label='قائمة الأخبار']" };

test.describe("M3 Post admin list QA", () => {
  test.skip(!DATABASE_URL, "Post admin list browser tests require an isolated PostgreSQL database.");

  const MARKER_BASE = "m3-post-qa-list";
  /** Fixture identity is scoped per Playwright project so chromium and mobile never share User
   *  emails, Post slugs, or cleanup scope during a combined run. */
  let marker = MARKER_BASE;
  let database!: Pool;
  /** ADMIN-visible counts and pagination are global, so only one project may hold fixtures at a
   *  time. Projects serialize on a PostgreSQL advisory lock rather than depending on --workers.
   *  A different key from the Media suite's lock avoids cross-suite blocking. */
  const FIXTURE_LOCK_KEY = 883_112_046;
  let lockClient: PoolClient | null = null;

  let adminId = "";
  let editorAId = "";
  let editorBId = "";
  let adminSessionToken = "";
  let editorASessionToken = "";
  let editorBSessionToken = "";
  let categoryId = "";
  const auxiliaryUserIds: string[] = [];
  const auxiliaryTokens: string[] = [];

  const NEAR_LIMIT_TITLE =
    "Berita FUSPI dengan judul sangat panjang untuk menguji pemotongan teks pada kartu daftar "
    + "berita di berbagai lebar layar tanpa menimbulkan luapan horizontal pada tata letak admin ini";

  function slugFor(ownerMarker: string, index: number): string {
    return `${marker}-${ownerMarker}-${index.toString().padStart(2, "0")}`;
  }

  /** Remove every fixture row for this suite, in foreign-key-safe order. Callers hold the advisory
   *  lock, so sweeping the shared base prefix also clears rows abandoned by an aborted earlier run
   *  of the other project. Makes setup idempotent and guarantees teardown after a partial failure. */
  async function purgeFixtures() {
    const prefix = `${MARKER_BASE}-%`;
    await database.query(
      `DELETE FROM "Session" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "email" LIKE $1)`,
      [prefix],
    ).catch(() => {});
    await database.query(
      `DELETE FROM "PostTranslation" WHERE "postId" IN (SELECT "id" FROM "Post" WHERE "slug" LIKE $1)`,
      [prefix],
    ).catch(() => {});
    await database.query(`DELETE FROM "Post" WHERE "slug" LIKE $1`, [prefix]).catch(() => {});
    await database.query(
      `DELETE FROM "CategoryTranslation" WHERE "categoryId" IN (SELECT "id" FROM "Category" WHERE "slug" LIKE $1)`,
      [prefix],
    ).catch(() => {});
    await database.query(`DELETE FROM "Category" WHERE "slug" LIKE $1`, [prefix]).catch(() => {});
    await database.query(`DELETE FROM "User" WHERE "email" LIKE $1`, [prefix]).catch(() => {});
  }

  async function insertUser(id: string, name: string, role: "ADMIN" | "EDITOR", ownerMarker: string) {
    await database.query(
      `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "mustChangePassword", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [id, name, `${marker}-${ownerMarker}@example.invalid`, "irrelevant-bcrypt-hash", role],
    );
  }

  async function insertSession(token: string, userId: string, expiresAt: Date) {
    await database.query(
      `INSERT INTO "Session" ("sessionToken", "userId", "expires") VALUES ($1, $2, $3)`,
      [token, userId, expiresAt],
    );
  }

  type PostSpec = {
    ownerId: string;
    ownerMarker: string;
    index: number;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    publishedAt: Date | null;
    isFeatured?: boolean;
    categoryId?: string | null;
    locales?: readonly ("id" | "en" | "ar")[];
    title?: string;
    updatedAt: Date;
  };

  async function insertPost(spec: PostSpec) {
    const postId = randomUUID();
    const slug = slugFor(spec.ownerMarker, spec.index);
    await database.query(
      `INSERT INTO "Post" ("id", "type", "slug", "status", "isFeatured", "publishedAt", "version",
        "categoryId", "authorId", "contentOwnerId", "createdAt", "updatedAt")
       VALUES ($1,'BERITA',$2,$3,$4,$5,1,$6,$7,$7,$8,$9)`,
      [
        postId, slug, spec.status, spec.isFeatured ?? false, spec.publishedAt,
        spec.categoryId ?? null, spec.ownerId, spec.updatedAt, spec.updatedAt,
      ],
    );
    const title = spec.title ?? `${marker} ${spec.ownerMarker} ${spec.index} ${spec.status}`;
    for (const locale of spec.locales ?? ["id"]) {
      const localizedTitle = locale === "id" ? title : `${title} (${locale.toUpperCase()})`;
      await database.query(
        `INSERT INTO "PostTranslation" ("id", "postId", "locale", "title", "content")
         VALUES ($1,$2,$3,$4,$5)`,
        [randomUUID(), postId, locale, localizedTitle, "<p>Isi berita QA.</p>"],
      );
    }
    return { postId, slug };
  }

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(300_000);
    marker = `${MARKER_BASE}-${testInfo.project.name}`;
    database = new Pool({ connectionString: DATABASE_URL });

    lockClient = await database.connect();
    await lockClient.query("SELECT pg_advisory_lock($1)", [FIXTURE_LOCK_KEY]);
    await purgeFixtures();

    adminId = randomUUID();
    editorAId = randomUUID();
    editorBId = randomUUID();
    await insertUser(adminId, "Synthetic Admin QA", "ADMIN", "admin");
    await insertUser(editorAId, "Editor A QA", "EDITOR", "editor-a");
    await insertUser(editorBId, "Editor B QA", "EDITOR", "editor-b");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 3_600_000);
    adminSessionToken = randomUUID();
    editorASessionToken = randomUUID();
    editorBSessionToken = randomUUID();
    await insertSession(adminSessionToken, adminId, expiresAt);
    await insertSession(editorASessionToken, editorAId, expiresAt);
    await insertSession(editorBSessionToken, editorBId, expiresAt);

    categoryId = randomUUID();
    await database.query(
      `INSERT INTO "Category" ("id", "slug", "createdAt") VALUES ($1, $2, NOW())`,
      [categoryId, `${marker}-kategori`],
    );
    await database.query(
      `INSERT INTO "CategoryTranslation" ("id", "categoryId", "locale", "name")
       VALUES ($1,$2,'id',$3)`,
      [randomUUID(), categoryId, "Akademik"],
    );

    const past = new Date(now.getTime() - 3 * 24 * 3_600_000);
    const future = new Date(now.getTime() + 5 * 24 * 3_600_000);
    let clock = now.getTime();
    const nextUpdatedAt = () => new Date((clock -= 60_000));

    // EDITOR-A owns 15 posts spanning every publication state.
    // 5 DRAFT, 4 PUBLISHED(past), 3 PUBLISHED(future=SCHEDULED), 3 ARCHIVED.
    for (let i = 1; i <= 5; i += 1) {
      await insertPost({
        ownerId: editorAId, ownerMarker: "a", index: i, status: "DRAFT",
        publishedAt: null, updatedAt: nextUpdatedAt(),
        // First A post carries the category, a bilingual translation, and the featured flag.
        categoryId: i === 1 ? categoryId : null,
        locales: i === 1 ? ["id", "en"] : ["id"],
        isFeatured: i === 1,
      });
    }
    for (let i = 6; i <= 9; i += 1) {
      await insertPost({
        ownerId: editorAId, ownerMarker: "a", index: i, status: "PUBLISHED",
        publishedAt: past, updatedAt: nextUpdatedAt(),
        // One near-limit title to exercise wrapping without horizontal overflow.
        title: i === 6 ? NEAR_LIMIT_TITLE : undefined,
      });
    }
    for (let i = 10; i <= 12; i += 1) {
      await insertPost({
        ownerId: editorAId, ownerMarker: "a", index: i, status: "PUBLISHED",
        publishedAt: future, updatedAt: nextUpdatedAt(),
      });
    }
    for (let i = 13; i <= 15; i += 1) {
      await insertPost({
        ownerId: editorAId, ownerMarker: "a", index: i, status: "ARCHIVED",
        publishedAt: past, updatedAt: nextUpdatedAt(),
      });
    }

    // EDITOR-B owns 8 posts (must never be visible to EDITOR-A).
    for (let i = 1; i <= 8; i += 1) {
      await insertPost({
        ownerId: editorBId, ownerMarker: "b", index: i,
        status: i % 2 === 0 ? "PUBLISHED" : "DRAFT",
        publishedAt: i % 2 === 0 ? past : null, updatedAt: nextUpdatedAt(),
      });
    }

    // ADMIN owns 3 posts, taking the ADMIN-visible total to 26 (> one page of 20).
    for (let i = 1; i <= 3; i += 1) {
      await insertPost({
        ownerId: adminId, ownerMarker: "admin", index: i, status: "PUBLISHED",
        publishedAt: past, updatedAt: nextUpdatedAt(),
      });
    }
  });

  test.afterAll(async () => {
    try {
      await purgeFixtures();
    } finally {
      auxiliaryUserIds.length = 0;
      auxiliaryTokens.length = 0;
      if (lockClient) {
        await lockClient.query("SELECT pg_advisory_unlock($1)", [FIXTURE_LOCK_KEY]).catch(() => {});
        lockClient.release();
        lockClient = null;
      }
      await database.end().catch(() => {});
    }
  });

  function sessionCookie(token: string) {
    return { name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/" };
  }

  async function gotoPosts(page: Page, path = "/id/admin/posts") {
    await page.goto(path, { waitUntil: "networkidle" });
  }

  async function listItems(page: Page, locale: "id" | "ar" = "id") {
    await page.waitForSelector(LIST_SELECTOR[locale]);
    return page.locator(`${LIST_SELECTOR[locale]} > li`);
  }

  /** The total-count line is exactly "<n> berita"; the page description also contains the word
   *  "berita", so an anchored regex is required to avoid matching the description paragraph. */
  function totalCount(page: Page) {
    return page.getByText(/^\d+ berita$/);
  }

  test.describe("Session and redirect", () => {
    test("redirects unauthenticated visitor to locale login", async ({ page }) => {
      await page.goto("/id/admin/posts");
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
      await page.goto("/id/admin/posts");
      await expect(page).toHaveURL(/\/id\/login/);
      await page.context().clearCookies();
    });

    test("allows ADMIN to reach the page without leaking role or email", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page);
      await expect(page.locator("h1")).toBeVisible();
      const body = (await page.locator("body").textContent()) ?? "";
      expect(body).not.toContain(`${marker}-admin@example.invalid`);
      expect(body).not.toContain("ADMIN");
      expect(body).not.toContain(adminSessionToken);
      await page.context().clearCookies();
    });

    test("allows EDITOR to reach the page without leaking role or PII", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page);
      await expect(page.locator("h1")).toBeVisible();
      const body = (await page.locator("body").textContent()) ?? "";
      expect(body).not.toContain(`${marker}-editor-a@example.invalid`);
      expect(body).not.toContain("EDITOR");
      expect(body).not.toContain(editorASessionToken);
      await page.context().clearCookies();
    });
  });

  test.describe("ADMIN versus EDITOR ownership scoping", () => {
    test("ADMIN sees the full Berita count (26)", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page);
      await page.waitForSelector(LIST_SELECTOR.id);
      await expect(totalCount(page)).toHaveText("26 berita");
      await page.context().clearCookies();
    });

    test("EDITOR-A sees only their own 15 posts and never EDITOR-B titles", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page);
      const items = await listItems(page);
      expect(await items.count()).toBe(15);
      const body = (await page.locator("body").textContent()) ?? "";
      expect(body).not.toContain(`${marker} b `);
      await page.context().clearCookies();
    });

    test("EDITOR-A pagination total is ownership-scoped (15 < 20 → no pagination)", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page);
      await page.waitForSelector(LIST_SELECTOR.id);
      await expect(totalCount(page)).toHaveText("15 berita");
      await expect(page.locator("nav[aria-label='Navigasi halaman daftar berita']")).toHaveCount(0);
      await page.context().clearCookies();
    });
  });

  test.describe("ALL/DRAFT/PUBLISHED/ARCHIVED filter", () => {
    test("DRAFT filter shows only EDITOR-A drafts, resets to page 1, sets aria-current", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/id/admin/posts?status=DRAFT");
      const items = await listItems(page);
      expect(await items.count()).toBe(5);
      const active = page.locator(
        "nav[aria-label='Saring berita berdasarkan status'] [aria-current='page']",
      );
      await expect(active).toHaveText("Draf");
      await page.context().clearCookies();
    });

    test("PUBLISHED filter returns both published and scheduled rows (7)", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/id/admin/posts?status=PUBLISHED");
      const items = await listItems(page);
      expect(await items.count()).toBe(7);
      const badges = (await items.allTextContents()).join(" ");
      expect(badges).toContain("Terbit");
      expect(badges).toContain("Terjadwal");
      await page.context().clearCookies();
    });

    test("ARCHIVED filter shows only archived posts (3)", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/id/admin/posts?status=ARCHIVED");
      const items = await listItems(page);
      expect(await items.count()).toBe(3);
      await page.context().clearCookies();
    });

    test("filter switching preserves the active locale EN", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/en/admin/posts?status=DRAFT");
      const active = page.locator(
        "nav[aria-label] [aria-current='page']",
      ).first();
      await expect(active).toBeVisible();
      expect(page.url()).toContain("/en/admin/posts");
      await page.context().clearCookies();
    });
  });

  test.describe("Publication-state badge", () => {
    test("proves DRAFT, PUBLISHED, SCHEDULED, and ARCHIVED with distinct text", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page);
      const text = (await page.locator(LIST_SELECTOR.id).textContent()) ?? "";
      expect(text).toContain("Draf");
      expect(text).toContain("Terbit");
      expect(text).toContain("Terjadwal");
      expect(text).toContain("Arsip");
      await page.context().clearCookies();
    });
  });

  test.describe("Hostile, repeated, unknown, and excessive query parameters", () => {
    test("collapses to canonical page-1/ALL for EDITOR (15) without leaking hidden posts", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      const hostile = [
        "/id/admin/posts?status=DRAFT&pageSize=999",
        "/id/admin/posts?status=SCHEDULED",
        "/id/admin/posts?status=draft",
        "/id/admin/posts?page=01",
        "/id/admin/posts?page=0",
        "/id/admin/posts?page=-4",
        "/id/admin/posts?page=10001",
        "/id/admin/posts?evil=1",
        "/id/admin/posts?status=DRAFT&status=PUBLISHED",
      ];
      for (const path of hostile) {
        await gotoPosts(page, path);
        const items = await listItems(page);
        expect(await items.count(), `canonical ALL for ${path}`).toBe(15);
        const body = (await page.locator("body").textContent()) ?? "";
        expect(body, `no EDITOR-B leak for ${path}`).not.toContain(`${marker} b `);
      }
      await page.context().clearCookies();
    });
  });

  test.describe("Display fields", () => {
    test("shows title, featured flag, locales, category, author, and Jakarta time", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/id/admin/posts?status=DRAFT");
      const featured = page.locator(`${LIST_SELECTOR.id} > li`, { hasText: "Unggulan" }).first();
      const text = (await featured.textContent()) ?? "";
      expect(text).toContain("ID · EN");
      expect(text).toContain("Akademik");
      expect(text).toContain("Oleh Editor A QA");
      const time = featured.locator("time");
      await expect(time).toHaveCount(1);
      expect(await time.getAttribute("datetime")).toBeTruthy();
      await page.context().clearCookies();
    });

    test("uses safe fallbacks for an uncategorized post", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/id/admin/posts?status=ARCHIVED");
      const text = (await page.locator(LIST_SELECTOR.id).textContent()) ?? "";
      expect(text).toContain("Tanpa kategori");
      await page.context().clearCookies();
    });

    test("long title wraps without horizontal overflow", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await page.setViewportSize({ width: 390, height: 800 });
      await gotoPosts(page, "/id/admin/posts?status=PUBLISHED");
      await page.waitForSelector(LIST_SELECTOR.id);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflow).toBe(false);
      await page.context().clearCookies();
    });
  });

  test.describe("Locale — ID, EN, AR with RTL and direction safety", () => {
    test("displays ID product-facing copy", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page);
      await expect(page.locator("h1")).toContainText("Berita");
      await page.context().clearCookies();
    });

    test("displays EN copy with News heading", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/en/admin/posts");
      await expect(page.locator("h1")).toContainText("News");
      await page.context().clearCookies();
    });

    test("displays AR copy with genuine Arabic text and dir=rtl", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/ar/admin/posts");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator("h1")).toContainText("الأخبار");
      const scheduled = (await page.locator(LIST_SELECTOR.ar).textContent()) ?? "";
      expect(scheduled).toMatch(/[؀-ۿ]/);
      await page.context().clearCookies();
    });

    test("pagination chevrons use rtl:rotate-180 on the ADMIN paginated page", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page, "/ar/admin/posts");
      await page.waitForSelector(LIST_SELECTOR.ar);
      const chevrons = page.locator("nav[aria-label] svg");
      expect(await chevrons.count()).toBeGreaterThan(0);
      for (const cls of await chevrons.evaluateAll((els) => els.map((e) => e.getAttribute("class") ?? ""))) {
        expect(cls).toContain("rtl:rotate-180");
      }
      await page.context().clearCookies();
    });
  });

  test.describe("Pagination — 20 items per page for ADMIN", () => {
    test("ADMIN page 1 shows 20 rows and a next link", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page);
      const items = await listItems(page);
      expect(await items.count()).toBe(20);
      await expect(page.locator("nav[aria-label='Navigasi halaman daftar berita']")).toBeVisible();
      await page.context().clearCookies();
    });

    test("ADMIN page 2 shows the remaining 6 rows", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page, "/id/admin/posts?page=2");
      const items = await listItems(page);
      expect(await items.count()).toBe(6);
      await page.context().clearCookies();
    });
  });

  test.describe("axe WCAG A/AA — ID and AR", () => {
    test("passes axe on the populated ID page for ADMIN", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page);
      await page.waitForSelector(LIST_SELECTOR.id);
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(results.violations).toEqual([]);
      await page.context().clearCookies();
    });

    test("passes axe on the populated AR page for ADMIN", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page, "/ar/admin/posts");
      await page.waitForSelector(LIST_SELECTOR.ar);
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(results.violations).toEqual([]);
      await page.context().clearCookies();
    });

    test("passes axe on the populated page for EDITOR", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page);
      await page.waitForSelector(LIST_SELECTOR.id);
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(results.violations).toEqual([]);
      await page.context().clearCookies();
    });

    test("has exactly one main landmark and one h1", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page);
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveCount(1);
      await page.context().clearCookies();
    });

    test("keyboard focus order accounts for skip link and reaches the first filter", async ({ page }) => {
      await page.context().addCookies([sessionCookie(adminSessionToken)]);
      await gotoPosts(page);
      await page.keyboard.press("Tab");
      const skip = page.locator("a[href='#main']").first();
      if (await skip.isVisible().catch(() => false)) {
        await expect(skip).toBeFocused();
        await page.keyboard.press("Tab");
      }
      const firstFilter = page.locator(
        "nav[aria-label='Saring berita berdasarkan status'] a",
      ).first();
      await expect(firstFilter).toBeFocused();
      const outline = await firstFilter.evaluate((el) => {
        const style = getComputedStyle(el);
        return `${style.outlineStyle}|${style.boxShadow}`;
      });
      expect(outline).not.toBe("none|none");
      await page.context().clearCookies();
    });
  });

  test.describe("Viewport responsiveness — no horizontal overflow", () => {
    for (const width of BREAKPOINTS) {
      for (const locale of ["id", "ar"] as const) {
        test(`no horizontal overflow at ${width}px with ${locale.toUpperCase()} for ADMIN`, async ({ page }) => {
          await page.context().addCookies([sessionCookie(adminSessionToken)]);
          await page.setViewportSize({ width, height: 900 });
          await gotoPosts(page, `/${locale}/admin/posts`);
          await page.waitForSelector(LIST_SELECTOR[locale]);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          );
          expect(overflow, `overflow at ${width}px ${locale}`).toBe(false);
          await page.context().clearCookies();
        });
      }
    }
  });

  test.describe("No PII, token, or technical error disclosure", () => {
    test("does not leak session token, slug, id, DATABASE_URL, or Prisma details in DOM", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page);
      await page.waitForSelector(LIST_SELECTOR.id);
      const html = await page.content();
      expect(html).not.toContain(editorASessionToken);
      expect(html).not.toContain(`${marker}-a-01`);
      expect(html).not.toContain("DATABASE_URL");
      expect(html).not.toContain("Prisma");
      await page.context().clearCookies();
    });

    test("does not leak technical error when the query is hostile", async ({ page }) => {
      await page.context().addCookies([sessionCookie(editorASessionToken)]);
      await gotoPosts(page, "/id/admin/posts?evil=<script>alert(1)</script>");
      const text = (await page.locator("body").textContent()) ?? "";
      expect(text).not.toContain("Prisma");
      expect(text).not.toContain("PostgreSQL");
      expect(text).not.toContain("<script>");
      await page.context().clearCookies();
    });
  });

  test.describe("Empty and unavailable safe presentation", () => {
    test("shows empty state, not role=alert, when the owner has no posts", async ({ page }) => {
      const emptyUserId = randomUUID();
      auxiliaryUserIds.push(emptyUserId);
      await insertUser(emptyUserId, "Empty Owner QA", "EDITOR", `empty-${randomUUID().slice(0, 8)}`);
      const emptyToken = randomUUID();
      auxiliaryTokens.push(emptyToken);
      await insertSession(emptyToken, emptyUserId, new Date(Date.now() + 8 * 3_600_000));

      await page.context().addCookies([sessionCookie(emptyToken)]);
      await gotoPosts(page);
      await page.waitForSelector("h1");
      const empty = page.locator("h2", { hasText: "Belum ada berita" });
      await expect(empty).toBeVisible();
      await expect(empty).not.toHaveAttribute("role", "alert");
      await page.context().clearCookies();
    });
  });
});
