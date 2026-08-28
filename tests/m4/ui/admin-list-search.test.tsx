import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { AdminListSearch } = await import("@/components/admin/shared/admin-list-search");

const LABELS = { placeholder: "Cari judul…", ariaLabel: "Cari", action: "Cari", clear: "Bersihkan" };

function container(markup: string) {
  const el = document.createElement("div");
  el.innerHTML = markup;
  return el;
}

describe("AdminListSearch", () => {
  it("is a search landmark with a bounded search input", () => {
    const markup = renderToStaticMarkup(
      <AdminListSearch initialSearch="" maxLength={100} buildHref={(s) => `/x?search=${s}`} labels={LABELS} />,
    );
    const el = container(markup);
    expect(el.querySelector("[role='search']")).not.toBeNull();
    const input = el.querySelector("input[type='search']");
    expect(input?.getAttribute("maxlength")).toBe("100");
    expect(input?.getAttribute("aria-label")).toBe("Cari");
  });

  it("offers a clear affordance only when there is an active term", () => {
    const empty = renderToStaticMarkup(
      <AdminListSearch initialSearch="" maxLength={100} buildHref={() => "/x"} labels={LABELS} />,
    );
    const withTerm = renderToStaticMarkup(
      <AdminListSearch initialSearch="wisuda" maxLength={100} buildHref={() => "/x"} labels={LABELS} />,
    );
    expect(container(empty).textContent).not.toContain("Bersihkan");
    expect(container(withTerm).textContent).toContain("Bersihkan");
  });
});
