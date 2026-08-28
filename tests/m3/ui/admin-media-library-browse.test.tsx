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
  useRouter: () => ({ refresh: () => {} }),
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double standing in for next/image, not a real rendered page.
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

const { normalizeAdminMediaQuery, buildAdminMediaHref, totalPagesFor, buildPaginationItems } = await import(
  "@/components/admin/media/media-query"
);
const { formatAdminMediaBytes, formatAdminMediaDimensions, formatAdminMediaCreatedAt } = await import(
  "@/components/admin/media/media-format"
);
const { resolveAdminMediaThumbnail } = await import("@/components/admin/media/media-thumbnail-resolver");
const { loadAdminMediaSafely } = await import("@/components/admin/media/media-safe-load");
const { AdminMediaFilterTabs } = await import("@/components/admin/media/media-filter-tabs");
const { AdminMediaPagination } = await import("@/components/admin/media/media-pagination");
const { AdminMediaStateNotice } = await import("@/components/admin/media/media-state-notice");
const { AdminMediaGrid } = await import("@/components/admin/media/media-grid");

function markupToContainer(markup: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

const SAMPLE_ITEM = {
  id: "media-1",
  url: "/uploads/2026/01/cover.webp",
  mimeType: "image/webp" as const,
  size: 245_760,
  alt: "Dokumentasi kegiatan FUSPI",
  isDecorative: false,
  width: 1_200,
  height: 800,
  focalX: null,
  focalY: null,
  originalName: "kegiatan-fuspi.webp",
  createdAt: "2026-01-15T17:30:00.000Z",
  uploaderName: "Editor FUSPI",
};

const SAMPLE_LABELS = {
  kindImage: "Gambar",
  kindPdf: "PDF",
  decorative: "Dekoratif (tanpa teks alternatif)",
  altLabel: (alt: string) => `Teks alternatif: ${alt}`,
  uploadedByLabel: (name: string) => `Diunggah oleh ${name}`,
  deleteAction: "Hapus",
  deletePending: "Menghapus...",
  deleteConfirmTitle: "Hapus media ini?",
  deleteConfirmDescription: (name: string) => `Media ${name} akan dihapus dari pustaka bila tidak sedang digunakan di konten lain.`,
  deleteConfirmAction: "Hapus media",
  deleteCancel: "Batal",
  deleteErrors: {
    SESSION_INVALID: "Sesi Anda telah berakhir.",
    CSRF_INVALID: "Permintaan tidak dapat diverifikasi.",
    REQUEST_INVALID: "Permintaan tidak dapat diproses.",
    VALIDATION_FAILED: "Media tidak valid.",
    NOT_FOUND: "Media tidak ditemukan.",
    MEDIA_IN_USE: "Media masih digunakan.",
    UPLOAD_FAILED: "Media tidak dapat dihapus.",
    UNAVAILABLE: "Media tidak dapat dihapus saat ini.",
  },
  focalPointAction: "Atur titik fokus",
  focalPointEditorLabel: "Klik untuk menentukan titik fokus",
  focalPointHintTemplate: "Titik fokus: {x}%, {y}%",
  focalPointCancel: "Batal",
  focalPointSave: "Simpan titik fokus",
  focalPointSaving: "Menyimpan...",
  focalPointErrors: {
    SESSION_INVALID: "Sesi Anda telah berakhir.",
    CSRF_INVALID: "Permintaan tidak dapat diverifikasi.",
    REQUEST_INVALID: "Permintaan tidak dapat diproses.",
    VALIDATION_FAILED: "Titik fokus tidak valid.",
    NOT_FOUND: "Media tidak ditemukan.",
    MEDIA_IN_USE: "Titik fokus tidak dapat disimpan.",
    UPLOAD_FAILED: "Titik fokus tidak dapat disimpan.",
    UNAVAILABLE: "Titik fokus tidak dapat disimpan saat ini.",
  },
};

const CANONICAL_DEFAULT = { page: 1, kind: "ALL", pageSize: 24 } as const;

describe("whole-record query normalization to a canonical default", () => {
  it("passes through a valid page and kind", () => {
    expect(normalizeAdminMediaQuery({ page: "5", kind: "IMAGE" })).toEqual({
      page: 5,
      kind: "IMAGE",
      pageSize: 24,
    });
  });

  it("defaults page and kind independently when either is omitted", () => {
    expect(normalizeAdminMediaQuery({ kind: "PDF" })).toEqual({ page: 1, kind: "PDF", pageSize: 24 });
    expect(normalizeAdminMediaQuery({ page: "3" })).toEqual({ page: 3, kind: "ALL", pageSize: 24 });
    expect(normalizeAdminMediaQuery({})).toEqual(CANONICAL_DEFAULT);
  });

  it("resets the entire query when an excessive page is requested, never clamping to 10000", () => {
    expect(normalizeAdminMediaQuery({ page: "99999", kind: "IMAGE" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "10001" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "10000" })).toEqual({ page: 10_000, kind: "ALL", pageSize: 24 });
  });

  it("resets the entire query for an unknown key, even alongside otherwise-valid fields", () => {
    expect(normalizeAdminMediaQuery({ owner: "other", page: "2" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ pageSize: "48" })).toEqual(CANONICAL_DEFAULT);
  });

  it("resets the entire query for a repeated/array value on either field", () => {
    expect(normalizeAdminMediaQuery({ page: ["2", "3"], kind: "IMAGE" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ kind: ["IMAGE", "PDF"] })).toEqual(CANONICAL_DEFAULT);
  });

  it("resets the entire query for a leading-zero, fractional, negative, or non-numeric page", () => {
    expect(normalizeAdminMediaQuery({ page: "0" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "01" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "007" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "2.5" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "-3" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "abc" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "" })).toEqual(CANONICAL_DEFAULT);
  });

  it("resets the entire query — including an otherwise-valid page — when kind is unrecognized", () => {
    expect(normalizeAdminMediaQuery({ page: "3", kind: "image" })).toEqual(CANONICAL_DEFAULT);
    expect(normalizeAdminMediaQuery({ page: "3", kind: "OTHER" })).toEqual(CANONICAL_DEFAULT);
  });

  it("computes total pages from the fixed page size of 24", () => {
    expect(totalPagesFor(0, 24)).toBe(1);
    expect(totalPagesFor(48, 24)).toBe(2);
    expect(totalPagesFor(49, 24)).toBe(3);
  });

  it("builds a windowed pagination list with ellipses", () => {
    expect(buildPaginationItems(1, 1)).toEqual([1]);
    expect(buildPaginationItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });
});

describe("route-level failure boundary around client acquisition and the service call", () => {
  it("passes through a successful load unchanged", async () => {
    const result = await loadAdminMediaSafely(async () => ({ ok: true as const, data: "loaded" }));
    expect(result).toEqual({ ok: true, data: "loaded" });
  });

  it("fails closed to a non-technical unavailable result when client acquisition throws", async () => {
    const result = await loadAdminMediaSafely(() => {
      throw new Error("DATABASE_URL is required to create a Prisma client.");
    });
    expect(result).toEqual({ ok: false, code: "UNAVAILABLE" });
  });

  it("fails closed to a non-technical unavailable result when the service call rejects", async () => {
    const result = await loadAdminMediaSafely(() => Promise.reject(new Error("ECONNREFUSED")));
    expect(result).toEqual({ ok: false, code: "UNAVAILABLE" });
  });

  it("never leaks the underlying exception message into the returned result", async () => {
    const result = await loadAdminMediaSafely(() => {
      throw new Error("password authentication failed for user \"prisma\"");
    });
    expect(JSON.stringify(result)).not.toContain("password authentication");
  });
});

describe("locale-preserving filter and pagination links", () => {
  it("omits both params for the ALL filter on page 1", () => {
    expect(buildAdminMediaHref("ALL", 1)).toBe("/admin/media");
  });

  it("includes only kind when page is 1", () => {
    expect(buildAdminMediaHref("IMAGE", 1)).toBe("/admin/media?kind=IMAGE");
  });

  it("includes only page for the ALL filter beyond page 1", () => {
    expect(buildAdminMediaHref("ALL", 3)).toBe("/admin/media?page=3");
  });

  it("includes both kind and page together", () => {
    expect(buildAdminMediaHref("PDF", 2)).toBe("/admin/media?kind=PDF&page=2");
  });

  it("renders filter tabs with the active filter marked and locale-safe hrefs", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaFilterTabs
        active="IMAGE"
        ariaLabel="Saring media berdasarkan jenis"
        labels={{ ALL: "Semua", IMAGE: "Gambar", PDF: "PDF" }}
      />,
    );
    const container = markupToContainer(markup);
    const links = Array.from(container.querySelectorAll("a"));
    expect(links).toHaveLength(3);
    expect(container.querySelector('a[aria-current="page"]')?.textContent).toBe("Gambar");
    expect(container.querySelector('a[aria-current="page"]')?.getAttribute("href")).toBe(
      "/admin/media?kind=IMAGE",
    );
    expect(links.find((a) => a.textContent === "Semua")?.getAttribute("href")).toBe("/admin/media");
  });

  it("renders pagination links preserving the active kind filter, and mirrors chevrons for RTL", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaPagination
        current={5}
        totalPages={10}
        kind="PDF"
        ariaLabel="Navigasi halaman pustaka media"
        previousLabel="Halaman sebelumnya"
        nextLabel="Halaman berikutnya"
        pageStatusLabel="Hal 5 dari 10"
        goToPageLabel={(page) => `Ke halaman ${page}`}
      />,
    );
    const container = markupToContainer(markup);

    expect(container.querySelector('a[aria-label="Halaman sebelumnya"]')?.getAttribute("href")).toBe(
      "/admin/media?kind=PDF&page=4",
    );
    expect(container.querySelector('a[aria-label="Halaman berikutnya"]')?.getAttribute("href")).toBe(
      "/admin/media?kind=PDF&page=6",
    );
    expect(container.querySelector('span[aria-current="page"]')?.textContent).toBe("5");
    expect(container.querySelector('a[aria-label="Ke halaman 1"]')?.getAttribute("href")).toBe(
      "/admin/media?kind=PDF",
    );
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.getAttribute("class")).toContain("rtl:rotate-180");
    }
  });

  it("renders no pagination nav when there is only one page", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaPagination
        current={1}
        totalPages={1}
        kind="ALL"
        ariaLabel="Navigasi halaman pustaka media"
        previousLabel="Halaman sebelumnya"
        nextLabel="Halaman berikutnya"
        pageStatusLabel="Hal 1 dari 1"
        goToPageLabel={(page) => `Ke halaman ${page}`}
      />,
    );
    expect(markup).toBe("");
  });
});

