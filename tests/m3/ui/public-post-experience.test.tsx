import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
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

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double standing in for next/image, not a real rendered page.
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

const { buildLocaleAlternates } = await import("@/components/public/post/hreflang");
const { buildBreadcrumbJsonLd, buildNewsArticleJsonLd, serializeJsonLd } = await import(
  "@/components/public/post/json-ld"
);
const { sanitizeStoredContentOrNull } = await import("@/components/public/post/sanitize");
const {
  clampPageToTotalPages,
  parsePageCandidate,
  buildPaginationItems,
  totalPagesFor,
} = await import("@/components/public/post/pagination");
const { resolveCoverImageSrc } = await import("@/components/public/post/cover-image");
const { estimateReadingMinutes, formatJakartaPublishedDate, humanizeCategorySlug } = await import(
  "@/components/public/post/format"
);
const { PostFallbackBanner } = await import("@/components/public/post/post-fallback-banner");
const { PostStateNotice } = await import("@/components/public/post/post-state-notice");
const { PostBreadcrumb } = await import("@/components/public/post/post-breadcrumb");
const { PostPagination } = await import("@/components/public/post/post-pagination");
const { PostCardHorizontal } = await import("@/components/public/post/post-card-horizontal");

function markupToContainer(markup: string): HTMLDivElement {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

const SAMPLE_COVER = {
  id: "media-1",
  mimeType: "image/webp" as const,
  size: 1_024,
  alt: "Dokumentasi FUSPI",
  isDecorative: false,
  width: 320,
  height: 240,
};

describe("Jakarta-localized date and reading-time presentation", () => {
  // 2026-01-15T17:30Z is 2026-01-16 00:30 in Asia/Jakarta (UTC+7) — proves the
  // timezone is actually applied, not the test runner's local timezone.
  const CROSS_MIDNIGHT_UTC = new Date("2026-01-15T17:30:00.000Z");

  it("formats the Jakarta calendar date per locale", () => {
    expect(formatJakartaPublishedDate(CROSS_MIDNIGHT_UTC, "id")).toBe("16 Januari 2026");
    expect(formatJakartaPublishedDate(CROSS_MIDNIGHT_UTC, "en")).toBe("January 16, 2026");
    expect(formatJakartaPublishedDate(CROSS_MIDNIGHT_UTC, "ar")).toContain("يناير");
    expect(formatJakartaPublishedDate(CROSS_MIDNIGHT_UTC, "ar")).toContain("2026");
  });

  it("estimates ~200 words/minute with a floor of one minute", () => {
    const words = (count: number) => `<p>${Array.from({ length: count }, () => "kata").join(" ")}</p>`;
    expect(estimateReadingMinutes(words(50))).toBe(1);
    expect(estimateReadingMinutes(words(400))).toBe(2);
    expect(estimateReadingMinutes(words(401))).toBe(3);
    expect(estimateReadingMinutes("<p></p>")).toBe(1);
  });

  it("humanizes a category slug without inventing a translated name", () => {
    expect(humanizeCategorySlug("berita-kampus")).toBe("berita kampus");
  });
});

describe("page normalization and pagination", () => {
  it.each([
    ["abc", 1],
    ["0", 1],
    ["-3", 1],
    ["2.5", 1],
    ["", 1],
    [undefined, 1],
    ["5", 5],
    ["99999", 10_000],
  ])("normalizes page candidate %p to %p", (raw, expected) => {
    expect(parsePageCandidate(raw as string | undefined)).toBe(expected);
  });

  it("treats a repeated/array page param as invalid", () => {
    expect(parsePageCandidate(["2", "3"])).toBe(1);
  });

  it("clamps an excessive page to the last real page once total is known", () => {
    expect(clampPageToTotalPages(99, 3)).toBe(3);
    expect(clampPageToTotalPages(0, 3)).toBe(1);
    expect(clampPageToTotalPages(2, 3)).toBe(2);
  });

  it("computes total pages from a fixed page size of 10", () => {
    expect(totalPagesFor(0, 10)).toBe(1);
    expect(totalPagesFor(25, 10)).toBe(3);
  });

  it("builds a windowed pagination list with ellipses", () => {
    expect(buildPaginationItems(1, 1)).toEqual([1]);
    expect(buildPaginationItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
  });

  it("renders pagination links and mirrors the chevrons for RTL", () => {
    const markup = renderToStaticMarkup(
      <PostPagination
        current={5}
        totalPages={10}
        basePath="/berita"
        ariaLabel="Berita"
        previousLabel="Sebelumnya"
        nextLabel="Berikutnya"
        pageStatusLabel="Hal 5 dari 10"
        goToPageLabel={(page) => `Ke halaman ${page}`}
      />,
    );
    const container = markupToContainer(markup);

    expect(container.querySelector('a[aria-label="Sebelumnya"]')?.getAttribute("href")).toBe(
      "/berita?page=4",
    );
    expect(container.querySelector('a[aria-label="Berikutnya"]')?.getAttribute("href")).toBe(
      "/berita?page=6",
    );
    expect(container.querySelector('span[aria-current="page"]')?.textContent).toBe("5");
    expect(container.querySelector('a[aria-label="Ke halaman 1"]')?.getAttribute("href")).toBe(
      "/berita",
    );
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.getAttribute("class")).toContain("rtl:rotate-180");
    }
  });
});

