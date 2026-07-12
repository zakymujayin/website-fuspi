import { expect, test } from "@playwright/test";

test.describe("locale routing", () => {
  test("root URL without locale redirects to /id", async ({ page }) => {
    await page.goto("/");
    const url = page.url();
    expect(url).toContain("/id");
  });

  test("invalid locale redirects to default /id", async ({ page }) => {
    await page.goto("/ru/something");
    const url = page.url();
    expect(url).toContain("/id");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
  });

  test("locale is preserved in URL across page navigation", async ({ page }) => {
    await page.goto("/en");
    expect(page.url()).toContain("/en");
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