describe("Jakarta date and byte formatting", () => {
  // 2026-01-15T17:30Z is 2026-01-16 00:30 in Asia/Jakarta (UTC+7) — proves the
  // timezone is actually applied, not the test runner's local timezone.
  const CROSS_MIDNIGHT_ISO = "2026-01-15T17:30:00.000Z";

  it("formats the Jakarta creation date and time per locale", () => {
    expect(formatAdminMediaCreatedAt(CROSS_MIDNIGHT_ISO, "id")).toContain("16 Januari 2026");
    expect(formatAdminMediaCreatedAt(CROSS_MIDNIGHT_ISO, "en")).toContain("January 16, 2026");
    expect(formatAdminMediaCreatedAt(CROSS_MIDNIGHT_ISO, "ar")).toContain("يناير");
  });

  it("formats byte sizes in binary steps", () => {
    expect(formatAdminMediaBytes(512, "id")).toBe("512 B");
    expect(formatAdminMediaBytes(2_048, "id")).toBe("2 KB");
    expect(formatAdminMediaBytes(245_760, "en")).toBe("240 KB");
    expect(formatAdminMediaBytes(5_242_880, "en")).toBe("5 MB");
  });

  it("formats pixel dimensions per locale", () => {
    expect(formatAdminMediaDimensions(1_200, 800, "id")).toBe("1.200×800");
    expect(formatAdminMediaDimensions(1_200, 800, "en")).toBe("1,200×800");
  });
});