describe("same-origin cover conversion versus safe placeholder", () => {
  it("passes through an already-relative /uploads path", () => {
    const resolved = resolveCoverImageSrc(
      { ...SAMPLE_COVER, url: "/uploads/2026/01/cover.webp" },
      "https://fuspi.example",
    );
    expect(resolved).toEqual({
      kind: "image",
      src: "/uploads/2026/01/cover.webp",
      width: 320,
      height: 240,
      alt: "Dokumentasi FUSPI",
      isDecorative: false,
    });
  });

  it("converts a same-origin absolute URL to a local path", () => {
    const resolved = resolveCoverImageSrc(
      { ...SAMPLE_COVER, url: "https://fuspi.example/uploads/cover.webp" },
      "https://fuspi.example",
    );
    expect(resolved).toMatchObject({ kind: "image", src: "/uploads/cover.webp" });
  });

  it("falls back to a placeholder for a cross-origin URL", () => {
    const resolved = resolveCoverImageSrc(
      { ...SAMPLE_COVER, url: "https://evil.example/uploads/cover.webp" },
      "https://fuspi.example",
    );
    expect(resolved).toEqual({ kind: "placeholder" });
  });

  it("falls back to a placeholder when the site origin is not configured", () => {
    const resolved = resolveCoverImageSrc(
      { ...SAMPLE_COVER, url: "https://fuspi.example/uploads/cover.webp" },
      undefined,
    );
    expect(resolved).toEqual({ kind: "placeholder" });
  });

  it("falls back to a placeholder for a missing cover or non-image media", () => {
    expect(resolveCoverImageSrc(null, "https://fuspi.example")).toEqual({ kind: "placeholder" });
    expect(
      resolveCoverImageSrc(
        { ...SAMPLE_COVER, url: "/uploads/doc.pdf", mimeType: "application/pdf", width: null, height: null },
        "https://fuspi.example",
      ),
    ).toEqual({ kind: "placeholder" });
  });
});

describe("safe re-sanitization of stored content", () => {
  it("strips a script tag before render", () => {
    const sanitized = sanitizeStoredContentOrNull("<p>Halo</p><script>alert(1)</script>");
    expect(sanitized).not.toBeNull();
    expect(sanitized).not.toContain("<script");
    expect(sanitized).toContain("<p>Halo</p>");
  });

  it("strips an inline event-handler attribute", () => {
    const sanitized = sanitizeStoredContentOrNull(
      '<img src="https://fuspi.example/uploads/x.webp" onerror="alert(1)">',
    );
    expect(sanitized).not.toBeNull();
    expect(sanitized).not.toContain("onerror");
  });

  it("strips a javascript: href", () => {
    const sanitized = sanitizeStoredContentOrNull('<a href="javascript:alert(1)">tautan</a>');
    expect(sanitized).not.toBeNull();
    expect(sanitized).not.toContain("javascript:");
  });

  it("fails closed to null instead of throwing on invalid input", () => {
    expect(() => sanitizeStoredContentOrNull(null as unknown as string)).not.toThrow();
    expect(sanitizeStoredContentOrNull(null as unknown as string)).toBeNull();
  });
});

