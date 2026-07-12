import { expect, test } from "@playwright/test";

test.describe("locale routing", () => {
  test("navigating to /id renders the page", async ({ page }) => {
    await page.goto("/id");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("navigating to /en renders the page", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("navigating to /ar renders the page with RTL direction", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("each locale renders h1 element", async ({ page }) => {
    for (const locale of ["id", "en", "ar"]) {
      await page.goto(`/${locale}`);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("M0 tag is visible across locales", async ({ page }) => {
    for (const locale of ["id", "en", "ar"]) {
      await page.goto(`/${locale}`);
      await expect(page.getByText("FUSPI · M0")).toBeVisible();
    }
  });
});
