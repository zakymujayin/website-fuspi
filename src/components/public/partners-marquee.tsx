"use client";

import { useState } from "react";
import Image from "next/image";
import type { z } from "zod";

import type { PublicContentCardSchema } from "@/contracts/public-content";

type PartnerCard = z.infer<typeof PublicContentCardSchema>;

function monogram(name: string) {
  const letters = name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]);
  return letters.join("").toUpperCase();
}

/** Missing logo and a failed load both resolve to the same monogram chip —
 * never a broken-image glyph. */
function PartnerMark({ partner }: { partner: PartnerCard }) {
  const [errored, setErrored] = useState(false);

  if (!partner.media || errored) {
    return (
      <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-royal-50 text-lg font-bold text-royal-700 transition-colors group-hover:bg-royal-100">
        {monogram(partner.title)}
      </span>
    );
  }

  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-royal-50">
      <Image
        src={partner.media.url}
        alt=""
        fill
        className="object-contain p-1.5"
        onError={() => setErrored(true)}
        unoptimized
      />
    </span>
  );
}

type PartnersMarqueeProps = { partners: readonly PartnerCard[] };

/**
 * Isolated client leaf: the only piece of this section that re-renders on
 * hover/focus, keeping the perpetual scroll animation off the server tree.
 */
export function PartnersMarquee({ partners }: PartnersMarqueeProps) {
  const [paused, setPaused] = useState(false);
  const track = [...partners, ...partners];

  if (partners.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

      <div
        className="fuspi-marquee-track flex w-max gap-4"
        style={{
          animation: "fuspi-marquee 34s linear infinite",
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {track.map((partner, index) => {
          const href = partner.link?.href;
          const content = (
            <>
              <PartnerMark partner={partner} />
              <span className="line-clamp-2 text-sm font-medium text-slate-600 group-hover:text-royal-700">
                {partner.title}
              </span>
            </>
          );
          const className = "group flex h-28 w-80 shrink-0 items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-royal-200 hover:shadow-md";
          return href ? (
            <a
              key={`${partner.id}-${index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              tabIndex={index < partners.length ? 0 : -1}
              aria-hidden={index >= partners.length}
              className={className}
            >
              {content}
            </a>
          ) : (
            <div key={`${partner.id}-${index}`} aria-hidden={index >= partners.length} className={className}>
              {content}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fuspi-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fuspi-marquee-track { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