describe("exact translation versus one calm fallback banner", () => {
  it("renders the fallback message when isFallback is true", () => {
    const markup = renderToStaticMarkup(
      <PostFallbackBanner message="Menampilkan versi Bahasa Indonesia." />,
    );
    expect(markupToContainer(markup).querySelector('[role="status"]')?.textContent).toContain(
      "Menampilkan versi Bahasa Indonesia.",
    );
  });

  it("renders a compact inline note for list cards without a full banner bar", () => {
    const markup = renderToStaticMarkup(
      <PostCardHorizontal
        href="/berita/contoh"
        title="Judul Contoh"
        excerpt="Ringkasan contoh."
        cover={{ kind: "placeholder" }}
        authorName="Editor FUSPI"
        dateLabel="16 Januari 2026"
        categoryLabel="akademik"
        readMoreLabel="Selengkapnya"
        fallbackNoticeMessage="Menampilkan versi Bahasa Indonesia."
      />,
    );
    const container = markupToContainer(markup);
    expect(container.textContent).toContain("Menampilkan versi Bahasa Indonesia.");
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("renders no fallback note at all when the translation is exact", () => {
    const markup = renderToStaticMarkup(
      <PostCardHorizontal
        href="/berita/contoh"
        title="Judul Contoh"
        cover={{ kind: "placeholder" }}
        dateLabel="16 Januari 2026"
        readMoreLabel="Selengkapnya"
      />,
    );
    expect(markupToContainer(markup).textContent).not.toContain("Bahasa Indonesia");
  });
});

describe("unavailable and empty state copy without technical disclosure", () => {
  const FORBIDDEN_SUBSTRINGS = ["DATABASE_URL", "Prisma", "ECONNREFUSED", "storageKey", "at Object.", "\\uploads\\"];

  it("renders only the translated unavailable copy", () => {
    const markup = renderToStaticMarkup(
      <PostStateNotice
        variant="unavailable"
        title="Berita sedang tidak dapat dimuat"
        description="Silakan muat ulang halaman ini beberapa saat lagi."
      />,
    );
    const text = markupToContainer(markup).textContent ?? "";
    expect(text).toContain("Berita sedang tidak dapat dimuat");
    for (const forbidden of FORBIDDEN_SUBSTRINGS) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("renders only the translated empty-archive copy", () => {
    const markup = renderToStaticMarkup(
      <PostStateNotice variant="empty" title="Belum ada berita" description="Berita akan tampil di sini setelah diterbitkan." />,
    );
    expect(markupToContainer(markup).textContent).toContain("Belum ada berita");
  });
});

describe("Arabic direction-safe markup and mirrored directional icons", () => {
  it("mirrors the breadcrumb separator via rtl:rotate-180", () => {
    const markup = renderToStaticMarkup(
      <PostBreadcrumb
        ariaLabel="Berita"
        items={[{ label: "Beranda", href: "/" }, { label: "Berita", href: "/berita" }, { label: "Judul Contoh" }]}
      />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelectorAll("a")).toHaveLength(2);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("Judul Contoh");
    const separator = container.querySelector("svg");
    expect(separator?.getAttribute("class")).toContain("rtl:rotate-180");
  });

  it("never emits a physical-direction Tailwind utility in any Post component or route", () => {
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
      ...globSync("src/components/public/post/*.{ts,tsx}", { cwd: process.cwd() }),
      ...globSync("src/app/[locale]/(public)/berita/**/*.tsx", { cwd: process.cwd() }),
    ];
    expect(files.length).toBeGreaterThan(10);

    for (const relativePath of files) {
      const contents = readFileSync(path.join(process.cwd(), relativePath), "utf8");
      for (const pattern of forbidden) {
        expect(contents, `${relativePath} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe("metadata and JSON-LD helpers exclude raw HTML and storage keys", () => {
  it("builds canonical + hreflang alternates including x-default", () => {
    const alternates = buildLocaleAlternates("/berita/contoh", "en", "https://fuspi.example");
    expect(alternates.canonical).toBe("https://fuspi.example/en/berita/contoh");
    expect(alternates.languages).toMatchObject({
      id: "https://fuspi.example/id/berita/contoh",
      en: "https://fuspi.example/en/berita/contoh",
      ar: "https://fuspi.example/ar/berita/contoh",
      "x-default": "https://fuspi.example/id/berita/contoh",
    });
  });

  it("degrades to root-relative alternates without a configured site origin", () => {
    const alternates = buildLocaleAlternates("/berita/contoh", "en", undefined);
    expect(alternates.canonical).toBe("/en/berita/contoh");
    expect(alternates.languages["x-default"]).toBe("/id/berita/contoh");
  });

  it("builds NewsArticle JSON-LD from plain text and safe URLs only", () => {
    const jsonLd = buildNewsArticleJsonLd({
      url: "https://fuspi.example/id/berita/contoh",
      headline: "Judul Contoh",
      description: "Ringkasan contoh",
      imageUrl: "https://fuspi.example/uploads/cover.webp",
      datePublished: "2026-01-16T00:30:00.000Z",
      authorName: "Editor FUSPI",
    });
    expect(jsonLd).toMatchObject({
      "@type": "NewsArticle",
      headline: "Judul Contoh",
      description: "Ringkasan contoh",
      image: ["https://fuspi.example/uploads/cover.webp"],
    });
    expect(jsonLd).not.toHaveProperty("articleBody");
    expect(jsonLd).not.toHaveProperty("storageKey");
  });

  it("builds an escaped BreadcrumbList JSON-LD", () => {
    const jsonLd = buildBreadcrumbJsonLd([
      { name: "Beranda", url: "https://fuspi.example/id" },
      { name: "Berita", url: "https://fuspi.example/id/berita" },
    ]);
    expect(jsonLd.itemListElement).toHaveLength(2);
  });

  it("escapes </script> so injected headline text cannot break out of the tag", () => {
    const jsonLd = buildNewsArticleJsonLd({
      url: "https://fuspi.example/id/berita/contoh",
      headline: "Judul </script><script>alert(1)</script>",
      description: null,
      imageUrl: null,
      datePublished: "2026-01-16T00:30:00.000Z",
      authorName: null,
    });
    const serialized = serializeJsonLd(jsonLd);
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script>");
  });
});
