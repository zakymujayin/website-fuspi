import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test double for next/image, not a real page.
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

const { VideoSection } = await import("@/components/public/video-section");

type PublicHomeVideo = Parameters<typeof VideoSection>[0]["featured"];

const GALLERY = [
  { id: "v1", youtubeUrl: "https://youtu.be/abc12345678", title: "Wisuda Sarjana 2026" },
  { id: "v2", youtubeUrl: "https://www.youtube.com/watch?v=xyz98765432", title: "Suasana Perkuliahan" },
];

const PROFILE_VIDEO: NonNullable<PublicHomeVideo> = {
  url: "https://youtu.be/abc12345678",
  poster: {
    id: "media-1",
    url: "/uploads/2026/08/poster.webp",
    mimeType: "image/webp",
    size: 12_345,
    alt: "Poster video profil",
    isDecorative: false,
    width: 1280,
    height: 720,
    focalX: null,
    focalY: null,
  },
  title: "Tur Kampus FUSPI",
  description: null,
};

describe("VideoSection", () => {
  it("renders a featured player alone when there is no gallery", () => {
    const markup = renderToStaticMarkup(
      <VideoSection eyebrow="" title="Video Profil" featured={PROFILE_VIDEO} videos={[]} />,
    );
    expect(markup).toContain("Video Profil");
    expect(markup).toContain("Poster video profil"); // the featured player's poster
    expect(markup).not.toContain("lg:grid-cols-3"); // no grid
  });

  it("renders the grid alone when there is no featured video", () => {
    const markup = renderToStaticMarkup(
      <VideoSection
        eyebrow=""
        title="Galeri Video"
        subtitle="Kegiatan dan wisuda"
        featured={null}
        videos={GALLERY}
      />,
    );
    expect(markup).toContain("Galeri Video");
    expect(markup).toContain("Kegiatan dan wisuda");
    expect(markup).toContain("Wisuda Sarjana 2026");
    expect(markup).toContain("Suasana Perkuliahan");
    expect(markup).toContain("lg:grid-cols-3");
  });

  it("renders the featured player above the grid when both are present", () => {
    const markup = renderToStaticMarkup(
      <VideoSection
        eyebrow="Video Profil"
        title="Galeri Video"
        featured={PROFILE_VIDEO}
        videos={GALLERY}
      />,
    );
    expect(markup).toContain("Video Profil"); // eyebrow
    expect(markup).toContain("Galeri Video"); // heading
    expect(markup).toContain("Poster video profil"); // featured
    expect(markup).toContain("Wisuda Sarjana 2026"); // grid
    expect(markup.indexOf("Poster video profil")).toBeLessThan(markup.indexOf("Wisuda Sarjana 2026"));
  });

  it("renders the dev placeholder note when asked", () => {
    const markup = renderToStaticMarkup(
      <VideoSection eyebrow="" title="Video Profil" featured={null} videos={[]} placeholder />,
    );
    expect(markup).toContain("Video Profil");
    expect(markup).toContain("Shown in dev only");
  });

  it("uses a dark ground and no physical-direction utility", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/components/public/video-section.tsx"),
      "utf8",
    );
    expect(source).toMatch(/from-royal-9\d\d/); // dark section
    expect(source).toContain("grain"); // textured
    expect(source).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(source).not.toMatch(/\btext-(left|right)\b/);
  });
});
