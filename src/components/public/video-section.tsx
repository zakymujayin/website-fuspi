import {Container} from "@/components/ui/container";
import {HomeVideoGalleryItem} from "@/components/public/home-video-gallery-item";
import {VideoPlayer} from "@/components/public/video-player";
import type {PublicHomeGalleryVideo, PublicHomeVideo} from "@/features/home-nav/public-query";

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
    <section className="bg-slate-50 py-16 md:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="text-[28px] font-bold leading-tight tracking-[-0.01em] text-slate-900 md:text-[34px]">{title}</h2>
            {subtitle ? <p className="mt-4 max-w-sm text-base leading-7 text-slate-600">{subtitle}</p> : null}
            {eyebrow ? <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-royal-600">{eyebrow}</p> : null}
          </div>
          <div className="lg:col-span-8">
            {featured ? <VideoPlayer video={featured} className="max-w-none rounded-md border border-slate-200" /> : null}
            {videos.length > 0 ? (
              <div className="mt-10 grid gap-8 border-t border-slate-300 pt-8 md:grid-cols-2 lg:grid-cols-3">
                {videos.slice(0, 4).map((video) => <HomeVideoGalleryItem key={video.id} youtubeUrl={video.youtubeUrl} title={video.title} />)}
              </div>
            ) : null}
            {placeholder ? <p className="border-t border-slate-300 py-8 text-sm text-slate-600">Configure the institutional profile video in the homepage settings. Shown in dev only.</p> : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
