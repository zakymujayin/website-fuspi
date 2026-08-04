import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { PageDeleteAction } = await import("@/components/admin/pages/page-delete-action");

describe("PageDeleteAction", () => {
  it("renders nothing when the actor cannot delete", () => {
    const markup = renderToStaticMarkup(
      <PageDeleteAction
        pageId="page-1"
        canDelete={false}
        listHref="/admin/pages"
        mutationBusy={false}
        beginMutation={() => ({ token: 1, version: 1 })}
        finishMutation={() => {}}
      />,
    );
    expect(markup).toBe("");
  });

  it("renders the delete section when deletion is allowed", () => {
    const markup = renderToStaticMarkup(
      <PageDeleteAction
        pageId="page-1"
        canDelete={true}
        listHref="/admin/pages"
        mutationBusy={false}
        beginMutation={() => ({ token: 1, version: 1 })}
        finishMutation={() => {}}
      />,
    );
    expect(markup).toContain("t:title");
    expect(markup).toContain("t:action");
    // Dialog content is portal-rendered and not present in static markup
  });
});
