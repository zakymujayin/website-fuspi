import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const { PublicContentStateNotice } = await import(
  "@/components/admin/public-content/public-content-state-notice"
);

function markupToContainer(markup: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

describe("PublicContentStateNotice", () => {
  it("renders empty variant with title and description", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStateNotice variant="empty" title="Tidak Ada Data" description="Belum ada konten yang ditambahkan." />,
    );
    expect(markup).toContain("Tidak Ada Data");
    expect(markup).toContain("Belum ada konten yang ditambahkan.");
  });

  it("renders unavailable variant with title and description", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStateNotice variant="unavailable" title="Gagal Memuat" description="Silakan coba lagi nanti." />,
    );
    expect(markup).toContain("Gagal Memuat");
    expect(markup).toContain("Silakan coba lagi nanti.");
  });

  it("renders without action when not provided", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStateNotice variant="empty" title="Kosong" description="Tidak ada." />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders with action when provided", () => {
    const action = <button type="button">Coba Lagi</button>;
    const markup = renderToStaticMarkup(
      <PublicContentStateNotice variant="unavailable" title="Error" description="Gagal." action={action} />,
    );
    expect(markup).toContain("Coba Lagi");
    const container = markupToContainer(markup);
    expect(container.querySelector("button")).not.toBeNull();
  });

  it("has role status", () => {
    const markup = renderToStaticMarkup(
      <PublicContentStateNotice variant="empty" title="Kosong" description="Tidak ada." />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});
