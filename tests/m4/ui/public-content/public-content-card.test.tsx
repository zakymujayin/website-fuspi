import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a data-localized-link="true" href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/prodi",
}));

vi.mock("next/image", () => ({
  default: ({ alt = "", ...props }: React.ComponentProps<"img"> & { alt?: string }) => <img alt={alt} {...props} data-next-image="true" />,
}));

import { PublicContentCard, type PublicContentCardData } from "@/components/public/public-content-card";

const basicItem: PublicContentCardData = {
  id: "svc-1",
  resource: "SERVICE",
  slug: "test-service",
  title: "Test Service",
  summary: "A test service description",
  badge: "AKADEMIK",
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-12-31T00:00:00.000Z",
  media: null,
  link: null,
  translation: { requestedLocale: "id", resolvedLocale: "id", isFallback: false },
};

const defaultProps = {
  item: basicItem,
  detailHref: "/service/test-service",
  titleLabel: "Title: Test Service",
  readMoreLabel: "Selengkapnya",
  hasDetail: true,
};

describe("PublicContentCard", () => {
  it("renders card with title and badge", () => {
    render(<PublicContentCard {...defaultProps} badgeLabel="Badge:" />);
    expect(screen.getByText("Test Service")).toBeTruthy();
    expect(screen.getByText("AKADEMIK")).toBeTruthy();
  });

  it("renders card with slug-based detail link when hasDetail=true", () => {
    render(<PublicContentCard {...defaultProps} />);
    const link = screen.getByText("Test Service").closest("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/service/test-service");
    expect(link!.getAttribute("data-localized-link")).toBe("true");
  });

  it("renders card with external link when link.kind=EXTERNAL", () => {
    const item = {
      ...basicItem,
      link: { kind: "EXTERNAL" as const, href: "https://example.com" },
    };
    render(<PublicContentCard {...defaultProps} item={item} />);
    const link = screen.getByText("Test Service").closest("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("https://example.com");
    expect(link!.getAttribute("target")).toBe("_blank");
    expect(link!.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders card without link when hasDetail=false and no external link", () => {
    render(<PublicContentCard {...defaultProps} hasDetail={false} />);
    const title = screen.getByText("Test Service");
    expect(title.closest("a")).toBeNull();
  });

  it("renders image when media is provided", () => {
    const item = {
      ...basicItem,
      media: {
        id: "img-1",
        url: "https://example.com/image.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        alt: "Test image",
        isDecorative: false,
        width: 640,
        height: 360,
      },
    };
    render(<PublicContentCard {...defaultProps} item={item} />);
    const img = screen.getByAltText("Test image");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://example.com/image.jpg");
    expect(img.getAttribute("data-next-image")).toBe("true");
  });

  it("does NOT render image section when media is null", () => {
    render(<PublicContentCard {...defaultProps} />);
    expect(screen.queryByAltText("Test image")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders summary when provided", () => {
    render(<PublicContentCard {...defaultProps} />);
    expect(screen.getByText("A test service description")).toBeTruthy();
  });

  it("does NOT render summary when null", () => {
    const item = { ...basicItem, summary: null };
    render(<PublicContentCard {...defaultProps} item={item} />);
    expect(screen.queryByText("A test service description")).toBeNull();
  });

  it("renders date range when startsAt is provided", () => {
    render(<PublicContentCard {...defaultProps} />);
    expect(screen.getByText(/2026/)).toBeTruthy();
  });

  it("renders read more link for hasDetail cards", () => {
    render(<PublicContentCard {...defaultProps} />);
    const readMoreLink = screen.getByText("Selengkapnya").closest("a");
    expect(readMoreLink).toBeTruthy();
    expect(readMoreLink!.getAttribute("href")).toBe("/service/test-service");
    expect(readMoreLink!.getAttribute("data-localized-link")).toBe("true");
  });

  it("renders external CTA for external link cards", () => {
    const item = {
      ...basicItem,
      link: { kind: "EXTERNAL" as const, href: "https://example.com" },
    };
    render(<PublicContentCard {...defaultProps} item={item} />);
    const externalLink = screen.getByText("Selengkapnya").closest("a");
    expect(externalLink).toBeTruthy();
    expect(externalLink!.getAttribute("href")).toBe("https://example.com");
    expect(externalLink!.getAttribute("target")).toBe("_blank");
    expect(externalLink!.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders as article element", () => {
    render(<PublicContentCard {...defaultProps} />);
    const article = document.querySelector("article");
    expect(article).toBeTruthy();
  });

  it("links title with aria-label when hasDetail", () => {
    render(<PublicContentCard {...defaultProps} />);
    const titleLink = screen.getByText("Test Service").closest("a");
    expect(titleLink).toBeTruthy();
    expect(titleLink!.getAttribute("aria-label")).toBe("Title: Test Service: Test Service");
  });

  it("renders decorative image with empty alt when isDecorative=true", () => {
    const item = {
      ...basicItem,
      media: {
        id: "img-2",
        url: "https://example.com/decor.jpg",
        mimeType: "image/jpeg",
        size: 512,
        alt: "Should not matter",
        isDecorative: true,
        width: 640,
        height: 360,
      },
    };
    render(<PublicContentCard {...defaultProps} item={item} />);
    const img = document.querySelector("img[data-next-image]");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("alt")).toBe("");
  });
});
