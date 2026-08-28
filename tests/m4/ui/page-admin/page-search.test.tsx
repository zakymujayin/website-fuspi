import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => `t:${key}`,
}));

let capturedBuildHref: ((search: string) => string) | null = null;
vi.mock("@/components/admin/shared/admin-list-search", () => ({
  AdminListSearch: ({ buildHref }: { buildHref: (search: string) => string }) => {
    capturedBuildHref = buildHref;
    return null;
  },
}));

const { AdminPageSearch } = await import("@/components/admin/pages/page-search");

describe("AdminPageSearch", () => {
  it("keeps the chosen non-default page size when searching and when clearing", () => {
    capturedBuildHref = null;
    renderToStaticMarkup(
      <AdminPageSearch initialSearch="" status="ALL" sort="UPDATED_DESC" pageSize={50} />,
    );
    expect(capturedBuildHref).not.toBeNull();
    expect(capturedBuildHref!("wisuda")).toBe("/admin/pages?search=wisuda&pageSize=50");
    // Clearing the term reuses the same builder with an empty search.
    expect(capturedBuildHref!("")).toBe("/admin/pages?pageSize=50");
  });

  it("leaves the URL bare for the default page size", () => {
    capturedBuildHref = null;
    renderToStaticMarkup(
      <AdminPageSearch initialSearch="" status="ALL" sort="UPDATED_DESC" pageSize={10} />,
    );
    expect(capturedBuildHref!("")).toBe("/admin/pages");
  });
});
