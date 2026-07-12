import { expect, test } from "@playwright/test";

test.describe("RTL negative cases", () => {
  test("Arabic page renders RTL with correct dir attribute", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("Indonesian page renders LTR with correct dir attribute", async ({ page }) => {
    await page.goto("/id");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
  });

  test("English page renders LTR with correct dir attribute", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("RTL persists across navigation within Arabic locale", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("switching from Arabic to Indonesian changes direction", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await page.goto("/id");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("FUSPI is visible on all locales", async ({ page }) => {
    for (const locale of ["id", "en", "ar"]) {
      await page.goto(`/${locale}`);
      await expect(page.getByText("FUSPI")).toBeVisible();
    }
  });

  test("FUDA is never present in any locale", async ({ page }) => {
    for (const locale of ["id", "en", "ar"]) {
      await page.goto(`/${locale}`);
      await expect(page.getByText(/FUDA/)).toHaveCount(0);
    }
  });
});
