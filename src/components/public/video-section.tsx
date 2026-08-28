import { Container } from "@/components/ui/container";
import { HomeVideoGalleryItem } from "@/components/public/home-video-gallery-item";
import { VideoPlayer } from "@/components/public/video-player";
import type { PublicHomeGalleryVideo, PublicHomeVideo } from "@/features/home-nav/public-query";

type VideoSectionProps = {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  /** The institutional profile film, shown as the large lead player. */
  featured: PublicHomeVideo | null;
  /** Related clips shown as a grid beneath the featured player. */
  videos: readonly PublicHomeGalleryVideo[];
  /** Dev-only: render a "configure a profile video" note in place of content. */
  placeholder?: boolean;
};

/**
 * One dark, cinematic video section: a featured profile player over a grid of
 * related clips. Fed by two independent home-section keys (`VIDEO`,
 * `VIDEO_GALLERY`) but rendered as a single block so it never looks half-empty.
 */
export function VideoSection({ eyebrow, title, subtitle, featured, videos, placeholder = false }: VideoSectionProps) {
  return (
    <section className="grain relative overflow-hidden bg-gradient-to-br from-royal-900 to-royal-950 py-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 70% at 88% 8%, rgba(214,180,94,0.18), transparent 60%)",
        }}
      />

      <Container className="relative">
        <div className="mb-12 text-center">
          {eyebrow ? (
            <span className="text-xs font-medium tracking-wide text-brass-400 uppercase">{eyebrow}</span>
          ) : null}
          <h2 className="section-rule mt-2 font-display text-2xl font-bold tracking-tight text-white md:text-3xl [&::after]:mx-auto">
            {title}
          </h2>
          {subtitle ? (
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300 md:text-base">{subtitle}</p>
          ) : null}
        </div>

        {featured ? (
          <div className="mx-auto mb-12 max-w-4xl">
            <VideoPlayer video={featured} className="max-w-none" />
          </div>
        ) : null}

        {videos.length > 0 ? (
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {videos.map((item) => (
              <HomeVideoGalleryItem key={item.id} youtubeUrl={item.youtubeUrl} title={item.title} />
            ))}
          </div>
        ) : null}

        {placeholder ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-white/25 bg-white/5 p-8 text-center">
            <p className="text-sm text-slate-300">
              Set a profile video in Admin → Beranda → Pengaturan → Video (YouTube URL + poster +
              Indonesian title) and it renders here. Shown in dev only.
            </p>
          </div>
        ) : null}
      </Container>
    </section>
  );
}
