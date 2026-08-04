import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const { PublicContentStatusBadge } = await import(
  "@/components/admin/public-content/public-content-status-badge"
);

function markupToContainer(markup: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

describe("PublicContentStatusBadge", () => {
  it("renders PUBLIC visibility with emerald color classes", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStatusBadge visibility="PUBLIC" label="Publik" />,
    );
    expect(markup).toContain("Publik");
    expect(markup).toContain("bg-emerald-100");
    expect(markup).toContain("text-emerald-800");
    expect(markup).toContain("border-emerald-200");
  });

  it("renders HIDDEN visibility with slate color classes", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStatusBadge visibility="HIDDEN" label="Tersembunyi" />,
    );
    expect(markup).toContain("Tersembunyi");
    expect(markup).toContain("bg-slate-100");
    expect(markup).toContain("text-slate-600");
    expect(markup).toContain("border-slate-200");
  });

  it("renders EXPIRED visibility with amber color classes", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStatusBadge visibility="EXPIRED" label="Kadaluarsa" />,
    );
    expect(markup).toContain("Kadaluarsa");
    expect(markup).toContain("bg-amber-100");
    expect(markup).toContain("text-amber-800");
    expect(markup).toContain("border-amber-200");
  });

  it("displays the provided label text", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStatusBadge visibility="PUBLIC" label="Custom Label" />,
    );
    expect(markup).toContain("Custom Label");
  });

  it("has accessible text content visible in DOM", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStatusBadge visibility="PUBLIC" label="Terbit" />,
    );
    const container = markupToContainer(markup);
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span!.textContent).toBe("Terbit");
  });
});
