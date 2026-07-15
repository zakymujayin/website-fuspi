import { randomUUID } from "node:crypto";

import { hash } from "bcryptjs";
import { expect, test, type Page } from "@playwright/test";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3004";
const PASSWORD_ROUTE = "**/api/auth/password*";
const CREDENTIALS_ROUTE = "**/api/auth/credentials*";
const CURRENT_PASSWORD = "CurrentPassword-12";
const NEW_PASSWORD = "ReplacementPassword-34";

type Stub = { status: number; body: unknown; delayMs?: number; clearCookie?: boolean };

async function stubPassword(page: Page, stub: Stub) {
  const requests: Array<{ url: string; body: string | null }> = [];
  await page.route(PASSWORD_ROUTE, async (route) => {
    requests.push({ url: route.request().url(), body: route.request().postData() });
    if (stub.delayMs) await new Promise((resolve) => setTimeout(resolve, stub.delayMs));
    await route.fulfill({
      status: stub.status,
      contentType: "application/json",
      headers: stub.clearCookie
        ? {
            "set-cookie":
              "authjs.session-token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
          }
        : undefined,
      body: JSON.stringify(stub.body),
    });
  });
  return requests;
}

async function fillPasswordForm(page: Page) {
  await page.locator("input[name='currentPassword']").fill(CURRENT_PASSWORD);
  await page.locator("input[name='newPassword']").fill(NEW_PASSWORD);
  await page.locator("input[name='confirmPassword']").fill(NEW_PASSWORD);
}

const formAlert = (page: Page) => page.locator("form [role='alert']");

