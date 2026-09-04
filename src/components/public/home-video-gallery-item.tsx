"use client";

import {Play} from "lucide-react";
import {useState} from "react";

import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {extractYouTubeId} from "@/components/public/video-player";

export function HomeVideoGalleryItem({youtubeUrl, title}: {youtubeUrl: string; title: string}) {
  const [playing, setPlaying] = useState(false);
  const youtubeId = extractYouTubeId(youtubeUrl);

  if (playing && youtubeId) {
    return (
      <div>
        <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
          <iframe className="absolute inset-0 size-full" src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
        <p className="mt-3 font-bold leading-snug text-slate-900">{title}</p>
      </div>
    );
  }

  const visual = (
    <>
      <span className="relative block aspect-video overflow-hidden rounded-md bg-slate-200">
        {youtubeId ? <ImageWithFallback src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 28vw, 100vw" /> : null}
        <span aria-hidden className="absolute inset-0 bg-navy-950/20" />
        <span className="absolute inset-0 grid place-items-center"><span className="grid size-12 place-items-center rounded-full bg-white text-royal-700 shadow-md"><Play aria-hidden className="size-5 translate-x-px fill-current" /></span></span>
      </span>
      <span className="mt-3 block font-bold leading-snug text-slate-900 group-hover:text-royal-600">{title}</span>
    </>
  );

  return youtubeId ? (
    <button type="button" onClick={() => setPlaying(true)} aria-label={title} className="group w-full text-start">{visual}</button>
  ) : (
    <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="group block">{visual}</a>
  );
}
