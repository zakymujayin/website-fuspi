import {expect, test} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const FACILITIES = 'section[aria-labelledby="facilities-title"]';
const LIGHTBOX = 'dialog[aria-label="Galeri sarana dan prasarana"]';
const RAIL = '[aria-roledescription="carousel"][aria-label="Dosen & Peneliti"]';

test.describe("homepage heading and divider system", () => {
  test("every section description shares the title's column, never the action column", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto("/id");

    const headings = page.locator("[data-home-heading]");
    const total = await headings.count();
    expect(total).toBeGreaterThan(4);

    for (let index = 0; index < total; index += 1) {
      const heading = headings.nth(index);
      const description = heading.locator("[data-heading-description]");
      if (await description.count() === 0) continue;
      const title = heading.locator("h2, h3").first();
      const titleBox = await title.boundingBox();
      const descriptionBox = await description.boundingBox();
      // Same starting edge and below the title: the pair reads as one block.
      expect(Math.abs(descriptionBox!.x - titleBox!.x)).toBeLessThan(2);
      expect(descriptionBox!.y).toBeGreaterThan(titleBox!.y);
    }
  });

  test("the achievements header keeps eyebrow, title and description together", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto("/id");
    const heading = page.locator('section[aria-labelledby="achievements-title"] [data-home-heading]');
    const eyebrow = heading.locator("p").first();
    const title = heading.locator("h2");
    const description = heading.locator("[data-heading-description]");
    const [eyebrowBox, titleBox, descriptionBox] = await Promise.all([
      eyebrow.boundingBox(), title.boundingBox(), description.boundingBox(),
    ]);
    expect(Math.abs(eyebrowBox!.x - titleBox!.x)).toBeLessThan(2);
    expect(Math.abs(descriptionBox!.x - titleBox!.x)).toBeLessThan(2);
    // No dead band between the header and the first row of content.
    const content = page.locator('section[aria-labelledby="achievements-title"] a[href*="/prestasi/"]').first();
    const contentBox = await content.boundingBox();
    expect(contentBox!.y - (descriptionBox!.y + descriptionBox!.height)).toBeLessThan(90);
  });
});

test.describe("brand lockup", () => {
  test("the header faculty name never leaves the conjunction ending a line", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto("/id");
    const measure = await page.locator('header a[dir="ltr"] > span').nth(1).evaluate((node) => {
      const text = (node.querySelector("span") ?? node).firstChild as Text;
      const start = text.textContent!.indexOf(" dan ") + 1;
      const conjunction = document.createRange();
      conjunction.setStart(text, start);
      conjunction.setEnd(text, start + 3);
      const whole = document.createRange();
      whole.selectNodeContents(text);
      const lines = [...whole.getClientRects()];
      return {
        lineCount: lines.length,
        firstLineTop: lines[0].top,
        conjunctionTop: conjunction.getBoundingClientRect().top,
      };
    });
    expect(measure.lineCount).toBe(2);
    // "dan" joins the words below it, exactly as the footer lockup does.
    expect(measure.conjunctionTop).toBeGreaterThan(measure.firstLineTop + 4);
  });

  test("the footer faculty name keeps the same two-line lockup", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto("/id");
    const measure = await page.locator("footer p").first().evaluate((node) => {
      const text = node.firstChild as Text;
      const start = text.textContent!.indexOf(" dan ") + 1;
      const conjunction = document.createRange();
      conjunction.setStart(text, start);
      conjunction.setEnd(text, start + 3);
      const whole = document.createRange();
      whole.selectNodeContents(text);
      const lines = [...whole.getClientRects()];
      return {
        lineCount: lines.length,
        firstLineTop: lines[0].top,
        conjunctionTop: conjunction.getBoundingClientRect().top,
      };
    });
    expect(measure.lineCount).toBe(2);
    expect(measure.conjunctionTop).toBeGreaterThan(measure.firstLineTop + 4);
  });
});

