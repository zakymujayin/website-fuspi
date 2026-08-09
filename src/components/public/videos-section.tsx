import { Play } from "lucide-react";
import NextImage from "next/image";

import { Container } from "@/components/ui/container";
import type { PublicHomeVideo } from "@/features/home-nav/public-query";

function PlayButton() {
  return (
    <span className="grid size-16 place-items-center rounded-full bg-white/95 text-royal-700 shadow-lg transition-transform duration-200 group-hover:scale-105">
      <Play aria-hidden className="size-6 translate-x-0.5" fill="currentColor" strokeWidth={0} />
    </span>
  );
}

type VideosSectionProps = { video: PublicHomeVideo; eyebrow: string };

export function VideosSection({ video, eyebrow }: VideosSectionProps) {
  return (
    <section className="bg-white py-12 md:py-16">
      <Container>
        <div className="mb-10">
          <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{eyebrow}</span>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {video.title}
          </h2>
          {video.description ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{video.description}</p>
          ) : null}
        </div>

        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <div className="relative aspect-video overflow-hidden">
            <NextImage
              src={video.poster.url}
              alt={video.poster.isDecorative ? "" : video.poster.alt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 60vw, 100vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <PlayButton />
            </div>
          </div>
        </a>
      </Container>
    </section>
  );
}
