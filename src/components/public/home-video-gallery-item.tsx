"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { extractYouTubeId } from "@/components/public/video-player";
import { ImageWithFallback } from "@/components/public/image-with-fallback";

type HomeVideoGalleryItemProps = { youtubeUrl: string; title: string };

/** Compact playlist row: click-to-embed like {@link VideoPlayer}, poster comes from YouTube's own thumbnail CDN (no Media upload needed). */
export function HomeVideoGalleryItem({ youtubeUrl, title }: HomeVideoGalleryItemProps) {
  const [playing, setPlaying] = useState(false);
  const youtubeId = extractYouTubeId(youtubeUrl);

  if (playing && youtubeId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-md">
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (!youtubeId) {
    return (
      <a
        href={youtubeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-royal-200"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
          <Play aria-hidden className="size-4" fill="currentColor" strokeWidth={0} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 group-hover:text-royal-600">{title}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={title}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 text-start transition-all duration-200 hover:border-royal-200 hover:shadow-sm"
    >
      <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg sm:w-32">
        <ImageWithFallback
          src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
          alt=""
          className="object-cover"
          sizes="128px"
        />
        <span className="absolute inset-0 bg-navy-950/25" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="grid size-8 place-items-center rounded-full bg-white/95 text-royal-700 shadow transition-transform duration-200 group-hover:scale-110">
            <Play aria-hidden className="size-3.5 translate-x-0.5" fill="currentColor" strokeWidth={0} />
          </span>
        </span>
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-800 group-hover:text-royal-600">
        {title}
      </span>
    </button>
  );
}
