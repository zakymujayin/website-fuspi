import { expect, test, type Page } from "@playwright/test";

/* Fixtures use reserved, non-resolvable domains only. No real credential and no
   FUSPI staff address may ever appear in a test file. */
const UNKNOWN_EMAIL = "tidak-terdaftar@example.invalid";
const KNOWN_EMAIL = "pengelola@example.invalid";
const INACTIVE_EMAIL = "nonaktif@example.invalid";
const PASSWORD = "kata-sandi-percobaan";

const CREDENTIALS_ROUTE = "**/api/auth/credentials*";

type Stub = {
  status: number;
  body: unknown;
  delayMs?: number;
};

/** Intercepts the credentials endpoint and records every request that reaches it. */
async function stubCredentials(page: Page, stub: Stub) {
  const requests: string[] = [];

  await page.route(CREDENTIALS_ROUTE, async (route) => {
    requests.push(route.request().url());
    if (stub.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, stub.delayMs));
    }
    await route.fulfill({
      status: stub.status,
      contentType: "application/json",
      body: JSON.stringify(stub.body),
    });
  });

  return requests;
}

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.locator("input[name='email']").fill(email);
  await page.locator("input[name='password']").fill(password);
  await page.getByRole("button", { name: /masuk|sign in|تسجيل الدخول/i }).click();
}

/* Scoped to the form: Next injects its own role="alert" route announcer. */
const alertRegion = (page: Page) => page.locator("form [role='alert']");

test.describe("login — localisation and direction", () => {
  test("renders a localized login card in every locale", async ({ page }) => {
    for (const locale of ["id", "en", "ar"] as const) {
      await page.goto(`/${locale}/login`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("FUSPI");
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.getByRole("button", { name: /masuk|sign in|تسجيل الدخول/i })).toBeVisible();
    }
  });

  test("Arabic renders RTL while credential values stay LTR", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("input[name='email']")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("input[name='password']")).toHaveAttribute("dir", "ltr");
  });

  test("switching language keeps the login path", async ({ page }) => {
    await page.goto("/id/login");
    await page.getByRole("link", { name: "العربية" }).click();
    await expect(page).toHaveURL(/\/ar\/login$/);
  });

  test("no horizontal overflow at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    for (const locale of ["id", "ar"] as const) {
      await page.goto(`/${locale}/login`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    }
  });
});

test.describe("login — generic credential failure", () => {
  test("invalid credentials move focus to the alert, clear only the password", async ({ page }) => {
    await stubCredentials(page, {
      status: 401,
      body: { ok: false, code: "INVALID_CREDENTIALS" },
    });

    await page.goto("/id/login");
    // The live regions must exist before anything fails; a region inserted at
    // the same moment its content arrives is often never announced.
    await expect(alertRegion(page)).toHaveCount(1);

    await signIn(page, KNOWN_EMAIL);

    await expect(alertRegion(page)).toContainText("Email atau kata sandi salah");
    await expect(alertRegion(page)).toBeFocused();
    await expect(page.locator("input[name='email']")).toHaveValue(KNOWN_EMAIL);
    await expect(page.locator("input[name='password']")).toHaveValue("");
    await expect(page.locator("input[name='email']")).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("input[name='password']")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("unknown, wrong-password and inactive accounts are byte-identical", async ({ page }) => {
    await stubCredentials(page, {
      status: 401,
      body: { ok: false, code: "INVALID_CREDENTIALS" },
    });

    const surfaces: string[] = [];

    for (const email of [UNKNOWN_EMAIL, KNOWN_EMAIL, INACTIVE_EMAIL]) {
      await page.goto("/id/login");
      await signIn(page, email);
      await expect(alertRegion(page)).toContainText("Email atau kata sandi salah");
      surfaces.push(await alertRegion(page).innerHTML());
    }

    expect(surfaces[1]).toBe(surfaces[0]);
    expect(surfaces[2]).toBe(surfaces[0]);
  });

  test("the alert never names the failure reason", async ({ page }) => {
    await stubCredentials(page, {
      status: 401,
      body: { ok: false, code: "INVALID_CREDENTIALS" },
    });

    await page.goto("/id/login");
    await signIn(page, UNKNOWN_EMAIL);
    await expect(alertRegion(page)).toBeVisible();

    const body = (await page.locator("body").innerText()).toLowerCase();
    for (const forbidden of [
      "tidak terdaftar",
      "tidak ditemukan",
      "dinonaktifkan",
      "percobaan tersisa",
      "sisa percobaan",
    ]) {
      expect(body).not.toContain(forbidden);
    }
  });
});

test.describe("login — rate limit and service failure", () => {
  test("rate limit blocks further requests and exposes no counter", async ({ page }) => {
    const requests = await stubCredentials(page, {
      status: 429,
      body: { ok: false, code: "TRY_AGAIN_LATER" },
    });

    await page.goto("/id/login");
    await signIn(page, KNOWN_EMAIL);

    const submit = page.getByRole("button", { name: "Masuk" });

    await expect(alertRegion(page)).toContainText("Terlalu banyak percobaan masuk");
    await expect(submit).toHaveAttribute("aria-disabled", "true");

    // aria-disabled rather than disabled: the button keeps its place in the tab
    // order, so a keyboard user still reaches it and hears, through
    // aria-describedby, why pressing it will not help.
    await expect(submit).not.toHaveAttribute("disabled", /.*/);
    await submit.focus();
    await expect(submit).toBeFocused();
    const describedBy = await submit.getAttribute("aria-describedby");
    expect(describedBy).toBe(await alertRegion(page).getAttribute("id"));

    // No remaining-attempt count anywhere on the surface.
    await expect(page.locator("body")).not.toContainText(/\d+\s*(percobaan|attempts?)/i);

    await submit.click({ force: true });
    expect(requests).toHaveLength(1);

    // Editing a field re-arms the form; the server remains the sole authority.
    await page.locator("input[name='email']").fill(UNKNOWN_EMAIL);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect.poll(() => requests.length).toBe(2);
  });

  test("a sanitized service failure is shown for a 503", async ({ page }) => {
    await stubCredentials(page, {
      status: 503,
      body: { ok: false, code: "AUTH_UNAVAILABLE" },
    });

    await page.goto("/id/login");
    await signIn(page, KNOWN_EMAIL);

    await expect(alertRegion(page)).toContainText("Layanan masuk sedang tidak tersedia");
    await expect(page.locator("body")).not.toContainText(/503|prisma|bcrypt|stack/i);
  });

  test("a malformed response degrades to the generic unavailable state", async ({ page }) => {
    await stubCredentials(page, { status: 200, body: { ok: true } });

    await page.goto("/id/login");
    await signIn(page, KNOWN_EMAIL);

    await expect(alertRegion(page)).toContainText("Layanan masuk sedang tidak tersedia");
    await expect(page).toHaveURL(/\/id\/login/);
  });
});

test.describe("login — submission behaviour", () => {
  test("rapid repeated submits produce exactly one request", async ({ page }) => {
    const requests = await stubCredentials(page, {
      status: 401,
      body: { ok: false, code: "INVALID_CREDENTIALS" },
      delayMs: 700,
    });

    await page.goto("/id/login");
    await page.locator("input[name='email']").fill(KNOWN_EMAIL);
    await page.locator("input[name='password']").fill(PASSWORD);

    const submit = page.getByRole("button", { name: /Masuk|Memverifikasi/ });
    await submit.click();
    await submit.click({ force: true });
    await submit.click({ force: true });
    await page.keyboard.press("Enter");

    await expect(alertRegion(page)).toBeVisible();
    expect(requests).toHaveLength(1);
  });

  test("the loading state announces once and keeps the button focusable", async ({ page }) => {
    await stubCredentials(page, {
      status: 401,
      body: { ok: false, code: "INVALID_CREDENTIALS" },
      delayMs: 900,
    });

    await page.goto("/id/login");
    await page.locator("input[name='email']").fill(KNOWN_EMAIL);
    await page.locator("input[name='password']").fill(PASSWORD);
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.locator("form")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("[aria-live='polite']")).toContainText("Memverifikasi kredensial");

    // Focus must never fall back to <body> while the request is in flight.
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? "");
    expect(focusedTag).not.toBe("BODY");
  });
});

