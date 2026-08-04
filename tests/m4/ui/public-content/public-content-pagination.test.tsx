import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const { PublicContentPagination } = await import(
  "@/components/admin/public-content/public-content-pagination"
);

function markupToContainer(markup: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

const DEFAULT_PROPS = {
  current: 1,
  totalPages: 5,
  buildHref: (page: number) => `/admin/layanan?page=${page}`,
  ariaLabel: "Navigasi Halaman",
  previousLabel: "Sebelumnya",
  nextLabel: "Selanjutnya",
  pageStatusLabel: "Halaman 1 dari 5",
  goToPageLabel: (page: number) => `Ke halaman ${page}`,
};

describe("PublicContentPagination", () => {
  it("returns null when totalPages is 1", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} totalPages={1} />,
    );
    expect(markup).toBe("");
  });

  it("returns null when totalPages is 0", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} totalPages={0} />,
    );
    expect(markup).toBe("");
  });

  it("renders pagination with multiple pages", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector("nav")).not.toBeNull();
  });

  it("current page has aria-current page", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} current={3} />,
    );
    const container = markupToContainer(markup);
    const current = container.querySelector('[aria-current="page"]');
    expect(current).not.toBeNull();
    expect(current!.textContent).toBe("3");
  });

  it("previous button is disabled on first page", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} current={1} />,
    );
    const container = markupToContainer(markup);
    const buttons = container.querySelectorAll("nav > span, nav > a");

    // First item is the disabled previous button
    const firstItem = buttons[0];
    expect(firstItem.tagName).toBe("SPAN");
    expect(firstItem.querySelector("svg")).not.toBeNull();
  });

  it("next button is a link when not last page", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} current={1} totalPages={5} />,
    );
    const container = markupToContainer(markup);
    const link = container.querySelector('a[aria-label="Selanjutnya"]');
    expect(link).not.toBeNull();
  });

  it("next button is a disabled span on last page", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} current={5} totalPages={5} />,
    );
    const container = markupToContainer(markup);
    // Next button should be a span, not a link
    const links = container.querySelectorAll("a");
    const nextLink = Array.from(links).find(
      (l) => l.getAttribute("aria-label") === "Selanjutnya",
    );
    expect(nextLink).toBeUndefined();
  });

  it("renders ellipsis for page gaps", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} current={5} totalPages={10} />,
    );
    expect(markup).toContain("\u2026");
  });

  it("has accessible navigation aria-label", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} />,
    );
    const container = markupToContainer(markup);
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    expect(nav!.getAttribute("aria-label")).toBe("Navigasi Halaman");
  });

  it("renders page status label text", () => {
    const markup = renderToStaticMarkup(
      <PublicContentPagination {...DEFAULT_PROPS} />,
    );
    expect(markup).toContain("Halaman 1 dari 5");
  });
});
