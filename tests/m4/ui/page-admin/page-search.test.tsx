import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

let capturedHref: string | null = null;
vi.mock("@/components/admin/shared/admin-list-search", () => ({
  AdminListSearchClient: ({ href }: { href: string }) => {
    capturedHref = href;
    return null;
  },
}));

const { AdminPageSearch } = await import("@/components/admin/pages/page-search");

describe("AdminPageSearch", () => {
  it("keeps the chosen non-default page size when searching and when clearing", () => {
    capturedHref = null;
    renderToStaticMarkup(
      <AdminPageSearch initialSearch="" status="ALL" sort="UPDATED_DESC" pageSize={50} />,
    );
    expect(capturedHref).toBe("/admin/pages?pageSize=50");
  });

  it("leaves the URL bare for the default page size", () => {
    capturedHref = null;
    renderToStaticMarkup(
      <AdminPageSearch initialSearch="" status="ALL" sort="UPDATED_DESC" pageSize={10} />,
    );
    expect(capturedHref).toBe("/admin/pages");
  });
});
