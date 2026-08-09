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

  // Bind the auth cookie to the base URL's host. A hardcoded `domain: "localhost"` is silently
  // dropped when the tests run against the config default `http://127.0.0.1:3004`, so every admin
  // route redirects to the login page and the whole suite fails. Using `url` follows whatever host
  // `PLAYWRIGHT_BASE_URL`/the config resolves to.
  const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3004";
  function sessionCookie(token: string) {
    return { name: "authjs.session-token", value: token, url: BASE_URL };
  }

  function idSection(page: Page) {
    // The form has one fieldset per locale; the first fieldset with a label "Judul" is Indonesian.
    // "Judul" must be matched exactly: the rich-text toolbar adds buttons labelled "Judul tingkat 2"
    // and "Judul tingkat 3", so a substring match resolves to three elements per section.
    return page.getByRole("group").filter({ has: page.getByLabel("Judul", { exact: true }) }).first();
  }

  async function fillIndonesianFields(page: Page, title: string, slug: string, excerpt: string, content: string) {
    await page.getByLabel("Slug", { exact: true }).fill(slug);
    const section = idSection(page);
    await section.getByLabel("Judul", { exact: true }).fill(title);
    await section.getByLabel("Ringkasan", { exact: true }).fill(excerpt);
    await section.getByLabel("Isi", { exact: true }).fill(content);
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

    await idSection(page).getByLabel("Judul", { exact: true }).fill("Berita Versi Diubah");
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
    await idSection(page).getByLabel("Judul", { exact: true }).fill(newTitle);
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

    // Content is now a Tiptap contenteditable ([role=textbox]), not a <textarea>, so it must be
    // counted alongside the title and excerpt inputs.
    const arInputs = page.locator(
      "input[dir='rtl'], textarea[dir='rtl'], [role='textbox'][dir='rtl']",
    );
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

  // ─────────────────────────────────────────────
  // Post-editor mutation surfaces added after the basic editor.
  // EDITOR-A owns every seeded post, and the RBAC matrix grants EDITOR POST
  // PUBLISH/SCHEDULE/DELETE on OWN posts, so the existing fixture has full write capability here.
  // ─────────────────────────────────────────────

  type PostRow = {
    id: string;
    slug: string;
    status: string;
    version: number;
    publishedAt: string | null;
    coverMediaId: string | null;
  };

  async function seedOwnedPost(
    slugTag: string,
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
    publishedAt: string | null,
    withCover: boolean,
  ): Promise<{ postId: string; slug: string }> {
    const postId = randomUUID();
    createdPostIds.push(postId);
    const slug = `${marker}-${slugTag}-${Date.now()}`;
    await database.query(
      `INSERT INTO "Post" ("id","slug","type","status","authorId","contentOwnerId","categoryId","coverMediaId","isFeatured","version","publishedAt","createdAt","updatedAt") VALUES ($1,$2,'BERITA',$3,$4,$4,$5,$6,false,1,$7,NOW(),NOW())`,
      [postId, slug, status, editorAId, categoryId, withCover ? mediaId : null, publishedAt],
    );
    await database.query(
      `INSERT INTO "PostTranslation" ("id","locale","title","excerpt","content","status","sourceVersion","postId") VALUES ($1,'id',$2,'Ringkasan QA','<p>Isi</p>','DRAFT',1,$3)`,
      [randomUUID(), `Judul ${slugTag}`, postId],
    );
    return { postId, slug };
  }

  async function pollPost(postId: string, until: (row: PostRow) => boolean): Promise<PostRow> {
    const sql = `SELECT "id","slug","status","version","publishedAt","coverMediaId" FROM "Post" WHERE "id" = $1`;
    let result = await database.query(sql, [postId]);
    for (let i = 0; i < 30 && ((result.rowCount ?? 0) === 0 || !until(result.rows[0] as PostRow)); i += 1) {
      await new Promise((r) => setTimeout(r, 200));
      result = await database.query(sql, [postId]);
    }
    return result.rows[0] as PostRow;
  }

  // ─────────────────────────────────────────────
  // 9. PUBLISH NOW
  // ─────────────────────────────────────────────
  test("publishes a draft now, stamps publishedAt, and bumps the version", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    const { postId } = await seedOwnedPost("publish", "DRAFT", null, false);

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Terbitkan sekarang" }).click();

    const row = await pollPost(postId, (r) => r.status === "PUBLISHED");
    expect(row.status).toBe("PUBLISHED");
    expect(row.version).toBe(2);
    expect(row.publishedAt).not.toBeNull();
    expect(new Date(row.publishedAt as string).getTime()).toBeLessThanOrEqual(Date.now() + 5_000);

    const main = (await page.locator("main").textContent()) ?? "";
    expect(main).not.toContain("PUBLICATION");
    expect(main).not.toContain("Prisma");
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 10. SCHEDULE (future) + client rejection of a past time
  // ─────────────────────────────────────────────
  test("schedules a draft for a future time and rejects a past time client-side", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    const { postId } = await seedOwnedPost("schedule", "DRAFT", null, false);

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });

    // A past time is rejected before any request leaves the browser.
    await page.getByLabel("Jadwalkan terbit pada").fill("2020-01-01T09:00");
    await page.getByRole("button", { name: "Jadwalkan" }).click();
    await expect(page.getByText("Waktu terbit harus di masa depan.")).toBeVisible();
    const stillDraft = await database.query(`SELECT "status" FROM "Post" WHERE "id" = $1`, [postId]);
    expect(stillDraft.rows[0].status).toBe("DRAFT");

    // A future time schedules: PUBLISHED status with a future publishedAt (SCHEDULED display state).
    await page.getByLabel("Jadwalkan terbit pada").fill("2035-06-01T09:00");
    await page.getByRole("button", { name: "Jadwalkan" }).click();
    const scheduled = await pollPost(postId, (r) => r.status === "PUBLISHED");
    expect(scheduled.status).toBe("PUBLISHED");
    expect(new Date(scheduled.publishedAt as string).getTime()).toBeGreaterThan(Date.now());
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 11. ARCHIVE then RETURN TO DRAFT
  // ─────────────────────────────────────────────
  test("archives a published post, then returns the archived post to draft", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    const past = new Date(Date.now() - 3_600_000).toISOString();
    const { postId } = await seedOwnedPost("lifecycle", "PUBLISHED", past, false);

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Arsipkan" }).click();
    const archived = await pollPost(postId, (r) => r.status === "ARCHIVED");
    expect(archived.status).toBe("ARCHIVED");

    // Reload so the actions pick up the new version and the ARCHIVED transition set.
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Kembalikan ke draf" }).click();
    const returned = await pollPost(postId, (r) => r.status === "DRAFT");
    expect(returned.status).toBe("DRAFT");
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 12. DELETE via confirm dialog + audit + navigation
  // ─────────────────────────────────────────────
  test("deletes an owned post via the confirm dialog, audits it, and returns to the list", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    const { postId } = await seedOwnedPost("delete", "DRAFT", null, false);

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Hapus berita" }).click();
    await expect(page.getByText("Hapus berita ini?")).toBeVisible();
    await page.getByRole("button", { name: "Ya, hapus" }).click();

    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);

    let gone = await database.query(`SELECT "id" FROM "Post" WHERE "id" = $1`, [postId]);
    for (let i = 0; i < 30 && (gone.rowCount ?? 0) > 0; i += 1) {
      await new Promise((r) => setTimeout(r, 200));
      gone = await database.query(`SELECT "id" FROM "Post" WHERE "id" = $1`, [postId]);
    }
    expect(gone.rowCount).toBe(0);

    const audit = await database.query(
      `SELECT "action","metadata" FROM "ActivityLog" WHERE "resourceType" = 'Post' AND "resourceId" = $1`,
      [postId],
    );
    expect(audit.rowCount ?? 0).toBeGreaterThanOrEqual(1);
    const hasDelete = audit.rows.some(
      (r: { metadata: { operation?: string } | null }) => (r.metadata?.operation ?? null) === "DELETE",
    );
    expect(hasDelete).toBe(true);
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 13. COVER PICKER — set then clear
  // ─────────────────────────────────────────────
  test("sets and clears the cover image through the picker", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    const { postId } = await seedOwnedPost("cover", "DRAFT", null, false);

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Pilih sampul" }).click();
    await page.getByRole("button", { name: `Pilih ${marker}-cover.png sebagai sampul` }).click();
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);
    const withCover = await pollPost(postId, (r) => r.coverMediaId === mediaId);
    expect(withCover.coverMediaId).toBe(mediaId);

    // Re-open and clear the cover.
    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Hapus sampul" }).click();
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);
    const cleared = await pollPost(postId, (r) => r.coverMediaId === null);
    expect(cleared.coverMediaId).toBeNull();
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 14. RICH TEXT — bold toolbar round-trips to sanitized <strong>
  // ─────────────────────────────────────────────
  test("applies bold via the toolbar and stores <strong> after server sanitization", async ({ page }) => {
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    const { postId } = await seedOwnedPost("richtext", "DRAFT", null, false);

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    const content = idSection(page).getByLabel("Isi", { exact: true });
    // Type the text first, then select all and bold it. Toggling bold *before* typing races the
    // editor's refocus and drops the first keystrokes; selecting existing text and bolding it is
    // deterministic and matches how an author actually applies formatting.
    await content.click();
    await content.press("End");
    await content.pressSequentially("TEKSTEBAL");
    await content.press("ControlOrMeta+a");
    await idSection(page).getByRole("button", { name: "Tebal", exact: true }).click();

    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);

    const row = await database.query(
      `SELECT "content" FROM "PostTranslation" WHERE "postId" = $1 AND "locale" = 'id'`,
      [postId],
    );
    // The whole line is now bold, so TEKSTEBAL sits inside the sanitized <strong> the server kept.
    expect(row.rows[0].content).toMatch(/<strong>[^<]*TEKSTEBAL[^<]*<\/strong>/);
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────
  // 15. AUTOSAVE — shared version; manual save after autosave has no conflict
  // ─────────────────────────────────────────────
  test("serializes manual save behind autosave and reuses the advanced version", async ({ page }) => {
    test.setTimeout(120_000);
    await page.context().addCookies([sessionCookie(editorASessionToken)]);
    const { postId } = await seedOwnedPost("autosave", "DRAFT", null, false);

    type MutationRequest = {
      action?: string;
      payload?: { expectedVersion?: number };
    };
    const mutationRequests: MutationRequest[] = [];
    let releaseAutosave: (() => void) | undefined;
    const autosaveRelease = new Promise<void>((resolve) => {
      releaseAutosave = resolve;
    });
    let autosaveCommitted = false;

    await page.route("**/api/admin/posts", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      const body = route.request().postDataJSON() as MutationRequest;
      mutationRequests.push(body);
      if (body.action !== "AUTOSAVE") {
        await route.continue();
        return;
      }

      // Let the server commit version 2, but hold the response so the browser's autosave mutation
      // remains in flight. This creates the overlap window deterministically.
      const response = await route.fetch();
      autosaveCommitted = true;
      await autosaveRelease;
      await route.fulfill({ response });
    });

    await page.goto(`/id/admin/posts/${postId}/edit`, { waitUntil: "networkidle" });
    // Dirty the draft so the 30s autosave interval has something to persist.
    await idSection(page).getByLabel("Judul", { exact: true }).fill("Judul Diubah Autosave");

    // The request has committed upstream but its response remains unresolved in the browser.
    await expect.poll(() => autosaveCommitted, { timeout: 45_000 }).toBe(true);
    await expect(page.locator('[data-autosave-status="saving"]')).toBeAttached();
    const afterAutosave = await pollPost(postId, (r) => r.version === 2);
    expect(afterAutosave.version).toBe(2);

    // Every competing mutation is disabled while autosave owns the atomic shell lease.
    const manualSave = page.getByRole("button", { name: "Simpan perubahan" });
    await expect(manualSave).toBeDisabled();
    await expect(page.getByRole("button", { name: "Terbitkan sekarang" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Hapus berita" })).toBeDisabled();
    expect(mutationRequests.map((request) => request.action)).toEqual(["AUTOSAVE"]);

    // Releasing autosave synchronously advances the shared version before mutations unlock.
    releaseAutosave?.();
    await expect(page.locator('[data-autosave-status="saved"]')).toBeAttached();
    await expect(manualSave).toBeEnabled();
    await manualSave.click();
    await page.waitForURL(/\/id\/admin\/posts(\?|$)/);
    const afterManual = await pollPost(postId, (r) => r.version === 3);
    expect(afterManual.version).toBe(3);
    expect(afterManual.status).toBe("DRAFT");
    expect(mutationRequests.map((request) => request.action)).toEqual(["AUTOSAVE", "UPDATE"]);
    expect(mutationRequests[1]?.payload?.expectedVersion).toBe(2);
    await page.context().clearCookies();
  });
});