describe("safe local thumbnail conversion versus intentional placeholder", () => {
  const UPLOAD_PUBLIC_URL = "https://fuspi.uinbanten.ac.id/uploads";

  it("passes through an already-relative /uploads path", () => {
    const resolved = resolveAdminMediaThumbnail(
      { ...SAMPLE_ITEM, url: "/uploads/2026/01/cover.webp" },
      UPLOAD_PUBLIC_URL,
    );
    expect(resolved).toEqual({
      kind: "image",
      src: "/uploads/2026/01/cover.webp",
      width: 1_200,
      height: 800,
      alt: "Dokumentasi kegiatan FUSPI",
      isDecorative: false,
    });
  });

  it("converts a same-origin absolute URL to a local path", () => {
    const resolved = resolveAdminMediaThumbnail(
      { ...SAMPLE_ITEM, url: `${UPLOAD_PUBLIC_URL}/2026/01/cover.webp` },
      UPLOAD_PUBLIC_URL,
    );
    expect(resolved).toMatchObject({ kind: "image", src: "/uploads/2026/01/cover.webp" });
  });

  it("falls back to a placeholder for a cross-origin URL", () => {
    const resolved = resolveAdminMediaThumbnail(
      { ...SAMPLE_ITEM, url: "https://evil.example/uploads/cover.webp" },
      UPLOAD_PUBLIC_URL,
    );
    expect(resolved).toEqual({ kind: "placeholder" });
  });

  it("falls back to a placeholder when the configured upload URL is invalid", () => {
    const resolved = resolveAdminMediaThumbnail(
      { ...SAMPLE_ITEM, url: `${UPLOAD_PUBLIC_URL}/2026/01/cover.webp` },
      "",
    );
    expect(resolved).toEqual({ kind: "placeholder" });
  });

  it("uses the local /uploads fallback when the admin page has no public upload URL env", () => {
    const pageContents = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/admin/media/page.tsx"),
      "utf8",
    );
    expect(pageContents).toContain('process.env.UPLOAD_PUBLIC_URL ?? "/uploads"');
  });

  it("resolves a PDF to its own intentional placeholder, never next/image", () => {
    const resolved = resolveAdminMediaThumbnail(
      {
        ...SAMPLE_ITEM,
        url: "/uploads/2026/01/dokumen.pdf",
        mimeType: "application/pdf",
        width: null,
        height: null,
      },
      UPLOAD_PUBLIC_URL,
    );
    expect(resolved).toEqual({ kind: "pdf" });
  });

  it("still renders legacy image media when dimensions are missing", () => {
    const resolved = resolveAdminMediaThumbnail(
      { ...SAMPLE_ITEM, width: null, height: null },
      UPLOAD_PUBLIC_URL,
    );
    expect(resolved).toMatchObject({
      kind: "image",
      src: "/uploads/2026/01/cover.webp",
      width: null,
      height: null,
    });
  });

  it("constrains a relative local path to the /uploads contract, even when same-origin", () => {
    const resolved = resolveAdminMediaThumbnail(
      { ...SAMPLE_ITEM, url: "/other/cover.webp" },
      UPLOAD_PUBLIC_URL,
    );
    expect(resolved).toEqual({ kind: "placeholder" });
  });
});

