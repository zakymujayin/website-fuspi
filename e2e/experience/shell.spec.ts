import { expect, test, type Page } from "@playwright/test";

const LOCALES = ["id", "en", "ar"] as const;
const BREAKPOINTS = [360, 390, 768, 1024, 1440] as const;

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );

test.describe("public shell", () => {
  for (const locale of LOCALES) {
    test(`${locale}: renders the shell landmarks and the five study programs`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/prodi`);

      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );

      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(5);
      await expect(page.getByText(/FUDA/i)).toHaveCount(0);
    });

    test(`${locale}: never scrolls horizontally`, async ({ page }) => {
      await page.goto(`/${locale}/prodi`);

      for (const width of BREAKPOINTS) {
        await page.setViewportSize({ width, height: 900 });
        expect(await horizontalOverflow(page), `${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }

  test("skip link is the first tab stop and moves focus to main", async ({ page }) => {
    await page.goto("/id/prodi");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Lompat ke konten utama" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await skipLink.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("switching language keeps the current page", async ({ page }) => {
    // The topbar switcher is desktop-only; the mobile one lives in the drawer.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/id/prodi");

    await page.getByRole("link", { name: "English" }).first().click();

    await expect(page).toHaveURL(/\/en\/prodi$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Study Programs");
  });

  test("arabic shell uses the Arabic UI stack with looser leading", async ({ page }) => {
    await page.goto("/ar/prodi");

    const typography = await page.evaluate(() => {
      const shell = document.querySelector("main");
      if (!shell) throw new Error("public shell is missing its main landmark");
      const style = getComputedStyle(shell);
      return {
        fontFamily: style.fontFamily,
        ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize),
      };
    });

    expect(typography.fontFamily).toMatch(/Plex Sans Arabic|Noto Sans Arabic/i);
    expect(typography.ratio).toBeGreaterThanOrEqual(1.7);
  });

  test("text on the dark bars meets WCAG AA contrast", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/id/prodi");

    type Sample = { ratio: number; color: string; background: string };

    const samples = await page.evaluate(() => {
      // Tailwind emits oklch()/lab() colors, so let the browser rasterise them
      // instead of parsing the string: a regex would eat the negative axes.
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("2d canvas is unavailable");

      const channels = (value: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
        return [r, g, b];
      };
      const luminance = ([r, g, b]: number[]) => {
        const linear = (c: number) => {
          const v = c / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
      };
      const backgroundOf = (element: Element) => {
        let node: Element | null = element;
        while (node) {
          const color = getComputedStyle(node).backgroundColor;
          if (color && !color.startsWith("rgba(0, 0, 0, 0")) return channels(color);
          node = node.parentElement;
        }
        return [255, 255, 255];
      };
      const contrast = (element: Element) => {
        const [light, dark] = [
          luminance(channels(getComputedStyle(element).color)),
          luminance(backgroundOf(element)),
        ].sort((a, b) => b - a);
        return (light + 0.05) / (dark + 0.05);
      };

      const selectors = {
        utility: 'nav[aria-label="Layanan sistem"] a',
        switcher: 'header nav[aria-label="Pilih bahasa"] a:not([aria-current])',
        content: 'nav[aria-label="Kanal konten"] a',
        footer: "footer nav a",
      };

      return Object.fromEntries(
        Object.entries(selectors).map(([name, selector]) => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`missing element for ${name}`);
          return [
            name,
            {
              ratio: contrast(element),
              color: getComputedStyle(element).color,
              background: backgroundOf(element).join(","),
            },
          ];
        }),
      ) as Record<keyof typeof selectors, Sample>;
    });

    for (const [name, sample] of Object.entries(samples)) {
      expect(
        sample.ratio,
        `${name}: ${sample.color} on rgb(${sample.background})`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("mobile drawer opens, closes with Escape, and restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/id/prodi");

    const trigger = page.getByRole("button", { name: "Buka menu" });
    await trigger.click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Berita" })).toBeVisible();
    // Study programs sit in a collapsed accordion until it is expanded.
    await drawer.getByText("Program Studi", { exact: true }).click();
    await expect(drawer.getByRole("link", { name: "Ilmu Hadis" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
