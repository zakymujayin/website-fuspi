import {Container} from "@/components/ui/container";
import {HomeVideoGalleryItem} from "@/components/public/home-video-gallery-item";
import {VideoPlayer} from "@/components/public/video-player";
import type {PublicHomeGalleryVideo, PublicHomeVideo} from "@/features/home-nav/public-query";
import styles from "./home-design.module.css";
import {Reveal} from "./reveal";

export function VideoSection({
  eyebrow,
  title,
  subtitle,
  featured,
  videos,
  placeholder = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  featured: PublicHomeVideo | null;
  videos: readonly PublicHomeGalleryVideo[];
  placeholder?: boolean;
}) {
  if (!featured && videos.length === 0 && !placeholder) return null;
  return (
    <section className={`${styles.section} bg-slate-100`}>
      <Container>
        <div className="mb-8 grid items-end gap-5 lg:grid-cols-2 lg:gap-12">
          <div>
            <h2 className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-slate-900 md:text-[34px]">{title}</h2>
            {eyebrow ? <p className="mt-3 text-sm font-semibold text-royal-800">{eyebrow}</p> : null}
          </div>
          {subtitle ? <p className="max-w-xl text-lg leading-7 text-slate-700">{subtitle}</p> : null}
        </div>
        <div className={`grid items-start gap-6 ${featured && videos.length ? "lg:grid-cols-12" : ""}`}>
            {featured ? <Reveal variant="image" className={videos.length ? "!block lg:col-span-8" : "!block"}><VideoPlayer video={featured} className="max-w-none rounded-md border border-slate-200" /></Reveal> : null}
            {videos.length > 0 ? (
              <div className={featured ? "grid gap-5 border-t-2 border-royal-500 pt-5 lg:col-span-4" : `grid gap-6 ${videos.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                {videos.slice(0, 4).map((video, index) => <Reveal key={video.id} index={index + 1} className="!block"><HomeVideoGalleryItem youtubeUrl={video.youtubeUrl} title={video.title} compact={Boolean(featured)} /></Reveal>)}
              </div>
            ) : null}
            {placeholder ? <p className="border-t border-slate-300 py-8 text-sm text-slate-600">Configure the institutional profile video in the homepage settings. Shown in dev only.</p> : null}
        </div>
      </Container>
    </section>
  );
}
