import {expect, test} from "@playwright/test";

for (const locale of ["id", "en", "ar"] as const) {
  test(`${locale} locale renders with the correct direction`, async ({page}) => {
    await page.goto(`/${locale}`);

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("FUSPI · M0")).toBeVisible();
    await expect(page.getByText(/FUDA/)).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute(
      "dir",
      locale === "ar" ? "rtl" : "ltr",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  });
}
