import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const LOCALES = ["id", "en", "ar"] as const;
const BREAKPOINTS = [360, 390, 768, 1024, 1440] as const;

/** The utility bar retracts; all 76px of the identity/navigation bar remain visible. */
const COMPACT_BAR_HEIGHT = 76;

/** A route that renders the whole shell without needing seeded content. */
const SHELL_PATH = "/prodi";

const OPEN_MENU = { id: "Buka menu", en: "Open menu", ar: "فتح القائمة" } as const;
const SKIP_TO_CONTENT = {
  id: "Lompat ke konten utama",
  en: "Skip to main content",
  ar: "تخطَّ إلى المحتوى الرئيسي",
} as const;
const ACADEMICS_GROUP = {
  id: "Akademik",
  en: "Academics",
  ar: "الشؤون الأكاديمية",
} as const;
const RESEARCH_GROUP = {
  id: "Riset & PkM",
  en: "Research & Community Service",
  ar: "البحث وخدمة المجتمع",
} as const;
const EXTERNAL_HINT = {
  id: "(situs eksternal, terbuka di tab baru)",
  en: "(external site, opens in a new tab)",
  ar: "(موقع خارجي، يُفتح في تبويب جديد)",
} as const;

const GKM_LABEL = {
  id: "GKM",
  en: "Quality Assurance",
  ar: "ضمان الجودة",
} as const;

const UTILITY_NAV = /Layanan sistem|Campus systems|أنظمة الجامعة/;

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

/**
 * `getBoundingClientRect` includes the compact transform, `offsetHeight` does
 * not — the pair is what proves the header shrinks visually while keeping its
 * flow height, so nothing below it can move.
 */
const headerGeometry = (page: Page) =>
  page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) throw new Error("public shell is missing its banner landmark");

    const rect = header.getBoundingClientRect();

    return {
      visibleBottom: Math.round(rect.bottom),
      flowHeight: header.offsetHeight,
      position: getComputedStyle(header).position,
      compact: header.getAttribute("data-compact"),
    };
  });

/** Polls, because the compact translate animates over 200ms. */
const expectPinnedBar = (page: Page, expected: number) =>
  expect
    .poll(async () => (await headerGeometry(page)).visibleBottom, {
      message: "pinned bar height after the compact transition settles",
    })
    .toBe(expected);

const documentMetrics = (page: Page) =>
  page.evaluate(() => {
    const heading = document.querySelector("main h1");
    if (!heading) throw new Error("shell route is missing its h1");

    return {
      headingDocumentTop: Math.round(
        heading.getBoundingClientRect().top + window.scrollY,
      ),
      scrollHeight: document.documentElement.scrollHeight,
    };
  });

const scrollTo = async (page: Page, y: number) => {
  await page.evaluate((target) => window.scrollTo(0, target), y);
  await page.waitForFunction((target) => window.scrollY >= target, y);
  // The scroll listener commits React state asynchronously, so settle on the
  // resulting attribute before any geometry is read.
  await expect(page.locator("header")).toHaveAttribute(
    "data-compact",
    y > 100 ? "true" : "false",
  );
};

/**
 * `toBeVisible` resolves as soon as the panel has a box, which is mid-slide, so
 * geometry and axe assertions must wait for the transform to resolve to
 * identity before they read anything.
 */
const openDrawer = async (page: Page, locale: keyof typeof OPEN_MENU) => {
  await page.getByRole("button", { name: OPEN_MENU[locale] }).click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await page.waitForFunction(() => {
    const panel = document.querySelector("[role=dialog]");
    if (!panel) return false;

    // Tailwind v4 slides the panel with the standalone `translate` property,
    // so `transform` alone reports "none" the whole way in.
    const { transform, translate } = getComputedStyle(panel);
    const settled = (value: string) =>
      value === "none" || value === "" || /^(0px)( 0px)?$/.test(value)
      || value === "matrix(1, 0, 0, 1, 0, 0)";

    return settled(transform) && settled(translate);
  });

  return drawer;
};

