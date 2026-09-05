import {expect, test} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const locale of ["id", "en", "ar"] as const) {
  test(`${locale}: compact identity and real search work on desktop and mobile`, async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    for (const width of [1440, 390, 360]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(`/${locale}`);
      await expect(page.locator("[data-faculty-tab]")).toBeVisible();
      const hero = page.locator('section[aria-roledescription="carousel"]');
      const heroBox = await hero.boundingBox();
      const tabBox = await page.locator("[data-faculty-tab]").boundingBox();
      expect(tabBox!.y).toBe(heroBox!.y);
      expect(tabBox!.height).toBeLessThan(120);
      const trigger = page.locator('header button[aria-haspopup="dialog"]').first();
      await trigger.click();
      const dialog = page.getByRole("dialog");
      const input = dialog.locator('input[type="search"]');
      await expect(input).toBeFocused();
      await input.fill("Tafsir");
      const response = page.waitForResponse(response => response.url().includes("/api/public/search?") && response.request().method() === "GET");
      await dialog.locator('button[type="submit"]').click();
      const payload = await (await response).json();
      expect(payload.ok).toBe(true);
      expect(payload.items.length).toBeGreaterThan(0);
      const result = payload.items[0];
      await expect(dialog.locator(`a[href="/${locale}/prodi/${encodeURIComponent(result.slug)}"]`)).toContainText(result.title);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width === 390) {
        const axe = await new AxeBuilder({page}).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "wcag2aaa"]).analyze();
        expect(axe.violations).toEqual([]);
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
  });
}

test("search empty, unavailable, retry and keyboard focus states", async ({page}) => {
  await page.goto("/id");
  await page.getByRole("button", {name: "Buka pencarian"}).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="search"]').fill("zz-no-matching-content-946837");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByRole("status")).toContainText("Tidak ada hasil");
  await page.route("**/api/public/search?*", route => route.fulfill({status: 503, json: {ok: false, code: "UNAVAILABLE"}}));
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByRole("status")).toContainText("Silakan coba lagi");
  await page.unroute("**/api/public/search?*");
  await dialog.locator('input[type="search"]').fill("Tafsir");
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.locator("li a").first()).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
});

test("pagination keeps the submitted query and malformed result paths are rejected", async ({page, request}) => {
  const actual = await (await request.get("/api/public/search?q=Tafsir&locale=id&resourceTypes=STUDY_PROGRAM&pageSize=10")).json();
  expect(actual.ok).toBe(true);
  expect(actual.items.length).toBeGreaterThan(0);
  const requested: URLSearchParams[] = [];
  // Exercise pagination with real result content and controlled page metadata.
  await page.route("**/api/public/search?*", route => {
    const params = new URL(route.request().url()).searchParams;
    requested.push(params);
    const pageNumber = Number(params.get("page"));
    return route.fulfill({json: {...actual, page: {page: pageNumber, total: 30, totalPages: 3, hasNextPage: pageNumber < 3, hasPreviousPage: pageNumber > 1}}});
  });
  await page.goto("/id");
  await page.getByRole("button", {name: "Buka pencarian"}).click();
  const dialog = page.getByRole("dialog");
  const input = dialog.locator('input[type="search"]');
  await input.fill("Tafsir");
  await dialog.locator('button[type="submit"]').click();
  await dialog.getByRole("button", {name: "Berikutnya", exact: true}).click();
  await expect(dialog.getByText("2 / 3", {exact: true})).toBeVisible();
  await input.fill("a different unsubmitted query");
  await dialog.getByRole("button", {name: "Sebelumnya", exact: true}).click();
  await expect(dialog.getByText("1 / 3", {exact: true})).toBeVisible();
  expect(requested.at(-1)?.get("q")).toBe("Tafsir");
  await page.unroute("**/api/public/search?*");
  await page.route("**/api/public/search?*", route => route.fulfill({json: {...actual, items: [{...actual.items[0], slug: "../admin"}]}}));
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByRole("status")).toContainText("Silakan coba lagi");
  await expect(dialog.locator("li a")).toHaveCount(0);
});

test("testimonials progress, pause on hover/focus and stop after manual choice without shifting", async ({page}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await page.goto("/id");
  await page.clock.install();
  const region = page.locator('section[aria-labelledby="testimonials-title"]');
  await region.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(region).toHaveAttribute("data-autoplay", "playing");
  const story = region.locator("#alumni-story");
  const height = (await story.boundingBox())!.height;
  const choices = region.locator('button[aria-controls="alumni-story"]');
  expect(await choices.count()).toBeGreaterThan(1);
  await page.clock.fastForward(7100);
  await expect(choices.nth(1)).toHaveAttribute("aria-pressed", "true");
  expect((await story.boundingBox())!.height).toBe(height);
  await region.hover();
  await expect(region).toHaveAttribute("data-autoplay", "paused");
  await page.clock.fastForward(15000);
  await expect(choices.nth(1)).toHaveAttribute("aria-pressed", "true");
  await choices.first().focus();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(15000);
  await expect(choices.nth(1)).toHaveAttribute("aria-pressed", "true");
  await choices.first().click();
  await page.locator("h1").evaluate(element => {element.setAttribute("tabindex", "-1"); (element as HTMLElement).focus();});
  await region.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(15000);
  await expect(choices.first()).toHaveAttribute("aria-pressed", "true");
  await expect(region).toHaveAttribute("data-autoplay", "paused");
});

test("reveal waits for viewport, runs once, and reduced motion reveals immediately", async ({page}) => {
  await page.emulateMedia({reducedMotion: "no-preference"});
  await page.goto("/id");
  const reveal = page.locator('[data-reveal-state="pending"]').last();
  await expect(reveal).toHaveCount(1);
  await page.waitForTimeout(1600);
  await expect(reveal).toHaveCSS("opacity", "0");
  await reveal.scrollIntoViewIfNeeded();
  const footerReveal = page.locator('footer [data-reveal="fade"]');
  await expect(footerReveal).toHaveAttribute("data-reveal-state", "visible");
  await expect(footerReveal).toHaveCSS("opacity", "1");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(footerReveal).toHaveAttribute("data-reveal-state", "visible");
  await page.emulateMedia({reducedMotion: "reduce"});
  await expect(page.locator('[data-reveal-state="pending"]')).toHaveCount(0);
  const region = page.locator('section[aria-labelledby="testimonials-title"]');
  await region.scrollIntoViewIfNeeded();
  await expect(region).toHaveAttribute("data-autoplay", "paused");
  await expect(region.locator("button:disabled")).toHaveCount(1);
});

test("no-JavaScript visitors receive visible content", async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false});
  const page = await context.newPage();
  await page.goto("/id");
  const reveals = page.locator("[data-reveal]");
  expect(await reveals.count()).toBeGreaterThan(10);
  for (const reveal of await reveals.all()) await expect(reveal).toHaveCSS("opacity", "1");
  await context.close();
});