test.describe("password and session UI", () => {
  test.skip(!DATABASE_URL, "Password/session browser tests require an isolated PostgreSQL database.");

  const marker = `e2e-password-${process.pid}-${Date.now()}`;
  const email = `${marker}@example.invalid`;
  const database = new Pool({ connectionString: DATABASE_URL });
  let userId = "";

  test.beforeAll(async () => {
    userId = randomUUID();
    await database.query(
      `INSERT INTO "User"
        ("id", "name", "email", "passwordHash", "role", "mustChangePassword", "updatedAt")
       VALUES ($1, $2, $3, $4, 'ADMIN', false, NOW())`,
      [userId, "Synthetic Password UI", email, await hash(CURRENT_PASSWORD, 12)],
    );
  });

  test.afterAll(async () => {
    if (userId) {
      await database.query(`DELETE FROM "Session" WHERE "userId" = $1`, [userId]);
      await database.query(`DELETE FROM "User" WHERE "id" = $1`, [userId]);
    }
    await database.end();
  });

  async function setSession(page: Page, mustChangePassword = false) {
    await database.query(
      `UPDATE "User" SET "mustChangePassword" = $1, "updatedAt" = NOW() WHERE "id" = $2`,
      [mustChangePassword, userId],
    );
    await database.query(`DELETE FROM "Session" WHERE "userId" = $1`, [userId]);
    const token = `${marker}-${randomUUID()}`;
    await database.query(
      `INSERT INTO "Session" ("sessionToken", "userId", "expires") VALUES ($1, $2, $3)`,
      [token, userId, new Date(Date.now() + 60 * 60 * 1_000)],
    );
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: token,
        url: BASE_URL,
        httpOnly: true,
        sameSite: "Lax",
        expires: Math.floor(Date.now() / 1_000) + 3_600,
      },
    ]);
    return token;
  }

  test("active session opens the protected admin landing without actor data", async ({ page }) => {
    await setSession(page);
    await page.goto("/id/admin");

    await expect(page.getByRole("heading", { name: "Panel pengelola FUSPI" })).toBeVisible();
    const body = await page.locator("body").innerText();
    expect(body).not.toContain(email);
    expect(body).not.toContain(userId);
    expect(body).not.toContain("ADMIN");
  });

  test("forced-password session is redirected before admin renders", async ({ page }) => {
    await setSession(page, true);
    await page.goto("/id/admin");
    await expect(page).toHaveURL(/\/id\/change-password\?next=%2Fid%2Fadmin$/);
    await expect(page.getByRole("heading", { name: "Perbarui kata sandi Anda" })).toBeVisible();
  });

  test("stale cookie redirects to login and shows only the server-established notice", async ({
    page,
  }) => {
    await database.query(`DELETE FROM "Session" WHERE "userId" = $1`, [userId]);
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: `${marker}-revoked`,
        url: BASE_URL,
        httpOnly: true,
        sameSite: "Lax",
        expires: Math.floor(Date.now() / 1_000) + 3_600,
      },
    ]);

    await page.goto("/id/admin");
    await expect(page).toHaveURL(/\/id\/login\?next=%2Fid%2Fadmin$/);
    await expect(page.getByRole("status")).toContainText("Sesi Anda sudah tidak berlaku");
  });

  test("missing cookie redirects without falsely claiming the session expired", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/id/admin");
    await expect(page).toHaveURL(/\/id\/login\?next=%2Fid%2Fadmin$/);
    await expect(page.getByText("Sesi Anda sudah tidak berlaku")).toHaveCount(0);
  });

  test("login sends its active locale explicitly to the credentials boundary", async ({ page }) => {
    await page.context().clearCookies();
    const requestUrls: string[] = [];
    await page.route(CREDENTIALS_ROUTE, async (route) => {
      requestUrls.push(route.request().url());
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, code: "INVALID_CREDENTIALS" }),
      });
    });

    await page.goto("/en/login");
    await page.locator("input[name='email']").fill("locale-check@example.invalid");
    await page.locator("input[name='password']").fill("SyntheticLoginPassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(formAlert(page)).toBeVisible();
    expect(requestUrls).toHaveLength(1);
    expect(requestUrls[0]).toContain("locale=en");
  });

  test("successful mutation follows only the validated server destination", async ({ page }) => {
    await setSession(page);
    const requests = await stubPassword(page, {
      status: 200,
      clearCookie: true,
      body: { ok: true, redirectTo: "/id/login?next=%2Fid%2Fadmin%2Fberita" },
    });
    await page.goto("/id/change-password?next=%2Fid%2Fadmin%2Fberita");
    await fillPasswordForm(page);
    await page.getByRole("button", { name: "Perbarui kata sandi" }).click();

    await expect(page).toHaveURL(/\/id\/login\?next=%2Fid%2Fadmin%2Fberita$/);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toContain("locale=id");
    expect(requests[0]?.url).toContain("redirectTo=%2Fid%2Fadmin%2Fberita");
  });

  test("hostile next is forwarded for server judgment but never navigated to", async ({ page }) => {
    await setSession(page);
    const requests = await stubPassword(page, {
      status: 200,
      clearCookie: true,
      body: { ok: true, redirectTo: "/id/login?next=%2Fid%2Fadmin" },
    });
    await page.goto("/id/change-password?next=https%3A%2F%2Fevil.example%2Fsteal");
    await fillPasswordForm(page);
    await page.getByRole("button", { name: "Perbarui kata sandi" }).click();

    await expect(page).toHaveURL(/\/id\/login\?next=%2Fid%2Fadmin$/);
    expect(requests[0]?.url).toContain(
      "redirectTo=https%3A%2F%2Fevil.example%2Fsteal",
    );
    expect(page.url()).not.toContain("evil.example");
  });

  test("off-origin destination in an API response is refused", async ({ page }) => {
    await setSession(page);
    await stubPassword(page, {
      status: 200,
      body: { ok: true, redirectTo: "https://evil.example/steal" },
    });
    await page.goto("/id/change-password");
    await fillPasswordForm(page);
    await page.getByRole("button", { name: "Perbarui kata sandi" }).click();

    await expect(formAlert(page)).toContainText("sedang tidak tersedia");
    await expect(page).toHaveURL(/\/id\/change-password$/);
  });

  test("wrong current password is generic, focused, and clears only that field", async ({ page }) => {
    await setSession(page);
    await stubPassword(page, {
      status: 400,
      body: { ok: false, code: "INVALID_CREDENTIALS" },
    });
    await page.goto("/id/change-password");
    await fillPasswordForm(page);
    await page.getByRole("button", { name: "Perbarui kata sandi" }).click();

    await expect(formAlert(page)).toContainText("Kata sandi saat ini tidak sesuai");
    await expect(formAlert(page)).toBeFocused();
    await expect(page.locator("input[name='currentPassword']")).toHaveValue("");
    await expect(page.locator("input[name='newPassword']")).toHaveValue(NEW_PASSWORD);
  });

  test("policy and service failures expose no technical detail", async ({ page }) => {
    for (const failure of [
      { status: 400, code: "PASSWORD_POLICY" },
      { status: 503, code: "AUTH_UNAVAILABLE" },
    ] as const) {
      await setSession(page);
      await stubPassword(page, {
        status: failure.status,
        body: { ok: false, code: failure.code },
      });
      await page.goto("/id/change-password");
      await fillPasswordForm(page);
      await page.getByRole("button", { name: "Perbarui kata sandi" }).click();
      await expect(formAlert(page)).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/prisma|postgres|stack|503|hash|userId/i);
      await page.unroute(PASSWORD_ROUTE);
    }
  });

  test("rapid repeated submits produce one mutation request", async ({ page }) => {
    await setSession(page);
    const requests = await stubPassword(page, {
      status: 400,
      delayMs: 700,
      body: { ok: false, code: "INVALID_CREDENTIALS" },
    });
    await page.goto("/id/change-password");
    await fillPasswordForm(page);
    const submit = page.getByRole("button", { name: /Perbarui|Memperbarui/ });
    await submit.click();
    await submit.click({ force: true });
    await page.keyboard.press("Enter");
    await expect(formAlert(page)).toBeVisible();
    expect(requests).toHaveLength(1);
  });

  test("ID, EN, and AR forms are localized; Arabic keeps password values LTR", async ({ page }) => {
    for (const locale of ["id", "en", "ar"] as const) {
      await setSession(page);
      await page.goto(`/${locale}/change-password`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("input[name='currentPassword']")).toHaveAttribute("dir", "ltr");
    }
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("keyboard order follows current, toggle, new, toggle, confirmation, toggle, submit", async ({
    page,
  }) => {
    await setSession(page);
    await page.goto("/id/change-password");
    await page.locator("input[name='currentPassword']").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Tampilkan kata sandi saat ini" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("input[name='newPassword']")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Tampilkan kata sandi baru" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("input[name='confirmPassword']")).toBeFocused();
  });

  test("credentials stay out of URL, storage, cookies, scripts, and visible copy", async ({ page }) => {
    await setSession(page);
    await page.goto("/id/change-password");
    await fillPasswordForm(page);

    const surfaces = await page.evaluate(() => ({
      url: location.href,
      history: JSON.stringify(history.state ?? {}),
      storage: JSON.stringify({ ...localStorage, ...sessionStorage }),
      cookies: document.cookie,
      scripts: Array.from(document.querySelectorAll("script"))
        .map((script) => script.textContent ?? "")
        .join(""),
    }));
    for (const surface of Object.values(surfaces)) {
      expect(surface).not.toContain(CURRENT_PASSWORD);
      expect(surface).not.toContain(NEW_PASSWORD);
    }
    const body = await page.locator("body").innerText();
    expect(body).not.toContain(CURRENT_PASSWORD);
    expect(body).not.toContain(NEW_PASSWORD);
  });

  test("password and admin pages do not overflow at 360px in LTR or RTL", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    for (const locale of ["id", "ar"] as const) {
      await setSession(page);
      await page.goto(`/${locale}/change-password`);
      const passwordOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(passwordOverflow).toBe(false);
      await page.goto(`/${locale}/admin`);
      const adminOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(adminOverflow).toBe(false);
    }
  });
});