/**
 * Computed transition duration of both drawer elements, in seconds, one entry
 * per animated property.
 */
const drawerDurations = (page: Page) =>
  page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`drawer is missing ${selector}`);

      return getComputedStyle(element)
        .transitionDuration.split(",")
        .map((value) => {
          const trimmed = value.trim();
          return Number.parseFloat(trimmed) * (trimmed.endsWith("ms") ? 0.001 : 1);
        });
    };

    return {
      backdrop: read('[data-slot="drawer-backdrop"]'),
      panel: read('[data-slot="drawer-panel"]'),
    };
  });

const gotoScrollable = async (page: Page, locale: string) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`/${locale}${SHELL_PATH}`);
  await expect(page.locator("header")).toHaveAttribute("data-compact", "false");

  const scrollable = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(scrollable, "route must be tall enough to cross the 100px threshold").toBeGreaterThan(
    300,
  );
};

test.describe("public shell hardening — compact sticky header", () => {
  test("compacts only past 100px and moves no page content", async ({ page }) => {
    await gotoScrollable(page, "id");

    const before = await documentMetrics(page);
    const expanded = await headerGeometry(page);
    expect(expanded.position).toBe("sticky");
    expect(expanded.visibleBottom).toBe(expanded.flowHeight);

    // Exactly at the threshold the header is still expanded.
    await scrollTo(page, 100);
    await expect(page.locator("header")).toHaveAttribute("data-compact", "false");

    await scrollTo(page, 140);
    await expect(page.locator("header")).toHaveAttribute("data-compact", "true");

    await expectPinnedBar(page, COMPACT_BAR_HEIGHT);

    // The flow box never changes, so the document cannot reflow.
    expect((await headerGeometry(page)).flowHeight).toBe(expanded.flowHeight);
    expect(await documentMetrics(page)).toEqual(before);

    await scrollTo(page, 0);
    await expectPinnedBar(page, expanded.flowHeight);
  });

  test("keeps the compact bar pinned to the top while scrolling on", async ({ page }) => {
    await gotoScrollable(page, "id");
    await scrollTo(page, 400);

    expect((await headerGeometry(page)).compact).toBe("true");
    await expectPinnedBar(page, COMPACT_BAR_HEIGHT);

    await expect(page.getByRole("banner")).toBeVisible();
    // The primary navigation stays reachable in the compact bar.
    await expect(page.getByRole("navigation", { name: "Menu utama" })).toBeVisible();
  });

  test("hydrates the header without a mismatch", async ({ page }) => {
    const problems: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));

    await gotoScrollable(page, "ar");
    await scrollTo(page, 300);
    await expect(page.locator("header")).toHaveAttribute("data-compact", "true");

    expect(
      problems.filter((text) =>
        /hydrat|did not match|server rendered|Minified React error #(418|423|425)/i.test(text),
      ),
    ).toEqual([]);
  });

  test("still compacts under prefers-reduced-motion, without animating", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoScrollable(page, "id");

    const seconds = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) throw new Error("public shell is missing its banner landmark");

      return getComputedStyle(header)
        .transitionDuration.split(",")
        .map((value) => Number.parseFloat(value) * (value.includes("ms") ? 0.001 : 1));
    });

    for (const value of seconds) expect(value).toBeLessThan(0.05);

    await scrollTo(page, 300);
    await expectPinnedBar(page, COMPACT_BAR_HEIGHT);
  });

  test("drawer backdrop and panel animate by default", async ({ page }) => {
    // The baseline half of the pair below. Without it, "every duration is under
    // 0.05s" would also hold for elements that simply never animate, and the
    // reduced-motion assertion would prove nothing about the media query.
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto(`/id${SHELL_PATH}`);
    await openDrawer(page, "id");

    const durations = await drawerDurations(page);

    for (const [element, values] of Object.entries(durations)) {
      expect(values.length, `${element} declares no transition`).toBeGreaterThan(0);
      for (const value of values) {
        expect(value, `${element} default duration`).toBeGreaterThan(0.05);
      }
    }
  });

  test("drawer backdrop and panel both stop animating under prefers-reduced-motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto(`/id${SHELL_PATH}`);

    const drawer = await openDrawer(page, "id");
    await expect(drawer).toBeVisible();

    const durations = await drawerDurations(page);

    expect(durations.backdrop.length).toBeGreaterThan(0);
    expect(durations.panel.length).toBeGreaterThan(0);

    for (const [element, values] of Object.entries(durations)) {
      for (const value of values) {
        expect(value, `${element} reduced-motion duration`).toBeLessThan(0.05);
      }
    }
  });
});

