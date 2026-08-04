import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

function MockNextImage(props: Record<string, unknown>) {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} data-next-image="true" />;
}

vi.mock("next/image", () => ({
  default: MockNextImage,
}));

const { PublicContentCard } = await import("@/components/public/public-content-card");
const { PublicContentCardSkeleton, PublicContentListGridSkeleton } = await import(
  "@/components/public/public-content-card-skeleton"
);

const BASIC_ITEM = {
  id: "svc-1", resource: "SERVICE", slug: "test-service",
  title: "Test Service", summary: "A test service description",
  badge: "AKADEMIK", startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-12-31T00:00:00.000Z", media: null, link: null,
  translation: {requestedLocale: "id", resolvedLocale: "id", isFallback: false},
};

function $(markup: string) {
  const container = document.createElement("div");
  container.innerHTML = markup;
  return container;
}

describe("PublicContentCard", () => {
  it("renders a card with title and badge", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={BASIC_ITEM}
        detailHref="/layanan/test-service"
        titleLabel="Services"
        badgeLabel="AKADEMIK"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    expect(el.querySelector("article")).toBeTruthy();
    expect(el.textContent).toContain("Test Service");
    expect(el.textContent).toContain("AKADEMIK");
  });

  it("renders a link to detail when hasDetail is true and no external link", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={BASIC_ITEM}
        detailHref="/layanan/test-service"
        titleLabel="Services"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    const links = el.querySelectorAll("a");
    expect(links.length).toBeGreaterThan(0);
    const detailLink = Array.from(links).find(
      (a) => a.getAttribute("href") === "/layanan/test-service",
    );
    expect(detailLink).toBeTruthy();
  });

  it("renders an external link when item has external link", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={{...BASIC_ITEM, link: {kind: "EXTERNAL", href: "https://example.com"}}}
        detailHref="/layanan/test-service"
        titleLabel="Services"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    const externalLink = el.querySelector('a[href="https://example.com"]');
    expect(externalLink).toBeTruthy();
    expect(externalLink?.getAttribute("target")).toBe("_blank");
  });

  it("does not render a link when hasDetail is false and no external link", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={BASIC_ITEM}
        detailHref="/dokumen/test-doc"
        titleLabel="Documents"
        readMoreLabel="Read More"
        hasDetail={false}
      />,
    );
    const el = $(markup);
    const readMoreLinks = Array.from(el.querySelectorAll("a")).filter(
      (a) => a.textContent?.includes("Read More"),
    );
    expect(readMoreLinks).toHaveLength(0);
  });

  it("renders media image when provided", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={{
          ...BASIC_ITEM,
          media: {
            id: "m-1", url: "/uploads/photo.webp", mimeType: "image/webp",
            size: 1024, alt: "Test photo", isDecorative: false,
            width: 640, height: 360,
          },
        }}
        detailHref="/kegiatan/test-activity"
        titleLabel="Activities"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    expect(el.querySelector("img[data-next-image]")).toBeTruthy();
    expect(el.querySelector("img")?.getAttribute("alt")).toBe("Test photo");
  });

  it("does not render image section when media is null", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={BASIC_ITEM}
        detailHref="/layanan/test-service"
        titleLabel="Services"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    expect(el.querySelector("img")).toBeNull();
  });

  it("renders summary when provided", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={BASIC_ITEM}
        detailHref="/layanan/test-service"
        titleLabel="Services"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    expect(el.textContent).toContain("A test service description");
  });

  it("does not render summary when null", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={{...BASIC_ITEM, summary: null}}
        detailHref="/layanan/test-service"
        titleLabel="Services"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    expect(el.textContent).not.toContain("test service description");
  });

  it("renders date range when startsAt is provided", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={BASIC_ITEM}
        detailHref="/layanan/test-service"
        titleLabel="Services"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    expect(el.textContent).toContain("Januari");
  });

  it("does not render date when startsAt is null", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={{...BASIC_ITEM, startsAt: null, endsAt: null}}
        detailHref="/layanan/test-service"
        titleLabel="Services"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    expect(el.textContent).not.toContain("Januari");
  });

  it("renders decorative image with empty alt", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={{
          ...BASIC_ITEM,
          media: {
            id: "m-2", url: "/uploads/bg.webp", mimeType: "image/webp",
            size: 512, alt: "Test", isDecorative: true,
            width: 640, height: 360,
          },
        }}
        detailHref="/prestasi/test"
        titleLabel="Achievements"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    const el = $(markup);
    const img = el.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("");
  });
});

describe("PublicContentCard fallback / translation", () => {
  it("shows no fallback banner when isFallback is false", () => {
    const markup = renderToStaticMarkup(
      <PublicContentCard
        item={BASIC_ITEM}
        detailHref="/layanan/test"
        titleLabel="Services"
        readMoreLabel="Read More"
        hasDetail={true}
      />,
    );
    expect(markup).not.toContain("fallback");
  });
});

describe("PublicContentCardSkeleton", () => {
  it("renders a skeleton card with aria-busy", () => {
    const markup = renderToStaticMarkup(<PublicContentCardSkeleton />);
    const el = $(markup);
    expect(el.querySelector("[aria-busy]")).toBeTruthy();
  });
});

describe("PublicContentListGridSkeleton", () => {
  it("renders multiple skeleton cards", () => {
    const markup = renderToStaticMarkup(<PublicContentListGridSkeleton count={3} />);
    const el = $(markup);
    expect(el.querySelectorAll("[aria-busy]").length).toBe(4);
  });

  it("renders default count of 6", () => {
    const markup = renderToStaticMarkup(<PublicContentListGridSkeleton />);
    const el = $(markup);
    expect(el.querySelectorAll("[aria-busy]").length).toBe(7);
  });

  it("renders sr-only loading text", () => {
    const markup = renderToStaticMarkup(<PublicContentListGridSkeleton count={1} />);
    const el = $(markup);
    const srOnly = el.querySelector(".sr-only");
    expect(srOnly).toBeTruthy();
    expect(srOnly?.textContent).toContain("Loading");
  });
});
