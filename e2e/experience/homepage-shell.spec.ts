import { expect, test, type Page } from "@playwright/test";

const LOCALES = ["id", "en", "ar"] as const;
const BREAKPOINTS = [360, 390, 768, 1024, 1440] as const;

const SKIP_LINK_LABEL: Record<(typeof LOCALES)[number], string> = {
  id: "Lompat ke konten utama",
  en: "Skip to main content",
  ar: "تخطَّ إلى المحتوى الرئيسي",
};

const HEADLINE: Record<(typeof LOCALES)[number], RegExp> = {
  id: /Fondasi website FUSPI siap dikembangkan/,
  en: /The FUSPI website foundation is ready/,
  ar: /الأساس التقني لموقع الكلية جاهز/,
};

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("homepage shell", () => {
  for (const locale of LOCALES) {
    test(`${locale}: homepage renders inside the public shell with one main landmark`, async ({
      page,
    }) => {
      await page.goto(`/${locale}`);

      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();

      // The public layout owns the only <main>; the page must not nest another.
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.getByRole("main")).toBeVisible();

      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toHaveCount(1);
      await expect(heading).toHaveText(HEADLINE[locale]);
      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
    });

    test(`${locale}: homepage keeps the M0 status copy`, async ({ page }) => {
      await page.goto(`/${locale}`);

      await expect(page.getByRole("status")).toBeVisible();
      await expect(page.getByRole("status")).not.toBeEmpty();
    });

    test(`${locale}: html direction matches the locale`, async ({ page }) => {
      await page.goto(`/${locale}`);

      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
    });

    test(`${locale}: homepage carries FUSPI identity and no FUDA identity`, async ({
      page,
    }) => {
      await page.goto(`/${locale}`);

      await expect(page.getByText(/FUSPI/).first()).toBeVisible();
      await expect(page.getByText(/FUDA/i)).toHaveCount(0);
      await expect(page.locator('a[href*="fuda.uinbanten.ac.id"]')).toHaveCount(0);
    });

    test(`${locale}: homepage never scrolls horizontally`, async ({ page }) => {
      await page.goto(`/${locale}`);

      for (const width of BREAKPOINTS) {
        await page.setViewportSize({ width, height: 900 });
        expect(await horizontalOverflow(page), `${width}px`).toBeLessThanOrEqual(0);
      }
    });

    test(`${locale}: skip link is the first tab stop and targets the shell main`, async ({
      page,
    }) => {
      await page.goto(`/${locale}`);

      await page.keyboard.press("Tab");
      const skipLink = page.getByRole("link", { name: SKIP_LINK_LABEL[locale] });
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();
      await expect(skipLink).toHaveAttribute("href", "#main");

      await skipLink.press("Enter");
      await expect(page.getByRole("main")).toBeFocused();
    });
  }

  test("ar: the RTL homepage anchors its content to the right edge", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/ar");

    const status = page.locator(".foundation-status");
    await expect(status).toBeVisible();

    // The status border is a logical inline-start edge, so it must mirror to the
    // right in Arabic instead of staying pinned to the left.
    const borderSide = await status.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        right: parseFloat(style.borderRightWidth),
        left: parseFloat(style.borderLeftWidth),
      };
    });

    expect(borderSide.right).toBeGreaterThan(0);
    expect(borderSide.left).toBe(0);
  });
});
