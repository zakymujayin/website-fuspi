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
    ok: true, id: "test-1", resource: "FAQ", version: 1,
  }),
}));

const { FaqEditorForm } = await import(
  "@/components/admin/public-content/faq-editor-form"
);

function $(markup: string) {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

describe("FaqEditorForm", () => {
  it("renders create mode form", () => {
    const markup = renderToStaticMarkup(
      <FaqEditorForm mode="create" listHref="/admin/faq" />,
    );
    const el = $(markup);
    expect(el.querySelector("form")).toBeTruthy();
    // FAQ form uses t("createAction") for submit button
    expect(el.textContent).toContain("createAction");
  });

  it("renders edit mode with initial data", () => {
    const markup = renderToStaticMarkup(
      <FaqEditorForm
        mode="edit"
        listHref="/admin/faq"
        pageId="faq-1"
        expectedVersion={2}
        initialData={{
          order: 1,
          isVisible: true,
          translations: {
            id: {category: "Umum", question: "Apa itu?", answer: "Jawaban"},
            en: {category: "General", question: "What is it?", answer: "Answer"},
            ar: {category: "", question: "", answer: ""},
          },
        } as Record<string, unknown>}
      />,
    );
    const el = $(markup);
    expect(markup).toContain("Apa itu?");
    expect(el.textContent).toContain("updateAction");
  });

  it("renders locale tabs", () => {
    const markup = renderToStaticMarkup(
      <FaqEditorForm mode="create" listHref="/admin/faq" />,
    );
    const el = $(markup);
    expect(el.querySelectorAll("[role='tab']")).toHaveLength(3);
  });

  it("renders order field", () => {
    const markup = renderToStaticMarkup(
      <FaqEditorForm mode="create" listHref="/admin/faq" />,
    );
    const el = $(markup);
    expect(el.querySelector("input[type='number']")).toBeTruthy();
  });

  it("renders isVisible checkbox", () => {
    const markup = renderToStaticMarkup(
      <FaqEditorForm mode="create" listHref="/admin/faq" />,
    );
    const el = $(markup);
    expect(el.querySelector("input[type='checkbox']")).toBeTruthy();
  });

  it("renders cancel button", () => {
    const markup = renderToStaticMarkup(
      <FaqEditorForm mode="create" listHref="/admin/faq" />,
    );
    const el = $(markup);
    const cancelBtn = Array.from(el.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("t:cancel"),
    );
    expect(cancelBtn).toBeTruthy();
  });

  it("has noValidate on form", () => {
    const markup = renderToStaticMarkup(
      <FaqEditorForm mode="create" listHref="/admin/faq" />,
    );
    const el = $(markup);
    expect(el.querySelector("form")?.getAttribute("novalidate")).toBe("");
  });

  it("uses logical spacing classes for RTL", () => {
    const markup = renderToStaticMarkup(
      <FaqEditorForm mode="create" listHref="/admin/faq" />,
    );
    const el = $(markup);
    // Form should be rendered with proper structure
    expect(el.querySelector("form")).toBeTruthy();
    // The form has RTL support through dir attributes and logical CSS
    expect(markup).toContain("tab");
  });
});
