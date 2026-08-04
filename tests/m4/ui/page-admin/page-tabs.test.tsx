import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const { PageLocaleTabs, PAGE_EDITOR_LOCALES } = await import("@/components/admin/pages/page-tabs");

describe("PageLocaleTabs", () => {
  it("renders three tab buttons with active selection", () => {
    const markup = renderToStaticMarkup(
      <PageLocaleTabs
        active="id"
        labels={{ id: "Indonesia", en: "English", ar: "العربية" }}
        hasTranslation={{ id: true, en: false, ar: true }}
        onChange={() => {}}
      />,
    );
    const container = document.createElement("div");
    container.innerHTML = markup;
    const tabs = container.querySelectorAll("[role='tab']");
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");
  });

  it("marks Arabic as RTL-ready via the Arabic label", () => {
    const markup = renderToStaticMarkup(
      <PageLocaleTabs
        active="ar"
        labels={{ id: "Indonesia", en: "English", ar: "العربية" }}
        hasTranslation={{ id: true, en: false, ar: true }}
        onChange={() => {}}
      />,
    );
    expect(markup).toContain("العربية");
  });
});

describe("PAGE_EDITOR_LOCALES", () => {
  it("contains id, en, ar in order", () => {
    expect(PAGE_EDITOR_LOCALES).toEqual(["id", "en", "ar"]);
  });
});
