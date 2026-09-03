import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({push: vi.fn(), refresh: vi.fn()}),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
  useLocale: () => "id",
}));

vi.mock("@/components/admin/public-content/public-content-server-actions", () => ({
  executePublicContentAdminCommand: vi.fn().mockResolvedValue({
    ok: true, id: "test-1", resource: "PARTNERSHIP", version: null,
  }),
}));

const { PartnershipEditorForm } = await import(
  "@/components/admin/public-content/partnership-editor-form"
);

function $(markup: string) {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

describe("PartnershipEditorForm", () => {
  it("renders create mode form", () => {
    const markup = renderToStaticMarkup(
      <PartnershipEditorForm mode="create" listHref="/admin/kerjasama" />,
    );
    const el = $(markup);
    expect(el.querySelector("form")).toBeTruthy();
  });

  it("renders edit mode with initial data", () => {
    const markup = renderToStaticMarkup(
      <PartnershipEditorForm
        mode="edit"
        listHref="/admin/kerjasama"
        pageId="p-1"
        expectedVersion={undefined}
        initialData={{
          slug: "mitra-test",
          partnerName: "Test Partner",
          level: "NASIONAL",
          country: "Indonesia",
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: null,
          websiteUrl: null,
          logoMediaId: null,
          isActive: true,
          order: 0,
          translations: {
            id: {category: "Pendidikan", description: "Deskripsi"},
            en: {category: "Education", description: "Description"},
            ar: {category: "", description: ""},
          },
        } as Record<string, unknown>}
      />,
    );
    expect(markup).toContain("Test Partner");
    expect(markup).toContain("mitra-test");
  });

  it("renders locale tabs", () => {
    const markup = renderToStaticMarkup(
      <PartnershipEditorForm mode="create" listHref="/admin/kerjasama" />,
    );
    const el = $(markup);
    expect(el.querySelectorAll("[role='tab']")).toHaveLength(3);
  });

  it("renders partner name field", () => {
    const markup = renderToStaticMarkup(
      <PartnershipEditorForm mode="create" listHref="/admin/kerjasama" />,
    );
    // The form uses field.partnerName as the translation key
    expect(markup).toContain("t:PARTNERSHIP.field.partnerName");
  });

  it("renders level select", () => {
    const markup = renderToStaticMarkup(
      <PartnershipEditorForm mode="create" listHref="/admin/kerjasama" />,
    );
    expect(markup).toContain("INTERNASIONAL");
    expect(markup).toContain("NASIONAL");
    expect(markup).toContain("LOKAL");
  });

  it("renders date fields", () => {
    const markup = renderToStaticMarkup(
      <PartnershipEditorForm mode="create" listHref="/admin/kerjasama" />,
    );
    const el = $(markup);
    // Partnership form uses datetime-local inputs for dates
    expect(el.querySelector("input[type='datetime-local']")).toBeTruthy();
  });

  it("renders cancel button", () => {
    const markup = renderToStaticMarkup(
      <PartnershipEditorForm mode="create" listHref="/admin/kerjasama" />,
    );
    const el = $(markup);
    const cancelBtn = Array.from(el.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("t:PARTNERSHIP.cancel"),
    );
    expect(cancelBtn).toBeTruthy();
  });

  it("has noValidate on form", () => {
    const markup = renderToStaticMarkup(
      <PartnershipEditorForm mode="create" listHref="/admin/kerjasama" />,
    );
    const el = $(markup);
    expect(el.querySelector("form")?.getAttribute("novalidate")).toBe("");
  });
});
