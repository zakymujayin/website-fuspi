"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { extractYouTubeId } from "@/components/public/video-player";
import { ImageWithFallback } from "@/components/public/image-with-fallback";

type HomeVideoGalleryItemProps = { youtubeUrl: string; title: string };

/** A full video card: large YouTube thumbnail, click-to-embed, title bar below. */
export function HomeVideoGalleryItem({ youtubeUrl, title }: HomeVideoGalleryItemProps) {
  const [playing, setPlaying] = useState(false);
  const youtubeId = extractYouTubeId(youtubeUrl);

  if (playing && youtubeId) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-md">
        <div className="relative aspect-video w-full">
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="bg-white px-4 py-3 text-sm font-semibold leading-snug text-slate-800">{title}</p>
      </div>
    );
  }

  if (!youtubeId) {
    return (
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex aspect-video items-center justify-center bg-slate-100 text-slate-400">
          <Play aria-hidden className="size-10" fill="currentColor" strokeWidth={0} />
        </div>
        <p className="px-4 py-3 text-sm font-semibold leading-snug text-slate-800 group-hover:text-royal-600">{title}</p>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={title}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-start shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        <ImageWithFallback
          src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
          alt=""
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(min-width: 1024px) 32vw, (min-width: 768px) 45vw, 100vw"
        />
        <span className="absolute inset-0 bg-navy-950/20 transition-colors duration-200 group-hover:bg-navy-950/10" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="grid size-14 place-items-center rounded-full bg-white/95 text-royal-700 shadow-lg transition-transform duration-200 group-hover:scale-110">
            <Play aria-hidden className="size-6 translate-x-0.5" fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      </div>
      <p className="px-4 py-3 text-sm font-semibold leading-snug text-slate-800 group-hover:text-royal-600">{title}</p>
    </button>
  );
}