test.describe("facility lightbox", () => {
  test("opens every facility, navigates, and restores focus and scroll", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto("/id");

    const triggers = page.locator(`${FACILITIES} a[aria-label^="Perbesar foto"]`);
    const total = await triggers.count();
    expect(total).toBeGreaterThan(1);

    const dialog = page.locator(LIGHTBOX);
    // 1. Every tile opens, and shows its own caption and position.
    const captions: string[] = [];
    for (let index = 0; index < total; index += 1) {
      const label = await triggers.nth(index).getAttribute("aria-label");
      const caption = label!.replace("Perbesar foto: ", "");
      captions.push(caption);
      await triggers.nth(index).click();
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(`${index + 1} dari ${total}`, {exact: true})).toBeVisible();
      await expect(dialog.locator("img")).toBeVisible();
      await expect(dialog.getByText(caption, {exact: true})).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }

    // 2. Scroll is locked while open and the position survives a close.
    await page.locator(FACILITIES).scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    await triggers.first().click();
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // 3. Focus moves into the dialog and Tab never reaches the page behind it.
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const reachedBackground = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active === document.body || active === document.documentElement) return false;
        return !active.closest("dialog");
      });
      expect(reachedBackground).toBe(false);
    }

    // 4. Buttons and arrow keys walk the gallery and wrap.
    await dialog.getByRole("button", {name: "Foto berikutnya"}).click();
    await expect(dialog.getByText(`2 dari ${total}`, {exact: true})).toBeVisible();
    await expect(dialog.getByText(captions[1], {exact: true})).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByText(`3 dari ${total}`, {exact: true})).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByText(`2 dari ${total}`, {exact: true})).toBeVisible();
    await dialog.getByRole("button", {name: "Foto sebelumnya"}).click();
    await expect(dialog.getByText(`1 dari ${total}`, {exact: true})).toBeVisible();
    await dialog.getByRole("button", {name: "Foto sebelumnya"}).click();
    await expect(dialog.getByText(`${total} dari ${total}`, {exact: true})).toBeVisible();

    // 5. Closing unlocks scrolling, restores the page position and the trigger focus.
    await dialog.getByRole("button", {name: "Tutup galeri"}).click();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(triggers.first()).toBeFocused();
  });

  test("the image is contained, not cropped, and reduced motion removes the transition", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto("/id");
    const dialog = page.locator(LIGHTBOX);
    await page.locator(`${FACILITIES} a[aria-label^="Perbesar foto"]`).first().click();
    const image = dialog.locator("img");
    await expect(image).toHaveCSS("object-fit", "contain");
    await expect(image).toHaveCSS("animation-name", "none");
    // Measure only once the bitmap is decoded: naturalWidth is 0 until then,
    // which turns the ratio comparison below into NaN under parallel load.
    await expect
      .poll(() => image.evaluate((node) => {
        const element = node as HTMLImageElement;
        return element.complete && element.naturalWidth > 0;
      }))
      .toBe(true);
    const box = await image.boundingBox();
    const natural = await image.evaluate((node) => {
      const element = node as HTMLImageElement;
      return {width: element.naturalWidth, height: element.naturalHeight};
    });
    // Aspect ratio preserved within a pixel of rounding.
    expect(Math.abs(box!.width / box!.height - natural.width / natural.height)).toBeLessThan(0.02);
    expect(box!.width).toBeLessThanOrEqual(1280);
    expect(box!.height).toBeLessThanOrEqual(800);
    // The image must never grow over the chrome and swallow the controls.
    for (const control of ["Tutup galeri", "Foto sebelumnya", "Foto berikutnya"]) {
      const controlBox = await dialog.getByRole("button", {name: control}).boundingBox();
      const overlaps = box!.x < controlBox!.x + controlBox!.width
        && box!.x + box!.width > controlBox!.x
        && box!.y < controlBox!.y + controlBox!.height
        && box!.y + box!.height > controlBox!.y;
      expect(overlaps, `lightbox image overlaps "${control}"`).toBe(false);
    }
    const axe = await new AxeBuilder({page}).include(LIGHTBOX).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations).toEqual([]);
  });

  test("adds no image requests of its own", async ({page}) => {
    const requested: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "image") requested.push(request.url());
    });
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.goto("/id", {waitUntil: "networkidle"});
    // The overlay renders no <img> at all until it is opened, so it costs
    // nothing on the initial page load.
    await expect(page.locator(LIGHTBOX)).toBeHidden();
    expect(await page.locator(`${LIGHTBOX} img`).count()).toBe(0);

    // Let the mosaic finish its own lazy loading before measuring.
    await page.locator(FACILITIES).scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator(`${FACILITIES} img`).evaluateAll(
      (nodes) => nodes.every((node) => (node as HTMLImageElement).complete),
    )).toBe(true);
    await page.waitForLoadState("networkidle");
    const settled = requested.length;
    expect(settled).toBeGreaterThan(0);

    await page.locator(`${FACILITIES} a[aria-label^="Perbesar foto"]`).first().click();
    await expect(page.locator(`${LIGHTBOX} img`)).toBeVisible();
    // It reuses the source the mosaic already fetched rather than a second asset.
    expect(requested.length).toBe(settled);
  });

  test("mobile keeps the image and its controls inside the viewport", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 390, height: 844});
    await page.goto("/id");
    const dialog = page.locator(LIGHTBOX);
    await page.locator(`${FACILITIES} a[aria-label^="Perbesar foto"]`).first().click();
    await expect(dialog).toBeVisible();
    for (const control of ["Tutup galeri", "Foto sebelumnya", "Foto berikutnya"]) {
      const button = dialog.getByRole("button", {name: control});
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    const image = await dialog.locator("img").boundingBox();
    expect(image!.x).toBeGreaterThanOrEqual(0);
    expect(image!.x + image!.width).toBeLessThanOrEqual(390);
    expect(image!.y + image!.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test.describe("lecturer rail", () => {
  test("shows three profiles on desktop and keeps academic names on one line", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto("/id");
    const rail = page.locator(RAIL);
    await rail.scrollIntoViewIfNeeded();
    const cards = rail.locator('a[href*="/dosen/"]');
    expect(await cards.count()).toBeGreaterThan(3);

    const railBox = await rail.boundingBox();
    const firstBox = await cards.first().boundingBox();
    // ~3 per viewport: each card is roughly a third of the rail.
    expect(firstBox!.width).toBeGreaterThan(railBox!.width / 3.6);
    expect(firstBox!.width).toBeLessThan(railBox!.width / 2.6);

    // A portrait frame, capped in width. Source photos disagree on aspect
    // ratio, and only a portrait frame crops the wide ones inward instead of
    // cropping the tall ones down to a head; the width cap is what keeps the
    // picture from towering over the name (a height cap would narrow it).
    const portrait = await cards.first().locator("div").first().boundingBox();
    expect(portrait!.height).toBeGreaterThan(portrait!.width);
    expect(portrait!.width).toBeLessThanOrEqual(firstBox!.width);
    expect(portrait!.height).toBeLessThan(400);
    expect(portrait!.height).toBeGreaterThan(280);

    const names = rail.locator('a[href*="/dosen/"] > span').first();
    await expect(names).toHaveCSS("white-space", "nowrap");
    const nameFontSize = await names.evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    expect(nameFontSize).toBeGreaterThanOrEqual(16);
    // A full academic name occupies exactly one line.
    const lines = await names.evaluate((node) => {
      const style = getComputedStyle(node);
      return node.getBoundingClientRect().height / Number.parseFloat(style.lineHeight);
    });
    expect(lines).toBeLessThan(1.4);
  });

  test("navigates with the arrows, the pagination and the keyboard", async ({page}) => {
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto("/id");
    const rail = page.locator(RAIL);
    await rail.scrollIntoViewIfNeeded();
    const region = page.locator('section[aria-labelledby="academic-title"]');

    // Scrolling the rail into view can nudge its own offset by a few pixels, so
    // page moves are compared as travel, not against a hard-coded zero.
    const offset = () => rail.evaluate((node) => node.scrollLeft);
    const start = await offset();

    await region.getByRole("button", {name: "Dosen berikutnya"}).click();
    await expect.poll(offset).toBeGreaterThan(start + 200);
    const second = await offset();

    await region.getByRole("button", {name: "Dosen sebelumnya"}).click();
    await expect.poll(offset).toBe(start);

    await region.getByRole("button", {name: "Tampilkan halaman 2"}).click();
    await expect.poll(offset).toBe(second);
    await expect(region.getByRole("button", {name: "Tampilkan halaman 2"})).toHaveAttribute("aria-current", "true");
    await expect(region.getByRole("button", {name: "Tampilkan halaman 1"})).toHaveAttribute("aria-current", "false");

    // Cards are reachable and drivable from the keyboard.
    await region.getByRole("button", {name: "Tampilkan halaman 1"}).click();
    await rail.locator('a[href*="/dosen/"]').first().focus();
    await expect.poll(offset).toBe(start);
    await page.keyboard.press("ArrowRight");
    await expect.poll(offset).toBe(second);
  });

  test("autoplay advances the rail without dragging the page to it", async ({page}) => {
    await page.emulateMedia({reducedMotion: "no-preference"});
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto("/id");
    const rail = page.locator(RAIL);
    await rail.scrollIntoViewIfNeeded();
    // Park the rail below the fold: a page-level scroll would be unmissable.
    await page.evaluate(() => window.scrollBy(0, -700));
    await page.mouse.move(0, 0);
    await expect(page.locator("[data-autoplay]").filter({has: rail})).toHaveAttribute("data-autoplay", "playing");

    const pageBefore = await page.evaluate(() => window.scrollY);
    const railBefore = await rail.evaluate((node) => node.scrollLeft);
    await expect
      .poll(() => rail.evaluate((node) => node.scrollLeft), {timeout: 20_000})
      .toBeGreaterThan(railBefore + 200);
    expect(await page.evaluate(() => window.scrollY)).toBe(pageBefore);
  });

  test("autoplay stays off under reduced motion and pauses on hover and focus", async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await page.emulateMedia({reducedMotion: "reduce"});
    await page.goto("/id");
    const rail = page.locator(RAIL);
    await rail.scrollIntoViewIfNeeded();
    const player = page.locator("[data-autoplay]").filter({has: page.locator(RAIL)});
    await expect(player).toHaveAttribute("data-autoplay", "paused");

    await page.emulateMedia({reducedMotion: "no-preference"});
    await page.goto("/id");
    await page.locator(RAIL).scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const live = page.locator("[data-autoplay]").filter({has: page.locator(RAIL)});
    await expect(live).toHaveAttribute("data-autoplay", "playing");

    await live.hover();
    await expect(live).toHaveAttribute("data-autoplay", "paused");
    await page.mouse.move(0, 0);
    await expect(live).toHaveAttribute("data-autoplay", "playing");

    await page.locator(`${RAIL} a[href*="/dosen/"]`).first().focus();
    await expect(live).toHaveAttribute("data-autoplay", "paused");

    // A manual choice hands control to the visitor for good.
    await page.getByRole("button", {name: "Dosen berikutnya"}).click();
    await page.locator("h1").first().focus();
    await page.mouse.move(0, 0);
    await expect(live).toHaveAttribute("data-autoplay", "paused");
  });
});
