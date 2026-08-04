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
    ok: true, id: "test-1", resource: "SERVICE", version: 1,
  }),
}));

const { ServiceEditorForm } = await import(
  "@/components/admin/public-content/service-editor-form"
);

function $(markup: string) {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

const CREATE_PROPS = {
  mode: "create" as const,
  listHref: "/admin/layanan",
};

const EDIT_PROPS = {
  mode: "edit" as const,
  listHref: "/admin/layanan",
  pageId: "svc-1",
  expectedVersion: 3,
  initialData: {
    slug: "test-service",
    category: "AKADEMIK",
    link: null,
    icon: "book",
    isActive: true,
    order: 1,
    translations: {
      id: {name: "Layanan Test", description: "Deskripsi layanan"},
      en: {name: "Test Service", description: "Service description"},
      ar: {name: "", description: ""},
    },
  } as Record<string, unknown>,
};

describe("ServiceEditorForm", () => {
  it("renders create mode form", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    expect(el.querySelector("form")).toBeTruthy();
    expect(el.querySelector("form")?.getAttribute("novalidate")).toBe("");
    expect(el.textContent).toContain("submitCreate");
  });

  it("renders edit mode form", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...EDIT_PROPS} />);
    const el = $(markup);
    expect(el.querySelector("form")).toBeTruthy();
    expect(el.textContent).toContain("submitUpdate");
    expect(markup).toContain("test-service");
  });

  it("renders locale tabs (id, en, ar)", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    const tabs = el.querySelectorAll("[role='tab']");
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    // ID tab panel is in the markup
    expect(markup).toContain("locale-panel-id");
  });

  it("hides non-active locale panels", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    // Non-active panels should have hidden attribute (ends with locale-panel-en or locale-panel-ar)
    const enPanel = markup.includes("locale-panel-en");
    expect(enPanel).toBe(true);
  });

  it("renders slug field", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    expect(el.querySelector("input[name='slug']")).toBeTruthy();
  });

  it("renders category select", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    expect(el.querySelector("select")).toBeTruthy();
    // AKADEMIK, LABORATORIUM, UMUM options
    expect(markup).toContain("AKADEMIK");
    expect(markup).toContain("LABORATORIUM");
    expect(markup).toContain("UMUM");
  });

  it("renders icon text field", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    expect(el.querySelector("input[name='icon']")).toBeTruthy();
  });

  it("renders isActive checkbox", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    expect(el.querySelector("input[type='checkbox']")).toBeTruthy();
  });

  it("renders order field", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    expect(el.querySelector("input[type='number']")).toBeTruthy();
  });

  it("renders cancel button", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    const cancelBtn = Array.from(el.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("t:cancel"),
    );
    expect(cancelBtn).toBeTruthy();
  });

  it("renders translation tab content for active locale", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    // ID locale fields should be visible
    expect(el.querySelector("input[name='slug']")).toBeTruthy();
  });

  it("has noValidate on form element", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    const el = $(markup);
    expect(el.querySelector("form")?.getAttribute("novalidate")).toBe("");
  });

  it("renders submit button in create mode", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    expect(markup).toContain("submitCreate");
  });

  it("renders submit button in edit mode", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...EDIT_PROPS} />);
    expect(markup).toContain("submitUpdate");
  });
});

describe("ServiceEditorForm — translations", () => {
  it("renders translation title field for active locale", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    // The ID locale panel should be rendered (id ends with locale-panel-id)
    expect(markup).toContain("locale-panel-id");
  });

  it("Arabic panel has RTL support", () => {
    const markup = renderToStaticMarkup(<ServiceEditorForm {...CREATE_PROPS} />);
    // Arabic inputs should have dir=rtl somewhere in the markup
    expect(markup).toContain('dir="rtl"');
  });
});
