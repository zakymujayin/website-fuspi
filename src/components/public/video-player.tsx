"use client";

import { Play } from "lucide-react";
import { useState } from "react";

import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { toFocalPoint } from "@/components/public/focal-point";
import type { PublicHomeVideo } from "@/features/home-nav/public-query";
import { cn } from "@/lib/utils";

/** Handles youtu.be, /watch?v=, /embed/, and /shorts/ links. Returns null for
 * anything else so the caller can fall back to a plain link-out. */
export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    if (host === "youtube.com" || host === "music.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      const match = parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
      if (match) return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

function PlayButton() {
  return (
    <span className="grid size-16 place-items-center rounded-full bg-white/95 text-royal-700 shadow-md transition-transform duration-200 group-hover:scale-105">
      <Play aria-hidden className="size-6 translate-x-0.5" fill="currentColor" strokeWidth={0} />
    </span>
  );
}

type VideoPlayerProps = { video: PublicHomeVideo; className?: string };

/**
 * Isolated client leaf (same pattern as PartnersMarquee): the poster stays
 * server-rendered by the parent's data, this component only owns the
 * click-to-embed interaction so the iframe never loads until asked for.
 */
export function VideoPlayer({ video, className }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const youtubeId = extractYouTubeId(video.url);

  if (playing && youtubeId) {
    return (
      <div className={cn("relative mx-auto aspect-video max-w-3xl overflow-hidden rounded-md shadow-md", className)}>
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  const poster = (
    <div className="relative aspect-video overflow-hidden">
      <ImageWithFallback
        src={video.poster?.url}
        alt={video.poster?.isDecorative ? "" : (video.poster?.alt ?? video.title)}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        sizes="(min-width: 1024px) 60vw, 100vw"
        focalPoint={toFocalPoint(video.poster)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <PlayButton />
      </div>
    </div>
  );

  if (youtubeId) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={video.title}
        className={cn("group relative mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-md shadow-md transition-shadow duration-200 hover:shadow-lg", className)}
      >
        {poster}
      </button>
    );
  }

  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("group relative mx-auto flex max-w-3xl flex-col overflow-hidden rounded-md shadow-md transition-shadow duration-200 hover:shadow-lg", className)}
    >
      {poster}
    </a>
  );
}