test.describe("public shell hardening — keyboard and focus", () => {
  test("skip link is the first tab stop, is visibly focused, and clears the sticky header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto(`/id${SHELL_PATH}`);

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: SKIP_TO_CONTENT.id });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    const outline = await skipLink.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).outlineWidth),
    );
    expect(outline).toBeGreaterThanOrEqual(2);

    await skipLink.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();

    // The skip target must not land behind the pinned header.
    const clearance = await page.evaluate(() => {
      const main = document.querySelector("main");
      const header = document.querySelector("header");
      if (!main || !header) throw new Error("public shell landmarks are missing");

      return (
        main.getBoundingClientRect().top - header.getBoundingClientRect().bottom
      );
    });
    expect(clearance).toBeGreaterThanOrEqual(0);
  });

  test("desktop dropdown opens with the keyboard, closes with Escape, and returns focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/id${SHELL_PATH}`);

    const trigger = page.getByRole("button", { name: RESEARCH_GROUP.id });
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("menuitem")).toHaveCount(2);

    await page.keyboard.press("ArrowDown");
    expect(
      await page.evaluate(() => document.activeElement?.getAttribute("role")),
    ).toBe("menuitem");

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("header links show a visible focus ring", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/id${SHELL_PATH}`);

    // Tab past the skip link into the content bar.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    const focused = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) throw new Error("nothing is focused");

      const style = getComputedStyle(element);

      return {
        tag: element.tagName,
        inHeader: Boolean(element.closest("header")),
        outlineWidth: Number.parseFloat(style.outlineWidth),
        outlineStyle: style.outlineStyle,
      };
    });

    expect(focused.tag).toBe("A");
    expect(focused.inHeader).toBe(true);
    expect(focused.outlineStyle).not.toBe("none");
    expect(focused.outlineWidth).toBeGreaterThanOrEqual(2);
  });

  test("mobile drawer traps focus, closes with Escape, and restores the trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`/id${SHELL_PATH}`);

    const trigger = page.getByRole("button", { name: OPEN_MENU.id });
    const drawer = await openDrawer(page, "id");
    await expect(drawer.getByRole("heading", { name: "Menu", exact: true })).toBeVisible();

    // Focus stays inside the panel while tabbing.
    for (let step = 0; step < 8; step += 1) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]"))),
        `tab step ${step}`,
      ).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("drawer submenu is an accordion that works from the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`/id${SHELL_PATH}`);

    const drawer = await openDrawer(page, "id");

    const summary = drawer.locator("summary", { hasText: ACADEMICS_GROUP.id });
    await expect(drawer.getByRole("link", { name: "Ilmu Hadis" })).toBeHidden();

    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(drawer.getByRole("link", { name: "Ilmu Hadis" })).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(drawer.getByRole("link", { name: "Ilmu Hadis" })).toBeHidden();
  });
});

test.describe("public shell hardening — drawer structure", () => {
  test("presents the language choice before the navigation groups", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto(`/id${SHELL_PATH}`);
    const drawer = await openDrawer(page, "id");

    const headings = await drawer
      .locator("h3")
      .evaluateAll((elements) => elements.map((element) => element.id));

    expect(headings).toEqual([
      "drawer-language",
      "drawer-primary",
      "drawer-content",
      "drawer-utility",
    ]);

    // All three header layers are present in the one drawer.
    for (const name of ["Pilih bahasa", "Menu utama", "Kanal konten", "Layanan sistem"]) {
      await expect(drawer.getByRole("navigation", { name })).toBeVisible();
    }
  });

  test("holds every drawer target at 44px, including the expanded submenu", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`/id${SHELL_PATH}`);
    const drawer = await openDrawer(page, "id");
    await drawer.locator("summary", { hasText: ACADEMICS_GROUP.id }).click();
    await expect(drawer.getByRole("link", { name: "Ilmu Hadis" })).toBeVisible();

    const targets = await drawer
      .locator("a, button, summary")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const rect = element.getBoundingClientRect();

          return {
            label: (element.textContent ?? "").trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        }),
      );

    expect(targets.length).toBeGreaterThan(20);
    for (const target of targets) {
      expect(target.height, `height of "${target.label}"`).toBeGreaterThanOrEqual(44);
      expect(target.width, `width of "${target.label}"`).toBeGreaterThanOrEqual(44);
    }
  });

  for (const locale of LOCALES) {
    test(`${locale}: drawer enters from the inline-end edge`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(`/${locale}${SHELL_PATH}`);
      const drawer = await openDrawer(page, locale);

      const box = await drawer.boundingBox();
      if (!box) throw new Error("drawer has no box");

      if (locale === "ar") {
        // RTL: inline-end is the left edge.
        expect(Math.round(box.x)).toBe(0);
        expect(Math.round(box.x + box.width)).toBeLessThan(360);
      } else {
        expect(Math.round(box.x + box.width)).toBe(360);
        expect(Math.round(box.x)).toBeGreaterThan(0);
      }
    });
  }
});

test.describe("public shell hardening — external destinations", () => {
  for (const locale of LOCALES) {
    test(`${locale}: campus-system links are isolated and announced`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}${SHELL_PATH}`);

      const utility = page.getByRole("navigation", { name: UTILITY_NAV });
      const external = utility.locator('a[target="_blank"]');

      await expect(external).toHaveCount(3);

      for (const anchor of await external.all()) {
        const [href, rel, name] = await Promise.all([
          anchor.getAttribute("href"),
          anchor.getAttribute("rel"),
          anchor.evaluate((element) => (element.textContent ?? "").trim()),
        ]);

        expect(href).toMatch(/^https:\/\//);
        expect(rel).toContain("noopener");
        expect(rel).toContain("noreferrer");
        expect(name).toContain(EXTERNAL_HINT[locale]);
      }

      const gkm = utility.getByRole("link", { name: new RegExp(`^${GKM_LABEL[locale]}`) });
      await expect(gkm).toHaveCount(1);
      await expect(gkm).toHaveAttribute("href", "https://gkm-fuda.uinbanten.ac.id/");
      await expect(gkm).toHaveAttribute("target", "_blank");
    });
  }

  for (const locale of LOCALES) {
    test(`${locale}: the drawer's GKM utility entry is external too`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 780 });
      await page.goto(`/${locale}${SHELL_PATH}`);
      const drawer = await openDrawer(page, locale);

      const gkm = drawer.getByRole("link", { name: new RegExp(`^${GKM_LABEL[locale]}`) });

      await expect(gkm).toHaveCount(1);
      await expect(gkm).toHaveAttribute("href", "https://gkm-fuda.uinbanten.ac.id/");
      await expect(gkm).toHaveAttribute("target", "_blank");
    });
  }

  test("activating an external utility entry closes the drawer", async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto(`/id${SHELL_PATH}`);
    const drawer = await openDrawer(page, "id");

    const external = drawer.locator('a[target="_blank"]').first();
    await expect(external).toBeVisible();

    // target="_blank" hands the destination to a new tab, so this page stays
    // put — which is exactly what makes the close observable here.
    const [opened] = await Promise.all([
      context.waitForEvent("page"),
      external.click(),
    ]);

    await expect(drawer).toBeHidden();
    expect(page.url()).toContain(`/id${SHELL_PATH}`);
    await opened.close();
  });

  test("no shell surface links to the old FUDA faculty identity", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/id${SHELL_PATH}`);

    const hosts = await page.evaluate(() =>
      [...document.querySelectorAll("header a, footer a")]
        .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "")
        .filter((href) => /^https?:/.test(href))
        .map((href) => new URL(href).host),
    );

    for (const host of hosts) {
      expect(host).not.toBe("fuda.uinbanten.ac.id");
    }
    expect(await page.getByText(/FUDA/i).count()).toBe(0);
  });
});

test.describe("public shell hardening — landmarks and axe", () => {
  for (const locale of LOCALES) {
    test(`${locale}: declares one banner, one main, and one contentinfo`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}${SHELL_PATH}`);

      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      await expect(page.locator("html")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
    });

    test(`${locale}: axe WCAG A/AA over the whole shell`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/${locale}${SHELL_PATH}`);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test(`${locale}: axe WCAG A/AA with the drawer open`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(`/${locale}${SHELL_PATH}`);
      await openDrawer(page, locale);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test(`${locale}: axe WCAG A/AA on the compact header`, async ({ page }) => {
      await gotoScrollable(page, locale);
      await scrollTo(page, 300);
      await expect(page.locator("header")).toHaveAttribute("data-compact", "true");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("public shell hardening — responsive", () => {
  for (const locale of LOCALES) {
    test(`${locale}: never scrolls horizontally, expanded or compact`, async ({ page }) => {
      await page.goto(`/${locale}${SHELL_PATH}`);

      for (const width of BREAKPOINTS) {
        await page.setViewportSize({ width, height: 640 });
        await scrollTo(page, 0);
        expect(await horizontalOverflow(page), `${width}px expanded`).toBeLessThanOrEqual(0);

        await scrollTo(page, 300);
        await expect(page.locator("header")).toHaveAttribute("data-compact", "true");
        expect(await horizontalOverflow(page), `${width}px compact`).toBeLessThanOrEqual(0);
      }
    });

    test(`${locale}: open drawer does not widen the page at 360px`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(`/${locale}${SHELL_PATH}`);
      await openDrawer(page, locale);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test(`${locale}: desktop menu fits inside the container at 1024px`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 900 });
      await page.goto(`/${locale}${SHELL_PATH}`);

      const nav = page.getByRole("navigation", {
        name: /Menu utama|Main menu|القائمة الرئيسية/,
      });
      await expect(nav).toBeVisible();

      const items = await nav
        .locator("a, button")
        .evaluateAll((elements) =>
          elements.map((element) => {
            const rect = element.getBoundingClientRect();

            return {
              label: (element.textContent ?? "").trim().slice(0, 40),
              start: Math.round(rect.left),
              end: Math.round(rect.right),
              lines: Math.round(rect.height),
            };
          }),
        );

      expect(items).toHaveLength(7);
      for (const item of items) {
        expect(item.start, `start of "${item.label}"`).toBeGreaterThanOrEqual(0);
        expect(item.end, `end of "${item.label}"`).toBeLessThanOrEqual(1024);
        // A wrapped label would exceed the fixed 76px row.
        expect(item.lines, `height of "${item.label}"`).toBeLessThanOrEqual(48);
      }
    });

    test(`${locale}: navigation stays reachable at a 360px zoom-equivalent width`, async ({
      page,
    }) => {
      // 400% zoom on a 1440px display resolves to a ~360px CSS viewport.
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(`/${locale}${SHELL_PATH}`);

      await expect(page.getByRole("button", { name: OPEN_MENU[locale] })).toBeVisible();

      const drawer = await openDrawer(page, locale);
      await expect(drawer.getByRole("navigation")).toHaveCount(4);
    });
  }
});
