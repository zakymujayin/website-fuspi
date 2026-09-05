import {expect, test} from "@playwright/test";

const widths = [1440, 1280, 1024, 768, 390, 360] as const;

for (const locale of ["id", "en", "ar"] as const) {
  test(`${locale}: homepage logo, layout and location survive every supported width`, async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.goto(`/${locale}`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    for (const width of widths) {
      await page.setViewportSize({width, height: 900});
      await page.evaluate(() => window.scrollTo(0, 0));
      const mainTop = await page.locator("main").evaluate(element => element.getBoundingClientRect().top + window.scrollY);
      const logo = page.locator('header a[dir="ltr"] img').first();
      await expect(logo).toBeVisible();
      await expect(logo).toHaveCSS("object-fit", "contain");
      await page.evaluate(() => window.scrollTo(0, 500));
      await expect(page.locator("header")).toHaveAttribute("data-compact", "true");
      const bounds = await logo.boundingBox();
      const headerBounds = await page.locator("header").boundingBox();
      expect(bounds?.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(headerBounds!.y + headerBounds!.height);
      expect(await page.locator("main").evaluate(element => element.getBoundingClientRect().top + window.scrollY)).toBe(mainTop);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const footer = page.locator("footer").filter({has: page.locator('a[href$="/privasi"]')});
    const map = footer.locator('iframe[src*="google.com/maps"]');
    await expect(map).toHaveAttribute("title", /.+/);
    await expect(map).toHaveAttribute("loading", "lazy");
    await expect(map).toHaveCSS("height", "160px");
    await expect(footer.locator('a[href*="maps/search/"]')).toHaveAttribute("href", /api=1&query=/);
    await expect(footer.locator('a[href="mailto:fuspi@uinbanten.ac.id"]')).toBeVisible();
  });
}

test("alumni choices and previous/next controls update the same story", async ({page}) => {
  await page.goto("/id");
  const region = page.locator('section[aria-labelledby="testimonials-title"]');
  const choices = region.locator('button[aria-controls="alumni-story"]');
  test.skip(await choices.count() < 2, "The CMS must publish at least two testimonials to exercise story selection.");
  const names = await choices.allTextContents();
  await choices.nth(1).click();
  await expect(choices.nth(1)).toHaveAttribute("aria-pressed", "true");
  await expect(choices.first()).toHaveAttribute("aria-pressed", "false");
  const selectedName = await region.locator("cite > span").first().textContent();
  expect(names[1]).toContain(selectedName);
  await region.getByRole("button", {name: "Testimoni sebelumnya"}).click();
  await expect(choices.first()).toHaveAttribute("aria-pressed", "true");
  await region.getByRole("button", {name: "Testimoni berikutnya"}).click();
  await expect(choices.nth(1)).toHaveAttribute("aria-pressed", "true");
});

test("featured video keeps its poster dimensions and opens the labeled player", async ({page}) => {
  await page.goto("/id");
  const videos = page.locator("main section").filter({has: page.getByRole("heading", {name: "Galeri Video", exact: true})});
  const play = videos.locator("button").first();
  test.skip(await play.count() === 0, "The CMS must publish a playable profile video.");
  const label = await play.getAttribute("aria-label");
  const poster = await play.boundingBox();
  expect(poster!.width).toBeGreaterThan(200);
  expect(poster!.height).toBeGreaterThan(100);
  await play.click();
  const player = videos.locator("iframe").first();
  await expect(player).toHaveAttribute("title", label!);
  await expect(player).toHaveAttribute("src", /youtube-nocookie.com\/embed\//);
  const playing = await player.boundingBox();
  expect(Math.abs(playing!.width - poster!.width)).toBeLessThan(3);
  expect(Math.abs(playing!.height - poster!.height)).toBeLessThan(3);
});
