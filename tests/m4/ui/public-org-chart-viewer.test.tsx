import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

const { OrgChartViewer } = await import("@/components/public/org-chart-viewer");

const CHART_SRC = "/images/struktur/struktur-organisasi.png";
const LOCALES = ["id", "en", "ar"] as const;

const readProjectFile = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

const markup = renderToStaticMarkup(<OrgChartViewer src={CHART_SRC} alt="Bagan" />);

const container = (() => {
  const el = document.createElement("div");
  el.innerHTML = markup;
  return el;
})();

describe("OrgChartViewer", () => {
  it("serves the diagram unmodified so magnifying it stays sharp", () => {
    const image = container.querySelector("img");

    // A `next/image` src would carry /_next/image?url=…&w=…, which re-encodes
    // the file at a capped width and defeats the whole point of zooming.
    expect(image?.getAttribute("src")).toBe(CHART_SRC);
    expect(image?.getAttribute("alt")).toBe("Bagan");
    expect(image?.getAttribute("draggable")).toBe("false");
  });

  it("starts fitted, with the frame reachable by keyboard", () => {
    const frame = container.querySelector('[role="group"]');

    expect(frame?.getAttribute("tabindex")).toBe("0");
    expect(frame?.getAttribute("aria-label")).toBe("t:label");
    expect(container.textContent).toContain("100%");
  });

  it("names every control for assistive technology", () => {
    const labels = Array.from(container.querySelectorAll("button")).map((button) =>
      button.getAttribute("aria-label"),
    );

    expect(labels).toEqual(["t:zoomOut", "t:zoomIn", "t:reset"]);
    // The icons are decoration; the name comes from aria-label.
    for (const svg of container.querySelectorAll("button svg")) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("keeps the controls out of the pan gesture", () => {
    // Capturing a pointer that started on a button retargets its click and the
    // press never lands, so the controls must be excluded by name.
    const source = readProjectFile("src/components/public/org-chart-viewer.tsx");

    expect(container.querySelector("[data-chart-controls]")).not.toBeNull();
    expect(source).toContain('closest("[data-chart-controls]")');
  });

  it("lets an ordinary scroll scroll the page", () => {
    const source = readProjectFile("src/components/public/org-chart-viewer.tsx");
    const wheel = /const onWheel[\s\S]*?\n    };/.exec(source)?.[0] ?? "";

    expect(wheel).toContain("if (!event.ctrlKey && !event.metaKey) return;");
    expect(wheel.indexOf("return;")).toBeLessThan(wheel.indexOf("preventDefault"));
  });

  it("uses no physical-direction utility", () => {
    const source = readProjectFile("src/components/public/org-chart-viewer.tsx");

    expect(source).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(source).not.toMatch(/\btext-(left|right)\b/);
    expect(source).not.toMatch(/\bborder-(l|r)-/);
    expect(source).not.toMatch(/\brounded-(l|r)-/);
  });
});

describe("structure page", () => {
  const page = readProjectFile("src/app/[locale]/(public)/profil/struktur/page.tsx");

  it("renders the chart as an image, not as coded cards", () => {
    expect(page).toContain("<OrgChartViewer");
    expect(page).not.toContain("OrgCard");
    expect(page).not.toContain("dummy-leadership");
  });

  it("points at a diagram that is actually shipped", () => {
    const src = /const ORG_CHART_SRC = "([^"]+)"/.exec(page)?.[1];

    expect(src).toBe(CHART_SRC);
    expect(existsSync(path.join(process.cwd(), "public", src ?? ""))).toBe(true);
  });
});

describe("org chart i18n", () => {
  it.each(LOCALES)("defines every viewer string in %s", (locale) => {
    const catalog = JSON.parse(readProjectFile(`messages/${locale}.json`)) as {
      OrgChart?: Record<string, unknown>;
    };

    for (const key of ["alt", "label", "zoomIn", "zoomOut", "reset", "fullscreen", "exitFullscreen", "hint"]) {
      expect(catalog.OrgChart?.[key], `${locale}.${key}`).toBeTypeOf("string");
    }
  });

  it("writes the Arabic strings in Arabic script", () => {
    const catalog = JSON.parse(readProjectFile("messages/ar.json")) as {
      OrgChart: Record<string, string>;
    };

    for (const [key, value] of Object.entries(catalog.OrgChart)) {
      expect(value, `ar.${key}`).toMatch(/[؀-ۿ]/);
    }
  });
});
