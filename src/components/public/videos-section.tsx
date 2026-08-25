import { Container } from "@/components/ui/container";
import { HomeVideoGalleryItem } from "@/components/public/home-video-gallery-item";
import { VideoPlayer } from "@/components/public/video-player";
import type { PublicHomeGalleryVideo, PublicHomeVideo } from "@/features/home-nav/public-query";

type VideosSectionProps = {
  video: PublicHomeVideo;
  eyebrow: string;
  galleryVideos?: readonly PublicHomeGalleryVideo[];
  galleryTitle?: string;
};

export function VideosSection({ video, eyebrow, galleryVideos = [], galleryTitle }: VideosSectionProps) {
  const hasGallery = galleryVideos.length > 0;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-br from-royal-50 via-white to-royal-50 py-12 md:py-16">
      <Container>
        <div className="mb-10 text-center">
          <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{eyebrow}</span>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {video.title}
          </h2>
          {video.description ? (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">{video.description}</p>
          ) : null}
        </div>

        {hasGallery ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <VideoPlayer video={video} className="mx-0 max-w-none" />
            <div className="lg:sticky lg:top-24">
              {galleryTitle ? (
                <h3 className="mb-4 font-display text-sm font-semibold tracking-wide text-slate-900 uppercase">
                  {galleryTitle}
                </h3>
              ) : null}
              <div className="flex flex-col gap-3">
                {galleryVideos.map((item) => (
                  <HomeVideoGalleryItem key={item.id} youtubeUrl={item.youtubeUrl} title={item.title} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <VideoPlayer video={video} />
        )}
      </Container>
    </section>
  );
}