describe("empty and unavailable copy without technical disclosure", () => {
  const FORBIDDEN_SUBSTRINGS = ["DATABASE_URL", "Prisma", "ECONNREFUSED", "storageKey", "at Object.", "UPLOAD_DIR"];

  it("renders only the translated unavailable copy", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaStateNotice
        variant="unavailable"
        title="Pustaka media sedang tidak dapat dimuat"
        description="Silakan muat ulang halaman ini beberapa saat lagi."
      />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    const text = container.textContent ?? "";
    expect(text).toContain("Pustaka media sedang tidak dapat dimuat");
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("renders only the translated empty-library copy without an alert role", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaStateNotice
        variant="empty"
        title="Belum ada media"
        description="Media akan tampil di sini setelah diunggah."
      />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain("Belum ada media");
  });

  it("always renders the notice title as an h2, never a page-level h1", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaStateNotice variant="empty" title="Belum ada media" description="x" />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector("h2")?.textContent).toBe("Belum ada media");
    expect(container.querySelector("h1")).toBeNull();
  });
});

describe("accessible Media Library item semantics", () => {
  it("renders a semantic list with one item per Media record", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaGrid
        items={[SAMPLE_ITEM, { ...SAMPLE_ITEM, id: "media-2", originalName: "kegiatan-2.webp" }]}
        locale="id"
        uploadPublicUrl="https://fuspi.uinbanten.ac.id/uploads"
        ariaLabel="Daftar item media"
        labels={SAMPLE_LABELS}
      />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector('ul[aria-label="Daftar item media"]')).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders a delete action for each media item", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaGrid
        items={[SAMPLE_ITEM]}
        locale="id"
        uploadPublicUrl="https://fuspi.uinbanten.ac.id/uploads"
        ariaLabel="Daftar item media"
        labels={SAMPLE_LABELS}
      />,
    );
    const container = markupToContainer(markup);
    const deleteButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Hapus"));
    expect(deleteButton).not.toBeUndefined();
  });

  it("shows the alt text for an informative image and hides the decorative label", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaGrid
        items={[SAMPLE_ITEM]}
        locale="id"
        uploadPublicUrl="https://fuspi.uinbanten.ac.id/uploads"
        ariaLabel="Daftar item media"
        labels={SAMPLE_LABELS}
      />,
    );
    const text = markupToContainer(markup).textContent ?? "";
    expect(text).toContain("Teks alternatif: Dokumentasi kegiatan FUSPI");
    expect(text).not.toContain("Dekoratif");
  });

  it("shows the decorative label instead of empty alt text for a decorative image", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaGrid
        items={[{ ...SAMPLE_ITEM, isDecorative: true, alt: "" }]}
        locale="id"
        uploadPublicUrl="https://fuspi.uinbanten.ac.id/uploads"
        ariaLabel="Daftar item media"
        labels={SAMPLE_LABELS}
      />,
    );
    const text = markupToContainer(markup).textContent ?? "";
    expect(text).toContain("Dekoratif (tanpa teks alternatif)");
  });

  it("omits the uploader line entirely when uploaderName is null", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaGrid
        items={[{ ...SAMPLE_ITEM, uploaderName: null }]}
        locale="id"
        uploadPublicUrl="https://fuspi.uinbanten.ac.id/uploads"
        ariaLabel="Daftar item media"
        labels={SAMPLE_LABELS}
      />,
    );
    expect(markupToContainer(markup).textContent).not.toContain("Diunggah oleh");
  });

  it("shows dimensions for an image and omits them for a dimensionless PDF", () => {
    const pdfMarkup = renderToStaticMarkup(
      <AdminMediaGrid
        items={[
          {
            ...SAMPLE_ITEM,
            id: "media-pdf",
            url: "/uploads/2026/01/dokumen.pdf",
            mimeType: "application/pdf",
            width: null,
            height: null,
            focalX: null,
            focalY: null,
            alt: "",
            isDecorative: false,
            originalName: "dokumen.pdf",
          },
        ]}
        locale="id"
        uploadPublicUrl="https://fuspi.uinbanten.ac.id/uploads"
        ariaLabel="Daftar item media"
        labels={SAMPLE_LABELS}
      />,
    );
    expect(markupToContainer(pdfMarkup).textContent).not.toContain("×");

    const imageMarkup = renderToStaticMarkup(
      <AdminMediaGrid
        items={[SAMPLE_ITEM]}
        locale="id"
        uploadPublicUrl="https://fuspi.uinbanten.ac.id/uploads"
        ariaLabel="Daftar item media"
        labels={SAMPLE_LABELS}
      />,
    );
    expect(markupToContainer(imageMarkup).textContent).toContain("1.200×800");
  });

  it("renders a machine-readable dateTime on <time> alongside the Jakarta-formatted label", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaGrid
        items={[SAMPLE_ITEM]}
        locale="id"
        uploadPublicUrl="https://fuspi.uinbanten.ac.id/uploads"
        ariaLabel="Daftar item media"
        labels={SAMPLE_LABELS}
      />,
    );
    const time = markupToContainer(markup).querySelector("time");
    expect(time?.getAttribute("dateTime")).toBe(SAMPLE_ITEM.createdAt);
    expect(time?.textContent).toContain("16 Januari 2026");
  });
});

