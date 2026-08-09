import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const BREAKPOINTS = [360, 390, 768, 1024, 1440] as const;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

test.describe("M4 Page admin UI — protected route", () => {
  test("redirects /id/admin/pages to the login page without leaking content", async ({ page }) => {
    await page.goto("/id/admin/pages");
    await page.waitForURL(/\/id\/login/);
    await expect(page.locator("h1")).toContainText(/Masuk|Sign in|تسجيل الدخول/);
    const body = await page.locator("body").innerText();
    expect(body).not.toContain("SESSION_INVALID");
    expect(body).not.toContain("Prisma");
    expect(body).not.toContain("pageId");
    expect(body).not.toContain("UNAVAILABLE");
  });

  test("redirects /en/admin/pages to the English login page", async ({ page }) => {
    await page.goto("/en/admin/pages");
    await page.waitForURL(/\/en\/login/);
  });

  test("redirects /ar/admin/pages with RTL direction preserved", async ({ page }) => {
    await page.goto("/ar/admin/pages");
    await page.waitForURL(/\/ar\/login/);
    const html = await page.locator("html").first();
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");
  });

  test("login page passes axe accessibility checks", async ({ page }) => {
    await page.goto("/id/login");
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("M4 Page admin UI — public shell rendering", () => {
  test("has no horizontal overflow at required breakpoints", async ({ page }) => {
    for (const width of BREAKPOINTS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/id/admin/pages/new");
      await page.waitForURL(/\/id\/login/);
      const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const windowWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(windowWidth);
    }
  });

  test("keyboard focus is visible on login controls", async ({ page }) => {
    await page.goto("/id/login");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    const outline = await focused.evaluate((el) => window.getComputedStyle(el).outlineWidth);
    expect(outline).not.toBe("0px");
  });
});

test.describe("M4 Page admin UI — authenticated flows", () => {
  test.skip(
    !process.env.DATABASE_URL,
    "Authenticated Page admin tests require an isolated PostgreSQL database.",
  );

  test("shows the create page form with ID required and EN/AR optional tabs", async ({ page }) => {
    test.skip(true, "Backend session fixture helper is not yet available on this branch.");
    await page.goto("/id/admin/pages/new");
    await expect(page.locator("[role='tab']")).toHaveCount(3);
    await expect(page.locator("h1")).toContainText("Tambah Halaman");
  });
});
