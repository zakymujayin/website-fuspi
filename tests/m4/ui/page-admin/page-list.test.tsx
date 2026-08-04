import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const { AdminPageList } = await import("@/components/admin/pages/page-list");
const { AdminPageStateNotice } = await import("@/components/admin/pages/page-state-notice");
const { AdminPageStatusBadge } = await import("@/components/admin/pages/page-status-badge");

function markupToContainer(markup: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

const SAMPLE_ITEM = {
  id: "page-1",
  slug: "profil-fuspi",
  title: "Profil FUSPI",
  availableLocales: ["id", "en"] as const,
  status: "PUBLISHED" as const,
  order: 1,
  parentId: null,
  parentTitle: null,
  hasChildren: true,
  updatedAt: "2026-07-16T04:00:00.000Z",
};

const SAMPLE_LABELS = {
  stateLabel: (state: string) => `state:${state}`,
  localesLabel: (locales: string) => `Bahasa: ${locales}`,
  parentLabel: (title: string) => `Induk: ${title}`,
  childIndicator: "Memiliki sub-halaman",
  orderLabel: (order: string) => `Urutan ${order}`,
  updatedAtLabel: (instant: string) => `Diperbarui ${instant}`,
  edit: "Sunting",
  editLabelFor: (title: string) => `Sunting halaman: ${title}`,
};

describe("AdminPageList", () => {
  it("renders the title, slug, status badge, and edit link", () => {
    const markup = renderToStaticMarkup(
      <AdminPageList items={[SAMPLE_ITEM]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const container = markupToContainer(markup);
    expect(container.textContent).toContain("Profil FUSPI");
    expect(container.textContent).toContain("profil-fuspi");
    expect(container.textContent).toContain("state:PUBLISHED");
    const link = container.querySelector("a[href='/admin/pages/page-1/edit']");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("aria-label")).toBe("Sunting halaman: Profil FUSPI");
  });

  it("renders locale badges for ID/EN/AR", () => {
    const markup = renderToStaticMarkup(
      <AdminPageList items={[SAMPLE_ITEM]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const container = markupToContainer(markup);
    const badges = container.querySelectorAll("span[aria-hidden='false']");
    const texts = Array.from(badges).map((el) => el.textContent);
    expect(texts).toContain("ID");
    expect(texts).toContain("EN");
  });

  it("renders parent and child indicators when present", () => {
    const item = { ...SAMPLE_ITEM, parentTitle: "Tentang" };
    const markup = renderToStaticMarkup(
      <AdminPageList items={[item]} locale="id" ariaLabel="Daftar" labels={SAMPLE_LABELS} />,
    );
    const container = markupToContainer(markup);
    expect(container.textContent).toContain("Induk: Tentang");
    expect(container.textContent).toContain("Memiliki sub-halaman");
  });
});

describe("AdminPageStatusBadge", () => {
  it("renders the label", () => {
    const markup = renderToStaticMarkup(
      <AdminPageStatusBadge state="PUBLISHED" label="Terbit" />,
    );
    expect(markup).toContain("Terbit");
  });
});

describe("AdminPageStateNotice", () => {
  it("renders empty variant without alert role", () => {
    const markup = renderToStaticMarkup(
      <AdminPageStateNotice variant="empty" title="Kosong" description="Belum ada data." />,
    );
    expect(markup).toContain("Kosong");
    expect(markup).not.toContain('role="alert"');
  });

  it("renders unavailable variant with alert role", () => {
    const markup = renderToStaticMarkup(
      <AdminPageStateNotice variant="unavailable" title="Gagal" description="Coba lagi." />,
    );
    expect(markup).toContain('role="alert"');
  });
});
