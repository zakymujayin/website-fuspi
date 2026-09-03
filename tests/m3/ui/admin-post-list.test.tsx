import { readFileSync, globSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const {
  normalizeAdminPostQuery,
  toAdminPostTransportQuery,
  buildAdminPostHref,
  totalPagesFor,
  buildPaginationItems,
  ADMIN_POST_PAGE_SIZE,
} = await import("@/components/admin/posts/post-query");
const { formatAdminPostInstant, formatAdminPostLocales } = await import(
  "@/components/admin/posts/post-format"
);
const { loadAdminPostsSafely } = await import("@/components/admin/posts/post-safe-load");
const { AdminPostFilterTabs } = await import("@/components/admin/posts/post-filter-tabs");
const { AdminPostPagination } = await import("@/components/admin/posts/post-pagination");
const { AdminPostStateNotice } = await import("@/components/admin/posts/post-state-notice");
const { AdminPostList } = await import("@/components/admin/posts/post-list");
const { AdminPostStatusBadge } = await import("@/components/admin/posts/post-status-badge");

function markupToContainer(markup: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

const SAMPLE_ITEM = {
  id: "post-1",
  slug: "wisuda-fuspi-2026",
  title: "Wisuda FUSPI Tahun 2026",
  availableLocales: ["id", "en"] as const,
  publicationState: "PUBLISHED" as const,
  isFeatured: true,
  publishedAt: "2026-07-15T03:00:00.000Z",
  updatedAt: "2026-07-16T04:00:00.000Z",
  category: { id: "cat-1", label: "Akademik" },
  author: { name: "Editor FUSPI" },
  capabilities: { update: true },
};

const SAMPLE_LABELS = {
  stateLabel: (state: string) => `state:${state}`,
  featured: "Unggulan",
  localesLabel: (locales: string) => `Bahasa tersedia: ${locales}`,
  uncategorized: "Tanpa kategori",
  unknownAuthor: "Penulis tidak diketahui",
  byLabel: (name: string) => `Oleh ${name}`,
  publishedAtLabel: (instant: string) => `Terbit ${instant}`,
  updatedAtLabel: (instant: string) => `Diperbarui ${instant}`,
  edit: "Sunting",
  editLabelFor: (title: string) => `Sunting berita: ${title}`,
  columns: {
    title: "Judul",
    category: "Kategori",
    author: "Penulis",
    locales: "Bahasa",
    status: "Status",
    published: "Terbit",
    actions: "Aksi",
  },
};

const FILTER_LABELS = {
  ALL: "Semua",
  DRAFT: "Draf",
  PUBLISHED: "Terbit",
  ARCHIVED: "Arsip",
} as const;

describe("normalizeAdminPostQuery — whole-record fail-closed normalization", () => {
  it("defaults to page 1 / ALL with the default page size and no search", () => {
    expect(normalizeAdminPostQuery({})).toEqual({
      page: 1,
      status: "ALL",
      search: "",
      pageSize: ADMIN_POST_PAGE_SIZE,
    });
  });

  it("accepts the valid page and status pair", () => {
    expect(normalizeAdminPostQuery({ page: "3", status: "DRAFT" })).toEqual({
      page: 3,
      status: "DRAFT",
      search: "",
      pageSize: ADMIN_POST_PAGE_SIZE,
    });
  });

  it("defaults to page size 10", () => {
    expect(normalizeAdminPostQuery({}).pageSize).toBe(10);
  });

  it("accepts a trimmed search term and an allowed page size", () => {
    expect(normalizeAdminPostQuery({ search: "  wisuda  ", pageSize: "50" })).toEqual({
      page: 1, status: "ALL", search: "wisuda", pageSize: 50,
    });
  });

  it.each([
    ["unknown key", { page: "2", ownerId: "attacker" }],
    ["repeated page", { page: ["2", "3"] }],
    ["repeated status", { status: ["DRAFT", "PUBLISHED"] }],
    ["repeated search", { search: ["a", "b"] }],
    ["leading-zero page", { page: "01" }],
    ["zero page", { page: "0" }],
    ["negative page", { page: "-4" }],
    ["over-bound page", { page: "10001" }],
    ["non-numeric page", { page: "2; DROP TABLE" }],
    ["unknown status", { status: "SCHEDULED" }],
    ["lowercase status", { status: "draft" }],
    ["free-int page size", { pageSize: "30" }],
    ["control char in search", { search: "a\u0000b" }],
    ["over-long search", { search: "x".repeat(101) }],
  ])("collapses the entire query to canonical for %s", (_label, raw) => {
    expect(normalizeAdminPostQuery(raw as Record<string, string | string[] | undefined>)).toEqual({
      page: 1,
      status: "ALL",
      search: "",
      pageSize: 10,
    });
  });

  it("only takes pageSize from the URL when it is an allowed literal", () => {
    expect(normalizeAdminPostQuery({ page: "2" }).pageSize).toBe(ADMIN_POST_PAGE_SIZE);
    expect(normalizeAdminPostQuery({ pageSize: "20" }).pageSize).toBe(20);
  });
});

describe("toAdminPostTransportQuery", () => {
  it("passes the normalized search and page size through with sort fixed", () => {
    expect(
      toAdminPostTransportQuery({ page: 2, status: "DRAFT", search: "wisuda", pageSize: 50 }),
    ).toEqual({
      page: 2,
      pageSize: 50,
      status: "DRAFT",
      search: "wisuda",
      sort: "UPDATED_DESC",
    });
  });

  it("adds a content type only when a type-specific admin route requests it", () => {
    expect(
      toAdminPostTransportQuery({ page: 2, status: "DRAFT", search: "", pageSize: 10 }, "KOLOM"),
    ).toEqual({
      page: 2,
      pageSize: 10,
      type: "KOLOM",
      status: "DRAFT",
      search: "",
      sort: "UPDATED_DESC",
    });
  });
});

describe("buildAdminPostHref", () => {
  it("omits defaults so the canonical page has a bare path", () => {
    expect(buildAdminPostHref("ALL", 1)).toBe("/admin/posts");
  });

  it("preserves a non-default filter and page", () => {
    expect(buildAdminPostHref("DRAFT", 3)).toBe("/admin/posts?status=DRAFT&page=3");
  });

  it("omits page 1 when only the filter is set", () => {
    expect(buildAdminPostHref("ARCHIVED", 1)).toBe("/admin/posts?status=ARCHIVED");
  });

  it("serializes a search term and a non-default page size, resetting to page 1", () => {
    expect(buildAdminPostHref("ALL", 1, "/admin/posts", { search: "wisuda", pageSize: 50 }))
      .toBe("/admin/posts?search=wisuda&pageSize=50");
  });

  it("omits page size 10 from the URL", () => {
    expect(buildAdminPostHref("DRAFT", 2, "/admin/posts", { pageSize: 10 }))
      .toBe("/admin/posts?status=DRAFT&page=2");
  });
});

describe("pagination maths", () => {
  it("always reports at least one page", () => {
    expect(totalPagesFor(0, 20)).toBe(1);
    expect(totalPagesFor(0, 0)).toBe(1);
  });

  it("rounds partial pages up", () => {
    expect(totalPagesFor(41, 20)).toBe(3);
  });

  it("windows long ranges with ellipses around the current page", () => {
    expect(buildPaginationItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("returns a single item when there is nothing to paginate", () => {
    expect(buildPaginationItems(1, 1)).toEqual([1]);
  });
});

describe("loadAdminPostsSafely", () => {
  it("passes a successful result through untouched", async () => {
    await expect(loadAdminPostsSafely(async () => ({ ok: true, data: "x" }))).resolves.toEqual({
      ok: true,
      data: "x",
    });
  });

  it("converts a thrown error into UNAVAILABLE without leaking the message", async () => {
    const result = await loadAdminPostsSafely(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432 fuspi_prod");
    });
    expect(result).toEqual({ ok: false, code: "UNAVAILABLE" });
    expect(JSON.stringify(result)).not.toContain("ECONNREFUSED");
    expect(JSON.stringify(result)).not.toContain("fuspi_prod");
  });
});

describe("formatting", () => {
  it("renders the instant in Asia/Jakarta, not UTC", () => {
    // 2026-07-15T03:00Z is 10:00 in Jakarta (UTC+7).
    expect(formatAdminPostInstant("2026-07-15T03:00:00.000Z", "id")).toContain("10");
    expect(formatAdminPostInstant("2026-07-15T03:00:00.000Z", "id")).toContain("15/07/2026");
  });

  it("formats per locale", () => {
    expect(formatAdminPostInstant("2026-07-15T03:00:00.000Z", "en")).toContain("15/07/2026");
  });

  it("joins available locales as uppercase codes", () => {
    expect(formatAdminPostLocales(["id", "en", "ar"])).toBe("ID · EN · AR");
  });
});

describe("AdminPostFilterTabs", () => {
  it("marks only the active filter with aria-current", () => {
    const markup = renderToStaticMarkup(
      <AdminPostFilterTabs active="DRAFT" ariaLabel="Saring" labels={FILTER_LABELS} />,
    );
    const container = markupToContainer(markup);
    const current = container.querySelectorAll("[aria-current='page']");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe("Draf");
  });

  it("resets every filter link to page 1", () => {
    const markup = renderToStaticMarkup(
      <AdminPostFilterTabs active="ALL" ariaLabel="Saring" labels={FILTER_LABELS} />,
    );
    for (const anchor of markupToContainer(markup).querySelectorAll("a")) {
      expect(anchor.getAttribute("href")).not.toContain("page=");
    }
  });

  it("gives every filter tab a 40px control height", () => {
    const markup = renderToStaticMarkup(
      <AdminPostFilterTabs active="ALL" ariaLabel="Saring" labels={FILTER_LABELS} />,
    );
    for (const anchor of markupToContainer(markup).querySelectorAll("a")) {
      expect(anchor.getAttribute("class")).toContain("h-10");
    }
  });
});

describe("AdminPostPagination", () => {
  const props = {
    status: "ALL" as const,
    ariaLabel: "Navigasi",
    previousLabel: "Sebelumnya",
    nextLabel: "Berikutnya",
    pageStatusLabel: "Hal 2 dari 5",
    goToPageLabel: (page: number) => `Ke halaman ${page}`,
  };

  it("renders nothing when there is a single page", () => {
    const markup = renderToStaticMarkup(
      <AdminPostPagination current={1} totalPages={1} {...props} />,
    );
    expect(markup).toBe("");
  });

  it("mirrors chevrons for RTL rather than using a physical direction utility", () => {
    const markup = renderToStaticMarkup(
      <AdminPostPagination current={2} totalPages={5} {...props} />,
    );
    const svgs = markupToContainer(markup).querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.getAttribute("class")).toContain("rtl:rotate-180");
    }
  });

  it("marks the current page with aria-current and does not link it", () => {
    const markup = renderToStaticMarkup(
      <AdminPostPagination current={2} totalPages={5} {...props} />,
    );
    const current = markupToContainer(markup).querySelectorAll("[aria-current='page']");
    expect(current).toHaveLength(1);
    expect(current[0].tagName).not.toBe("A");
  });

  it("preserves the active filter in every page link", () => {
    const markup = renderToStaticMarkup(
      <AdminPostPagination current={2} totalPages={5} {...props} status="ARCHIVED" />,
    );
    for (const anchor of markupToContainer(markup).querySelectorAll("a")) {
      expect(anchor.getAttribute("href")).toContain("status=ARCHIVED");
    }
  });
});

describe("AdminPostStateNotice", () => {
  it("does not make an ordinary empty list an alert", () => {
    const markup = renderToStaticMarkup(
      <AdminPostStateNotice variant="empty" title="Belum ada berita" description="…" />,
    );
    expect(markupToContainer(markup).querySelector("[role='alert']")).toBeNull();
  });

  it("marks the unavailable state as an alert", () => {
    const markup = renderToStaticMarkup(
      <AdminPostStateNotice variant="unavailable" title="Tidak dapat dimuat" description="…" />,
    );
    expect(markupToContainer(markup).querySelector("[role='alert']")).not.toBeNull();
  });
});

describe("AdminPostStatusBadge", () => {
  it.each(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const)(
    "renders a distinct text label for %s rather than relying on colour alone",
    (state) => {
      const markup = renderToStaticMarkup(
        <AdminPostStatusBadge state={state} label={`label-${state}`} />,
      );
      expect(markupToContainer(markup).textContent).toBe(`label-${state}`);
    },
  );
});

describe("AdminPostList", () => {
  it("renders title, state, featured flag, locales, category, author, and Jakarta time", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList
        items={[SAMPLE_ITEM]}
        locale="id"
        ariaLabel="Daftar berita"
        labels={SAMPLE_LABELS}
      />,
    );
    const container = markupToContainer(markup);
    const text = container.textContent ?? "";

    expect(text).toContain("Wisuda FUSPI Tahun 2026");
    expect(text).toContain("state:PUBLISHED");
    expect(text).toContain("Unggulan");
    expect(text).toContain("ID · EN");
    expect(text).toContain("Akademik");
    expect(text).toContain("Oleh Editor FUSPI");
    expect(text).toContain("Terbit");
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe(SAMPLE_ITEM.publishedAt);
  });

  it("falls back to the updated instant when the post has never been published", () => {
    const draft = {
      ...SAMPLE_ITEM,
      publicationState: "DRAFT" as const,
      publishedAt: null,
      isFeatured: false,
    };
    const markup = renderToStaticMarkup(
      <AdminPostList items={[draft]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const container = markupToContainer(markup);
    expect(container.textContent).toContain("Diperbarui");
    expect(container.textContent).not.toContain("Unggulan");
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe(SAMPLE_ITEM.updatedAt);
  });

  it("uses safe fallbacks for a missing category and author", () => {
    const orphan = { ...SAMPLE_ITEM, category: null, author: null };
    const markup = renderToStaticMarkup(
      <AdminPostList items={[orphan]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const text = markupToContainer(markup).textContent ?? "";
    expect(text).toContain("Tanpa kategori");
    expect(text).toContain("Penulis tidak diketahui");
  });

  it("exposes the list under its accessible name with one row per entry", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList
        items={[SAMPLE_ITEM, { ...SAMPLE_ITEM, id: "post-2" }]}
        locale="id"
        ariaLabel="Daftar berita"
        labels={SAMPLE_LABELS}
      />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector("table")?.getAttribute("aria-label")).toBe("Daftar berita");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(2);
  });

  it("renders a header cell per column with a scope", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList items={[SAMPLE_ITEM]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const headers = Array.from(markupToContainer(markup).querySelectorAll("thead th"));
    expect(headers).toHaveLength(7);
    for (const header of headers) {
      expect(header.getAttribute("scope")).toBe("col");
    }
    const text = markupToContainer(markup).querySelector("thead")?.textContent ?? "";
    expect(text).toContain("Judul");
    expect(text).toContain("Kategori");
    expect(text).toContain("Terbit");
  });

  it("never renders the slug, and performs no mutation from the list itself", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList items={[SAMPLE_ITEM]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const container = markupToContainer(markup);
    // The slug must stay out of the DOM entirely — the E2E suite asserts this too, and the edit
    // route is keyed by id, not slug.
    expect(container.innerHTML).not.toContain(SAMPLE_ITEM.slug);
    expect(container.textContent).not.toContain(SAMPLE_ITEM.id);
    // Navigation only: no publish/archive/delete control mutates from this list.
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(container.querySelectorAll("form")).toHaveLength(0);
  });
});

describe("editor navigation", () => {
  it("links each updatable row to its editor by id, not slug", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList items={[SAMPLE_ITEM]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const link = markupToContainer(markup).querySelector("a");
    expect(link?.getAttribute("href")).toBe(`/admin/posts/${SAMPLE_ITEM.id}/edit`);
    expect(link?.getAttribute("href")).not.toContain(SAMPLE_ITEM.slug);
  });

  it("gives every edit link a per-row accessible name", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList
        items={[SAMPLE_ITEM, { ...SAMPLE_ITEM, id: "post-2", title: "Berita Kedua" }]}
        locale="id"
        ariaLabel="Daftar"
        labels={SAMPLE_LABELS}
      />,
    );
    const names = Array.from(markupToContainer(markup).querySelectorAll("a")).map((a) =>
      a.getAttribute("aria-label"),
    );
    expect(names).toEqual([
      "Sunting berita: Wisuda FUSPI Tahun 2026",
      "Sunting berita: Berita Kedua",
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("hides the edit link when the server says the actor cannot update the row", () => {
    const locked = { ...SAMPLE_ITEM, capabilities: { update: false } };
    const markup = renderToStaticMarkup(
      <AdminPostList items={[locked]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    expect(markupToContainer(markup).querySelectorAll("a")).toHaveLength(0);
  });

  it("shows edit only on the rows that permit it in a mixed list", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList
        items={[
          SAMPLE_ITEM,
          { ...SAMPLE_ITEM, id: "post-2", capabilities: { update: false } },
          { ...SAMPLE_ITEM, id: "post-3" },
        ]}
        locale="id"
        ariaLabel="Daftar"
        labels={SAMPLE_LABELS}
      />,
    );
    const hrefs = Array.from(markupToContainer(markup).querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual(["/admin/posts/post-1/edit", "/admin/posts/post-3/edit"]);
  });

  it("keeps the edit control at the 40px height contract", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList items={[SAMPLE_ITEM]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const link = markupToContainer(markup).querySelector("a");
    expect(link?.getAttribute("class")).toContain("h-10");
  });

  it("exposes a create action on the list page that targets the new-post route", () => {
    const pageContents = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/admin/posts/page.tsx"),
      "utf8",
    );
    expect(pageContents).toContain('href="/admin/posts/new"');
    expect(pageContents).toContain('t("createAction")');
  });

  it("translates the new navigation labels in all three locales", () => {
    for (const locale of ["id", "en", "ar"]) {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      const block = JSON.parse(raw).AdminPostList;
      for (const key of ["createAction", "edit", "editLabelFor"]) {
        expect(block[key], `${locale} missing ${key}`).toBeTruthy();
      }
      expect(block.editLabelFor).toContain("{title}");
    }
  });
});

describe("direction safety and message parity", () => {
  it("uses no physical direction utility anywhere in the Post admin surface", () => {
    const forbidden = [
      /\bml-\d/,
      /\bmr-\d/,
      /\bpl-\d/,
      /\bpr-\d/,
      /\btext-left\b/,
      /\btext-right\b/,
      /\bleft-\d/,
      /\bright-\d/,
      /\bborder-l\b/,
      /\bborder-r\b/,
      /\brounded-l-/,
      /\bfloat-left\b/,
    ];
    const files = [
      ...globSync("src/components/admin/posts/*.{ts,tsx}", { cwd: process.cwd() }),
      ...globSync("src/app/[locale]/admin/posts/*.tsx", { cwd: process.cwd() }),
    ];
    expect(files.length).toBeGreaterThan(5);

    for (const relativePath of files) {
      const contents = readFileSync(path.join(process.cwd(), relativePath), "utf8");
      for (const pattern of forbidden) {
        expect(contents, `${relativePath} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("defines the same AdminPostList keys in id, en, and ar", () => {
    const flatten = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([key, child]) =>
            flatten(child, prefix ? `${prefix}.${key}` : key),
          )
        : [prefix];

    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      return flatten(JSON.parse(raw).AdminPostList).sort();
    });

    expect(id.length).toBeGreaterThan(20);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);
  });

  it("keeps genuine Arabic copy rather than untranslated Latin text", () => {
    const raw = readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8");
    const block = JSON.parse(raw).AdminPostList;
    expect(block.title).toMatch(/[؀-ۿ]/);
    expect(block.empty.title).toMatch(/[؀-ۿ]/);
  });

  it("marks the page heading with the site's existing brass-rule token", () => {
    const pageContents = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/admin/posts/page.tsx"),
      "utf8",
    );
    expect(pageContents).toMatch(/<h1[^>]*className="[^"]*\bsection-rule\b/);
  });

  it("pairs every skeleton pulse block with motion-reduce:animate-none", async () => {
    const { AdminPostListSkeleton } = await import(
      "@/components/admin/posts/post-list-skeleton"
    );
    const markup = renderToStaticMarkup(<AdminPostListSkeleton loadingLabel="Memuat…" />);
    const pulses = Array.from(
      markupToContainer(markup).querySelectorAll('[class*="animate-pulse"]'),
    );
    expect(pulses.length).toBeGreaterThan(0);
    for (const element of pulses) {
      expect(element.getAttribute("class")).toContain("motion-reduce:animate-none");
    }
  });
});

describe("search + page-size controls (Task 4)", () => {
  it.each([
    ["src/app/[locale]/admin/posts/page.tsx", "AdminPostList"],
    ["src/app/[locale]/admin/kolom/page.tsx", "AdminColumnList"],
    ["src/app/[locale]/admin/pengumuman/page.tsx", "AdminAnnouncementList"],
  ])("%s renders search + page-size controls", (relPath) => {
    const source = readFileSync(path.join(process.cwd(), relPath), "utf8");
    expect(source).toContain("AdminListSearch");
    expect(source).toContain("AdminPageSizeSelect");
  });

  it("defines the search + page-size keys in id, en, and ar for all three post namespaces", () => {
    for (const locale of ["id", "en", "ar"]) {
      const messages = JSON.parse(
        readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8"),
      );
      for (const ns of ["AdminPostList", "AdminColumnList", "AdminAnnouncementList"]) {
        for (const key of [
          "searchPlaceholder",
          "searchAriaLabel",
          "searchAction",
          "searchClear",
          "pageSizeLabel",
        ]) {
          expect(messages[ns][key], `${locale}.${ns}.${key}`).toBeTruthy();
        }
        expect(messages[ns].searchEmpty.title, `${locale}.${ns}.searchEmpty.title`).toBeTruthy();
        expect(
          messages[ns].searchEmpty.description,
          `${locale}.${ns}.searchEmpty.description`,
        ).toBeTruthy();
      }
    }
  });
});
