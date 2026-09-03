import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { AdminPageSizeSelect, ADMIN_PAGE_SIZE_OPTIONS } = await import(
  "@/components/admin/shared/admin-page-size-select-server"
);

function container(markup: string) {
  const el = document.createElement("div");
  el.innerHTML = markup;
  return el;
}

describe("AdminPageSizeSelect", () => {
  it("renders one option per allowed size and marks the current value selected", () => {
    const markup = renderToStaticMarkup(
      <AdminPageSizeSelect
        value={10}
        buildHref={(size) => `/admin/x?pageSize=${size}`}
        label="Baris per halaman"
        optionLabel={(n) => `${n}`}
      />,
    );
    const el = container(markup);
    const options = el.querySelectorAll("option");
    expect(Array.from(options).map((o) => o.getAttribute("value"))).toEqual(
      ADMIN_PAGE_SIZE_OPTIONS.map(String),
    );
    expect(el.querySelector("option[selected]")?.getAttribute("value")).toBe("10");
    expect(el.querySelector("select")?.getAttribute("aria-label")).toBe("Baris per halaman");
  });

  it("uses only logical-direction utilities", () => {
    const markup = renderToStaticMarkup(
      <AdminPageSizeSelect value={20} buildHref={() => "/x"} label="L" optionLabel={String} />,
    );
    for (const bad of [/\bml-\d/, /\bmr-\d/, /\bpl-\d/, /\bpr-\d/, /\btext-left\b/, /\btext-right\b/]) {
      expect(markup).not.toMatch(bad);
    }
  });
});
