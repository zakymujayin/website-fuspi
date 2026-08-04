import { describe, expect, it, vi } from "vitest";

const { fetchAdminPageList, fetchAdminPageEditor } = await import(
  "@/components/admin/pages/page-api"
);

const PAGE_LIST_RESULT = {
  items: [
    {
      id: "page-1",
      slug: "profil",
      title: "Profil",
      availableLocales: ["id"],
      status: "PUBLISHED",
      version: 1,
      order: 0,
      parentId: null,
      parentTitle: null,
      hasChildren: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
  hasNextPage: false,
};

const PAGE_EDITOR_VIEW = {
  id: "page-1",
  slug: "profil",
  status: "DRAFT",
  order: 0,
  version: 1,
  parentId: null,
  heroMediaId: null,
  translations: {
    id: {
      title: "Profil",
      content: "<p>Isi</p>",
      metaTitle: null,
      metaDesc: null,
    },
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  hero: null,
};

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);
}

describe("fetchAdminPageList", () => {
  it("returns data on a successful fetch", async () => {
    mockFetch(new Response(JSON.stringify(PAGE_LIST_RESULT), { status: 200 }));
    const result = await fetchAdminPageList({
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "",
      sort: "UPDATED_DESC",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toHaveLength(1);
    expect(result.data.items[0].slug).toBe("profil");
  });

  it("returns UNAVAILABLE when the response is not OK", async () => {
    mockFetch(new Response(JSON.stringify({ code: "UNAVAILABLE" }), { status: 500 }));
    const result = await fetchAdminPageList({
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "",
      sort: "UPDATED_DESC",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAVAILABLE");
  });

  it("returns UNAVAILABLE on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));
    const result = await fetchAdminPageList({
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "",
      sort: "UPDATED_DESC",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAVAILABLE");
  });
});

describe("fetchAdminPageEditor", () => {
  it("returns data on a successful fetch", async () => {
    mockFetch(new Response(JSON.stringify(PAGE_EDITOR_VIEW), { status: 200 }));
    const result = await fetchAdminPageEditor("page-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe("page-1");
  });

  it("returns UNAVAILABLE when the response is not OK", async () => {
    mockFetch(new Response(JSON.stringify({ code: "UNAVAILABLE" }), { status: 500 }));
    const result = await fetchAdminPageEditor("page-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAVAILABLE");
  });

  it("returns UNAVAILABLE on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));
    const result = await fetchAdminPageEditor("page-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAVAILABLE");
  });
});