describe("Arabic direction-safe markup", () => {
  it("never emits a physical-direction Tailwind utility in any admin Media component or route", () => {
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
      ...globSync("src/components/admin/media/*.{ts,tsx}", { cwd: process.cwd() }),
      ...globSync("src/app/[locale]/admin/media/*.tsx", { cwd: process.cwd() }),
    ];
    expect(files.length).toBeGreaterThan(5);

    for (const relativePath of files) {
      const contents = readFileSync(path.join(process.cwd(), relativePath), "utf8");
      for (const pattern of forbidden) {
        expect(contents, `${relativePath} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe("Web Interface Guidelines touch target and motion-safety corrections", () => {
  it("gives every filter tab a 40px control height, matching docs/17-A", () => {
    const markup = renderToStaticMarkup(
      <AdminMediaFilterTabs
        active="ALL"
        ariaLabel="Saring media berdasarkan jenis"
        labels={{ ALL: "Semua", IMAGE: "Gambar", PDF: "PDF" }}
      />,
    );
    for (const anchor of markupToContainer(markup).querySelectorAll("a")) {
      expect(anchor.getAttribute("class")).toContain("h-10");
    }
  });

  it("pairs every skeleton pulse block with motion-reduce:animate-none", async () => {
    const { AdminMediaGridSkeleton } = await import("@/components/admin/media/media-grid-skeleton");
    const markup = renderToStaticMarkup(<AdminMediaGridSkeleton loadingLabel="Memuat…" />);
    const container = markupToContainer(markup);
    const pulseElements = Array.from(container.querySelectorAll('[class*="animate-pulse"]'));
    expect(pulseElements.length).toBeGreaterThan(0);
    for (const element of pulseElements) {
      expect(element.getAttribute("class")).toContain("motion-reduce:animate-none");
    }
  });

  it("marks the page heading with the site's single existing brass-rule token, not a new ornament", () => {
    const pageContents = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/admin/media/page.tsx"),
      "utf8",
    );
    expect(pageContents).toMatch(/<h1[^>]*className="[^"]*\bsection-rule\b/);
  });
});
