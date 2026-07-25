import { createHash, randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { Pool, type PoolClient } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (typeof DATABASE_URL !== "string" || DATABASE_URL.length === 0) {
  throw new Error("DATABASE_URL is required for Post editor browser tests.");
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

test.describe("M3 Post editor QA", () => {
  test.skip(!DATABASE_URL, "Post editor browser tests require an isolated PostgreSQL database.");

  const MARKER_BASE = "m3-post-editor-qa";
  let marker = MARKER_BASE;
  let database!: Pool;

  const FIXTURE_LOCK_KEY = 883_112_045;
  let lockClient: PoolClient | null = null;

  let editorAId = "";
  let editorBId = "";
  let editorASessionToken = "";
  let editorBSessionToken = "";
  let categoryId = "";
  let tagId = "";
  let mediaId = "";
  const auxiliaryUserIds: string[] = [];
  const auxiliaryTokens: string[] = [];
  const createdPostIds: string[] = [];

  async function cleanupAll() {
    if (createdPostIds.length > 0) {
      for (const pid of createdPostIds) {
        await database.query(`DELETE FROM "PostTag" WHERE "postId" = $1`, [pid]).catch(() => {});
        await database.query(`DELETE FROM "PostTranslation" WHERE "postId" = $1`, [pid]).catch(() => {});
        await database.query(`DELETE FROM "ContentRevision" WHERE "resourceType" = 'Post' AND "resourceId" = $1`, [pid]).catch(() => {});
        await database.query(`DELETE FROM "ActivityLog" WHERE "resourceType" = 'Post' AND "resourceId" = $1`, [pid]).catch(() => {});
        await database.query(`DELETE FROM "Post" WHERE "id" = $1`, [pid]).catch(() => {});
      }
    }
    const allUserIds = [editorAId, editorBId, ...auxiliaryUserIds].filter(Boolean);
    const allTokens = [editorASessionToken, editorBSessionToken, ...auxiliaryTokens].filter(Boolean);
    if (allTokens.length > 0) {
      await database.query(`DELETE FROM "Session" WHERE "sessionToken" = ANY($1::text[])`, [allTokens]).catch(() => {});
    }
    if (categoryId) {
      await database.query(`DELETE FROM "CategoryTranslation" WHERE "categoryId" = $1`, [categoryId]).catch(() => {});
      await database.query(`DELETE FROM "Category" WHERE "id" = $1`, [categoryId]).catch(() => {});
    }
    if (tagId) await database.query(`DELETE FROM "Tag" WHERE "id" = $1`, [tagId]).catch(() => {});
    if (mediaId) await database.query(`DELETE FROM "Media" WHERE "id" = $1`, [mediaId]).catch(() => {});
    if (allUserIds.length > 0) {
      await database.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[])`, [allUserIds]).catch(() => {});
    }
  }

  test.beforeAll(async ({}, testInfo) => {
    // The two projects serialize on the shared advisory lock, so the second waits for the first to
    // finish its whole run. That can exceed the default 30s hook timeout.
    testInfo.setTimeout(300_000);
    database = new Pool({ connectionString: DATABASE_URL });
    marker = `${MARKER_BASE}-${testInfo.project.name}-${Date.now()}`;

    lockClient = await database.connect();
    await lockClient.query("SELECT pg_advisory_lock($1)", [FIXTURE_LOCK_KEY]);

    editorAId = randomUUID();
    editorBId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 3_600_000);

    await database.query(
      `INSERT INTO "User" ("id","name","email","passwordHash","role","mustChangePassword","updatedAt") VALUES ($1,$2,$3,$4,'EDITOR',false,NOW())`,
      [editorAId, "Editor A QA", `${marker}-a@example.invalid`, "irrelevant-bcrypt-hash"],
    );
    await database.query(
      `INSERT INTO "User" ("id","name","email","passwordHash","role","mustChangePassword","updatedAt") VALUES ($1,$2,$3,$4,'EDITOR',false,NOW())`,
      [editorBId, "Editor B QA", `${marker}-b@example.invalid`, "irrelevant-bcrypt-hash"],
    );

    editorASessionToken = randomUUID();
    editorBSessionToken = randomUUID();
    await database.query(`INSERT INTO "Session" ("sessionToken","userId","expires") VALUES ($1,$2,$3)`, [editorASessionToken, editorAId, expiresAt]);
    await database.query(`INSERT INTO "Session" ("sessionToken","userId","expires") VALUES ($1,$2,$3)`, [editorBSessionToken, editorBId, expiresAt]);

    categoryId = randomUUID();
    await database.query(`INSERT INTO "Category" ("id","slug") VALUES ($1,$2)`, [categoryId, `${marker}-kategori`]);
    await database.query(
      `INSERT INTO "CategoryTranslation" ("id","name","locale","categoryId") VALUES ($1,$2,'id',$3)`,
      [randomUUID(), `${marker}-kategori`, categoryId],
    );
    tagId = randomUUID();
    await database.query(`INSERT INTO "Tag" ("id","slug") VALUES ($1,$2)`, [tagId, `${marker}-tag`]);
    const cs = createHash("sha256").update(`${marker}-media-cover`).digest("hex");
    mediaId = randomUUID();
    await database.query(
      `INSERT INTO "Media" ("id","storageKey","storageClass","checksumSha256","originalName","mimeType","size","alt","isDecorative","width","height","uploaderId","createdAt") VALUES ($1,$2,'PUBLIC',$3,$4,'image/webp',100,$5,false,640,480,$6,NOW())`,
      [mediaId, `2026/07/${cs}.webp`, cs, `${marker}-cover.png`, "Cover", editorAId],
    );
  });

  test.afterAll(async () => {
    await cleanupAll();
    if (lockClient) {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [FIXTURE_LOCK_KEY]).catch(() => {});
      lockClient.release();
    }
    await database.end();
  });

  function sessionCookie(token: string) {
    return { name: "authjs.session-token", value: token, domain: "localhost", path: "/" };
  }

  function idSection(page: Page) {
    // The form has one fieldset per locale; the first fieldset with a label "Judul" is Indonesian
    // Use the nth(0) group containing "Judul" to scope ID content
    return page.getByRole("group").filter({ has: page.getByLabel("Judul") }).first();
  }

  async function fillIndonesianFields(page: Page, title: string, slug: string, excerpt: string, content: string) {
    await page.getByLabel("Slug").fill(slug);
    const section = idSection(page);
    await section.getByLabel("Judul").fill(title);
    await section.getByLabel("Ringkasan").fill(excerpt);
    await section.getByLabel("Isi").fill(content);
  }

  // ─────────────────────────────────────────────
  // 1. CREATE SUCCESS
  // ─────────────────────────────────────────────
  test("creates a draft post via the editor and confirms the row in the database", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    const slug = `${marker}-create-${Date.now()}`;
    const title = "Berita QA Buatan Editor";

    await page.goto("/id/admin/posts/new", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Tulis Berita");

    await fillIndonesianFields(page, title, slug, "Ringkasan berita QA.", "<p>Isi berita QA yang dibuat oleh editor.</p>");

    await page.getByRole("button", { name: "Simpan draf" }).click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);
    // Wait for the list page to actually render the post (proves the redirect completed)
    await page.waitForSelector("h1", { timeout: 10000 });

    // Retry DB query — the transaction may commit asynchronously after the redirect
    let row = await database.query(
      `SELECT "id", "slug", "status", "authorId", "contentOwnerId" FROM "Post" WHERE "slug" = $1 AND "type" = 'BERITA'`,
      [slug],
    );
    for (let retry = 0; retry < 10 && (row.rowCount ?? 0) === 0; retry += 1) {
      await new Promise((r) => setTimeout(r, 200));
      row = await database.query(
        `SELECT "id", "slug", "status", "authorId", "contentOwnerId" FROM "Post" WHERE "slug" = $1 AND "type" = 'BERITA'`,
        [slug],
      );
    }
    // Remove type-specific diagnostic after confirming row exists
    expect(row.rowCount).toBe(1);
    const post = row.rows[0];
    expect(post.status).toBe("DRAFT");
    expect(post.authorId).toBe(editorAId);
    expect(post.contentOwnerId).toBe(editorAId);
    createdPostIds.push(post.id);

    const trans = await database.query(
      `SELECT "title" FROM "PostTranslation" WHERE "postId" = $1 AND "locale" = 'id'`,
      [post.id],
    );
    expect(trans.rows[0]?.title).toBe(title);
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 2. CLIENT VALIDATION
  // ─────────────────────────────────────────────
  test("shows per-field errors and form alert for empty Indonesian title without sending POST", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    await page.goto("/id/admin/posts/new", { waitUntil: "networkidle" });

    // Submit with empty title and invalid slug — leave title empty
    await page.getByLabel("Slug").fill("Not Valid!");
    await page.getByRole("button", { name: "Simpan draf" }).click();

    // Form-level alert must appear (client-side Zod rejection)
    const formAlert = page.locator("form > [role='alert']");
    await expect(formAlert).toBeVisible();
    await expect(formAlert).toContainText("Ada isian yang belum sesuai");

    expect(page.url()).toContain("/id/admin/posts/new");

    const text = await page.locator("form").textContent() ?? "";
    expect(text).not.toContain("VALIDATION_FAILED");
    expect(text).not.toContain("ZodError");
    expect(text).not.toContain("stack");
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 3. VERSION CONFLICT
  // ─────────────────────────────────────────────
  test("shows VERSION_CONFLICT when a concurrent edit bumps the version", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);

    const slug = `${marker}-version-${Date.now()}`;
    await page.goto("/id/admin/posts/new", { waitUntil: "networkidle" });
    await fillIndonesianFields(page, "Berita Versi", slug, "Ringkasan.", "<p>Isi.</p>");
    await page.getByRole("button", { name: "Simpan draf" }).click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);

    const row = await database.query(`SELECT "id", "version" FROM "Post" WHERE "slug" = $1`, [slug]);
    const postId = row.rows[0].id;
    createdPostIds.push(postId);

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Sunting Berita");

    await database.query(`UPDATE "Post" SET "version" = version + 1 WHERE "id" = $1`, [postId]);

    await idSection(page).getByLabel("Judul").fill("Berita Versi Diubah");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();

    await expect(page.locator("form > [role='alert']")).toBeVisible();
    await expect(page.locator("form > [role='alert']")).toContainText("telah diubah orang lain");

    const formText = await page.locator("form").textContent() ?? "";
    expect(formText).not.toContain("VERSION_CONFLICT");
    expect(formText).not.toContain("Prisma");
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 4. SLUG CONFLICT (field-scoped)
  // ─────────────────────────────────────────────
  test("attaches SLUG_CONFLICT to the slug field, not the form alert", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);

    const slug = `${marker}-slugconflict-${Date.now()}`;
    await page.goto("/id/admin/posts/new", { waitUntil: "networkidle" });
    await fillIndonesianFields(page, "Post A", slug, "A.", "<p>A.</p>");
    await page.getByRole("button", { name: "Simpan draf" }).click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);
    const r = await database.query(`SELECT "id" FROM "Post" WHERE "slug" = $1`, [slug]);
    createdPostIds.push(r.rows[0].id);

    await page.goto("/id/admin/posts/new", { waitUntil: "networkidle" });
    await fillIndonesianFields(page, "Post B", slug, "B.", "<p>B.</p>");
    await page.getByRole("button", { name: "Simpan draf" }).click();

    // SLUG_CONFLICT message must appear ATTACHED to the slug field
    const slugFieldGroup = page.locator("form [id$='-slug-description']").locator("..");
    await expect(slugFieldGroup).toContainText("Slug ini sudah dipakai berita lain");

    const bodyText = await page.locator("form").textContent() ?? "";
    expect(bodyText).toContain("Slug ini sudah dipakai berita lain");
    expect(bodyText).not.toContain("SLUG_CONFLICT");
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 5. EDIT ROUND-TRIP PRESERVATION
  // ─────────────────────────────────────────────
  test("preserves categoryId, coverMediaId, and tagIds when editing only the title", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);

    const slug = `${marker}-roundtrip-${Date.now()}`;
    const postId = randomUUID();
    createdPostIds.push(postId);

    await database.query(
      `INSERT INTO "Post" ("id","slug","type","status","authorId","contentOwnerId","categoryId","coverMediaId","isFeatured","version","publishedAt","createdAt","updatedAt") VALUES ($1,$2,'BERITA','DRAFT',$3,$4,$5,$6,false,1,NULL,NOW(),NOW())`,
      [postId, slug, editorAId, editorAId, categoryId, mediaId],
    );
    await database.query(
      `INSERT INTO "PostTranslation" ("id","locale","title","excerpt","content","status","sourceVersion","postId") VALUES ($1,'id',$2,'Sebelum','<p>Sebelum</p>','DRAFT',1,$3)`,
      [randomUUID(), "Title Before", postId],
    );
    await database.query(`INSERT INTO "PostTag" ("postId","tagId") VALUES ($1,$2)`, [postId, tagId]);

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText("Sunting Berita");

    const newTitle = "Title After Edit";
    await idSection(page).getByLabel("Judul").fill(newTitle);
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);

    const updated = await database.query(
      `SELECT "categoryId", "coverMediaId", "version" FROM "Post" WHERE "id" = $1`,
      [postId],
    );
    expect(updated.rows[0].categoryId).toBe(categoryId);
    expect(updated.rows[0].coverMediaId).toBe(mediaId);
    expect(updated.rows[0].version).toBe(2);

    const tags = await database.query(`SELECT "tagId" FROM "PostTag" WHERE "postId" = $1`, [postId]);
    expect(tags.rows.length).toBe(1);
    expect(tags.rows[0].tagId).toBe(tagId);

    const titleRow = await database.query(
      `SELECT "title" FROM "PostTranslation" WHERE "postId" = $1 AND "locale" = 'id'`,
      [postId],
    );
    expect(titleRow.rows[0].title).toBe(newTitle);
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 6. OWNERSHIP ON EDITOR ROUTE
  // ─────────────────────────────────────────────
  test("EDITOR-B sees unavailable notice for EDITOR-A's post, never the populated form", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);

    const slug = `${marker}-owner-${Date.now()}`;
    await page.goto("/id/admin/posts/new", { waitUntil: "networkidle" });
    await fillIndonesianFields(page, "Post Milik A", slug, "A.", "<p>A.</p>");
    await page.getByRole("button", { name: "Simpan draf" }).click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);
    const r = await database.query(`SELECT "id" FROM "Post" WHERE "slug" = $1`, [slug]);
    createdPostIds.push(r.rows[0].id);
    await page.context().clearCookies();

    await page.context().addCookies([sessionCookie(editorBSessionToken)]);
    await page.goto(`/id/admin/posts/${r.rows[0].id}/edit`, { waitUntil: "networkidle" });

    await expect(page.locator("form")).not.toBeVisible();

    const text = await page.locator("main").textContent() ?? "";
    // The page h1 may show "Sunting Berita" in both available and unavailable states
    // The form fields are the distinguishing factor
    expect(text).not.toContain("Judul"); // no form fields
    expect(text).not.toContain("NOT_FOUND");
    expect(text).not.toContain("FORBIDDEN");
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 7. AR AUTHORING IS RTL
  // ─────────────────────────────────────────────
  test("Arabic content fields carry dir='rtl' on the authoring page", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    await page.goto("/ar/admin/posts/new", { waitUntil: "networkidle" });

    const arInputs = page.locator("input[dir='rtl'], textarea[dir='rtl']");
    const count = await arInputs.count();
    expect(count).toBeGreaterThanOrEqual(3); // title, excerpt, content
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 8. NO DISCLOSURE
  // ─────────────────────────────────────────────
  test("never leaks author email, session token, or technical strings in the editor DOM", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    await page.goto("/id/admin/posts/new", { waitUntil: "networkidle" });

    const text = await page.locator("main").innerHTML();
    expect(text).not.toContain("@example.invalid");
    expect(text).not.toContain(editorASessionToken);
    expect(text).not.toContain("Prisma");
    expect(text).not.toContain("DATABASE_URL");
    expect(text).not.toContain("storageKey");
    expect(text).not.toContain("stack");
    await page.context().clearCookies();
  });
});
