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
const { validateSiteOrigin } = await import("@/components/public/post/site-origin");
const { estimateReadingMinutes, formatJakartaPublishedDate, humanizeCategorySlug } = await import(
  "@/components/public/post/format"
);
const { PostFallbackBanner } = await import("@/components/public/post/post-fallback-banner");
const { PostStateNotice } = await import("@/components/public/post/post-state-notice");
const { PostBreadcrumb } = await import("@/components/public/post/post-breadcrumb");
const { PostPagination } = await import("@/components/public/post/post-pagination");
const { PostCardHorizontal } = await import("@/components/public/post/post-card-horizontal");
const { PostArticleBody } = await import("@/components/public/post/post-article-body");
const { PostSidebarLatest } = await import("@/components/public/post/post-sidebar-latest");

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
      null,
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

  it("constrains a relative local path to the /uploads contract, even when same-origin", () => {
    const resolved = resolveCoverImageSrc(
      { ...SAMPLE_COVER, url: "/other/cover.webp" },
      "https://fuspi.example",
    );
    expect(resolved).toEqual({ kind: "placeholder" });
  });
});

describe("URL robustness — validated site origin", () => {
  it("accepts a valid http(s) origin", () => {
    expect(validateSiteOrigin("https://fuspi.example")).toBe("https://fuspi.example");
    expect(validateSiteOrigin("http://localhost:3004")).toBe("http://localhost:3004");
  });

  it("rejects a malformed truthy value instead of letting new URL throw", () => {
    expect(validateSiteOrigin("not-a-url")).toBeNull();
    expect(validateSiteOrigin("://broken")).toBeNull();
  });

  it("rejects a non-HTTP(S) protocol", () => {
    expect(validateSiteOrigin("ftp://fuspi.example")).toBeNull();
    expect(validateSiteOrigin("javascript:alert(1)")).toBeNull();
  });

  it("rejects an empty or missing value", () => {
    expect(validateSiteOrigin(undefined)).toBeNull();
    expect(validateSiteOrigin("")).toBeNull();
  });

  it("never throws when building cover src or alternates from a malformed configured origin", () => {
    const malformed = "not-a-url";
    expect(() => resolveCoverImageSrc(
      { ...SAMPLE_COVER, url: "/uploads/cover.webp" },
      validateSiteOrigin(malformed),
    )).not.toThrow();
    expect(() => buildLocaleAlternates("/berita", "id", validateSiteOrigin(malformed))).not.toThrow();
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
        resolvedLocale="id"
        cover={{ kind: "placeholder" }}
        authorName="Editor FUSPI"
        dateLabel="16 Januari 2026"
        dateTimeIso="2026-01-16T00:30:00.000Z"
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
        resolvedLocale="id"
        cover={{ kind: "placeholder" }}
        dateLabel="16 Januari 2026"
        dateTimeIso="2026-01-16T00:30:00.000Z"
        readMoreLabel="Selengkapnya"
      />,
    );
    expect(markupToContainer(markup).textContent).not.toContain("Bahasa Indonesia");
  });

  it("renders Indonesian fallback with lang=id dir=ltr even inside an Arabic RTL ancestor", () => {
    const markup = renderToStaticMarkup(
      <div dir="rtl" lang="ar">
        <PostCardHorizontal
          href="/berita/contoh"
          title="Judul Bahasa Indonesia"
          excerpt="Ringkasan Bahasa Indonesia."
          resolvedLocale="id"
          cover={{ kind: "placeholder" }}
          dateLabel="16 يناير 2026"
          dateTimeIso="2026-01-16T00:30:00.000Z"
          readMoreLabel="اقرأ المزيد"
        />
      </div>,
    );
    const container = markupToContainer(markup);
    const heading = container.querySelector("h2");
    const excerpt = container.querySelector("p");

    expect(heading?.getAttribute("lang")).toBe("id");
    expect(heading?.getAttribute("dir")).toBe("ltr");
    expect(excerpt?.getAttribute("lang")).toBe("id");
    expect(excerpt?.getAttribute("dir")).toBe("ltr");
  });

  it("carries resolvedLocale into the sidebar's fallback item too", () => {
    const markup = renderToStaticMarkup(
      <div dir="rtl" lang="ar">
        <PostSidebarLatest
          heading="أحدث الأخبار"
          seeAllLabel="عرض جميع الأخبار"
          seeAllHref="/berita"
          items={[
            {
              id: "post-1",
              href: "/berita/contoh",
              title: "Judul Bahasa Indonesia",
              resolvedLocale: "id",
              dateLabel: "16 Januari 2026",
              dateTimeIso: "2026-01-16T00:30:00.000Z",
              cover: { kind: "placeholder" },
            },
          ]}
        />
      </div>,
    );
    const container = markupToContainer(markup);
    const titleSpan = Array.from(container.querySelectorAll("span")).find(
      (span) => span.textContent === "Judul Bahasa Indonesia",
    );
    expect(titleSpan?.getAttribute("lang")).toBe("id");
    expect(titleSpan?.getAttribute("dir")).toBe("ltr");
  });

  it("wraps the article body with the resolved content locale, not the page locale", () => {
    const markup = renderToStaticMarkup(
      <div dir="rtl" lang="ar">
        <PostArticleBody html="<p>Konten Bahasa Indonesia.</p>" resolvedLocale="id" />
      </div>,
    );
    const container = markupToContainer(markup);
    const body = container.querySelector('[lang="id"]');
    expect(body?.getAttribute("dir")).toBe("ltr");
    expect(body?.textContent).toContain("Konten Bahasa Indonesia.");
  });
});