test.describe("login — password visibility toggle", () => {
  test("toggle exposes its pressed state and swaps the input type", async ({ page }) => {
    await page.goto("/id/login");

    const password = page.locator("input[name='password']");
    const toggle = page.getByRole("button", { name: "Tampilkan kata sandi" });

    await expect(password).toHaveAttribute("type", "password");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Sembunyikan kata sandi" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("tab order runs email → password → toggle → submit", async ({ page }) => {
    await page.goto("/id/login");
    await page.locator("input[name='email']").focus();

    await page.keyboard.press("Tab");
    await expect(page.locator("input[name='password']")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Tampilkan kata sandi" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Masuk" })).toBeFocused();
  });
});

test.describe("login — safe destination", () => {
  test("navigates only to the server-returned destination", async ({ page }) => {
    const requests = await stubCredentials(page, {
      status: 200,
      body: { ok: true, redirectTo: "/id/admin", requiresPasswordChange: false },
    });

    await page.goto("/id/login?next=%2Fid%2Fadmin%2Fberita");
    await signIn(page, KNOWN_EMAIL);

    await page.waitForURL(/\/id\/admin$/);
    // The untrusted value is forwarded verbatim for the server to judge.
    expect(requests[0]).toContain("redirectTo=%2Fid%2Fadmin%2Fberita");
  });

  test("a hostile ?next= never becomes a client-side destination", async ({ page }) => {
    const requests = await stubCredentials(page, {
      status: 200,
      body: { ok: true, redirectTo: "/id/admin", requiresPasswordChange: false },
    });

    await page.goto("/id/login?next=https%3A%2F%2Fevil.example%2Fsteal");
    await signIn(page, KNOWN_EMAIL);

    await page.waitForURL(/\/id\/admin$/);
    expect(requests[0]).toContain("redirectTo=https%3A%2F%2Fevil.example%2Fsteal");
    expect(page.url()).not.toContain("evil.example");
  });

  test("an off-origin destination in the response is refused", async ({ page }) => {
    await stubCredentials(page, {
      status: 200,
      body: { ok: true, redirectTo: "https://evil.example", requiresPasswordChange: false },
    });

    await page.goto("/id/login");
    await signIn(page, KNOWN_EMAIL);

    // The contract rejects it, so the UI treats the response as unusable rather
    // than following an off-origin redirect it was handed.
    await expect(alertRegion(page)).toContainText("Layanan masuk sedang tidak tersedia");
    await expect(page).toHaveURL(/\/id\/login/);
  });

  test("a forced password change precedes the stored destination", async ({ page }) => {
    await stubCredentials(page, {
      status: 200,
      body: { ok: true, redirectTo: "/id/admin/berita", requiresPasswordChange: true },
    });

    await page.goto("/id/login?next=%2Fid%2Fadmin%2Fberita");
    await signIn(page, KNOWN_EMAIL);

    await page.waitForURL(/\/id\/change-password\?next=%2Fid%2Fadmin%2Fberita$/);
  });

  test("the stored destination is never rendered on the login screen", async ({ page }) => {
    await page.goto("/id/login?next=%2Fid%2Fadmin%2Fberita%2Frahasia");
    await expect(page.locator("body")).not.toContainText("rahasia");
  });
});