describe("unavailable and empty state copy without technical disclosure", () => {
  const FORBIDDEN_SUBSTRINGS = ["DATABASE_URL", "Prisma", "ECONNREFUSED", "storageKey", "at Object.", "\\uploads\\"];

  it("renders only the translated unavailable copy", () => {
    const markup = renderToStaticMarkup(
      <PostStateNotice
        variant="unavailable"
        headingAs="h2"
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
      <PostStateNotice
        variant="empty"
        headingAs="h2"
        title="Belum ada berita"
        description="Berita akan tampil di sini setelah diterbitkan."
      />,
    );
    expect(markupToContainer(markup).textContent).toContain("Belum ada berita");
  });

  it("renders the notice title as an h1 only when it stands in for the page's own H1", () => {
    const h1Markup = renderToStaticMarkup(
      <PostStateNotice
        variant="unavailable"
        headingAs="h1"
        title="Berita sedang tidak dapat dimuat"
        description="Silakan muat ulang halaman ini beberapa saat lagi."
      />,
    );
    const h1Container = markupToContainer(h1Markup);
    expect(h1Container.querySelector("h1")?.textContent).toBe("Berita sedang tidak dapat dimuat");
    expect(h1Container.querySelector("h2")).toBeNull();

    const h2Markup = renderToStaticMarkup(
      <PostStateNotice
        variant="unavailable"
        headingAs="h2"
        title="Berita sedang tidak dapat dimuat"
        description="Silakan muat ulang halaman ini beberapa saat lagi."
      />,
    );
    const h2Container = markupToContainer(h2Markup);
    expect(h2Container.querySelector("h2")?.textContent).toBe("Berita sedang tidak dapat dimuat");
    expect(h2Container.querySelector("h1")).toBeNull();
  });

  it("keeps exactly one H1 when the detail unavailable state (h1) sits beside an article H2 fallback", () => {
    const markup = renderToStaticMarkup(
      <div>
        <PostStateNotice
          variant="unavailable"
          headingAs="h1"
          title="Berita sedang tidak dapat dimuat"
          description="Silakan muat ulang halaman ini beberapa saat lagi."
        />
        <article>
          <PostStateNotice
            variant="unavailable"
            headingAs="h2"
            title="Berita sedang tidak dapat dimuat"
            description="Silakan muat ulang halaman ini beberapa saat lagi."
          />
        </article>
      </div>,
    );
    const container = markupToContainer(markup);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.querySelectorAll("h2")).toHaveLength(1);
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

  it("renders the breadcrumb's Indonesian fallback title with lang=id dir=ltr inside an Arabic ancestor", () => {
    const markup = renderToStaticMarkup(
      <div dir="rtl" lang="ar">
        <PostBreadcrumb
          ariaLabel="الأخبار"
          items={[
            { label: "الرئيسية", href: "/" },
            { label: "الأخبار", href: "/berita" },
            { label: "Judul Bahasa Indonesia", resolvedLocale: "id" },
          ]}
        />
      </div>,
    );
    const container = markupToContainer(markup);
    const titleCrumb = container.querySelector('[aria-current="page"]');

    expect(titleCrumb?.textContent).toBe("Judul Bahasa Indonesia");
    expect(titleCrumb?.getAttribute("lang")).toBe("id");
    expect(titleCrumb?.getAttribute("dir")).toBe("ltr");

    // Shell labels (Beranda/Berita) stay in the page locale — no lang/dir override.
    const shellCrumb = Array.from(container.querySelectorAll("a")).find(
      (anchor) => anchor.textContent === "الرئيسية",
    );
    expect(shellCrumb?.getAttribute("lang")).toBeNull();
    expect(shellCrumb?.getAttribute("dir")).toBeNull();
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

describe("Web Interface Guidelines corrections", () => {
  it("uses an h2 for the card title under the page H1, not h3", () => {
    const markup = renderToStaticMarkup(
      <PostCardHorizontal
        href="/berita/contoh"
        title="Judul Contoh"
        resolvedLocale="id"
        cover={{ kind: "placeholder" }}
        dateLabel="16 Januari 2026"
        dateTimeIso="2026-01-16T00:30:00.000Z"
        readMoreLabel="Selengkapnya"
      />,
    );
    const container = markupToContainer(markup);
    expect(container.querySelector("h2")).not.toBeNull();
    expect(container.querySelector("h3")).toBeNull();
  });

  it("renders a machine-readable dateTime on <time> alongside the locale-formatted label", () => {
    const markup = renderToStaticMarkup(
      <PostCardHorizontal
        href="/berita/contoh"
        title="Judul Contoh"
        resolvedLocale="id"
        cover={{ kind: "placeholder" }}
        dateLabel="16 Januari 2026"
        dateTimeIso="2026-01-16T00:30:00.000Z"
        readMoreLabel="Selengkapnya"
      />,
    );
    const time = markupToContainer(markup).querySelector("time");
    expect(time?.getAttribute("dateTime")).toBe("2026-01-16T00:30:00.000Z");
    expect(time?.textContent).toBe("16 Januari 2026");
  });

  it("gives the card content column and sidebar text column min-w-0 so long titles cannot overflow", () => {
    const cardMarkup = renderToStaticMarkup(
      <PostCardHorizontal
        href="/berita/contoh"
        title="Judul"
        resolvedLocale="id"
        cover={{ kind: "placeholder" }}
        dateLabel="16 Januari 2026"
        dateTimeIso="2026-01-16T00:30:00.000Z"
        readMoreLabel="Selengkapnya"
      />,
    );
    expect(cardMarkup).toMatch(/min-w-0/);

    const sidebarMarkup = renderToStaticMarkup(
      <PostSidebarLatest
        heading="Berita Terbaru"
        seeAllLabel="Lihat semua berita"
        seeAllHref="/berita"
        items={[
          {
            id: "post-1",
            href: "/berita/contoh",
            title: "Judul",
            resolvedLocale: "id",
            dateLabel: "16 Januari 2026",
            dateTimeIso: "2026-01-16T00:30:00.000Z",
            cover: { kind: "placeholder" },
          },
        ]}
      />,
    );
    expect(sidebarMarkup).toMatch(/min-w-0/);
  });

  it("renders one standalone H1 on the not-found page instead of a paragraph", () => {
    const contents = readFileSync(
      path.join(process.cwd(), "src/app/[locale]/(public)/berita/[slug]/not-found.tsx"),
      "utf8",
    );
    expect(contents).toMatch(/<h1[^>]*>\s*\{t\("notFound\.title"\)\}/);
  });
});

describe("rich-text article body styling", () => {
  it("styles every sanitizer-allowed tag family via Tailwind descendant selectors", () => {
    const markup = renderToStaticMarkup(
      <PostArticleBody
        resolvedLocale="id"
        html={[
          "<h2>Judul Bagian</h2>",
          "<p>Paragraf pertama dengan <a href=\"https://fuspi.example\">tautan</a>.</p>",
          "<ul><li>Butir satu</li><li>Butir dua</li></ul>",
          "<blockquote>Kutipan penting.</blockquote>",
          "<figure><img src=\"/uploads/2026/01/a.webp\" alt=\"\"><figcaption>Keterangan gambar.</figcaption></figure>",
          "<table><thead><tr><th>Kolom</th></tr></thead><tbody><tr><td>Sel</td></tr></tbody></table>",
          "<pre><code>const x = 1;</code></pre>",
          "<hr>",
        ].join("")}
      />,
    );
    const container = markupToContainer(markup);

    expect(container.querySelector("h2")?.textContent).toBe("Judul Bagian");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://fuspi.example");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("blockquote")?.textContent).toBe("Kutipan penting.");
    expect(container.querySelector("figcaption")?.textContent).toBe("Keterangan gambar.");
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("pre code")?.textContent).toBe("const x = 1;");
    expect(container.querySelector("hr")).not.toBeNull();

    const wrapperClassName = container.firstElementChild?.getAttribute("class") ?? "";
    expect(wrapperClassName).toMatch(/\[&_h2\]/);
    expect(wrapperClassName).toMatch(/\[&_blockquote\]:border-s-4/);
    expect(wrapperClassName).toMatch(/\[&_a\]/);
    expect(wrapperClassName).toMatch(/\[&_table\]:block/);
    expect(wrapperClassName).toMatch(/\[&_table\]:overflow-x-auto/);
    expect(wrapperClassName).toMatch(/\[&_pre\]:overflow-x-auto/);
    expect(wrapperClassName).toMatch(/\[&_code\]:break-words/);
    expect(wrapperClassName).toMatch(/\[&_td\]:break-words/);
  });

  it("never uses a physical-direction utility for blockquote or table cell alignment", () => {
    const markup = renderToStaticMarkup(
      <PostArticleBody resolvedLocale="id" html="<blockquote>x</blockquote>" />,
    );
    expect(markup).not.toMatch(/border-l\b/);
    expect(markup).not.toMatch(/\btext-left\b/);
    expect(markup).toMatch(/border-s-4/);
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
    const alternates = buildLocaleAlternates("/berita/contoh", "en", null);
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
