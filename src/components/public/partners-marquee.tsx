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

/** Real logo shown at full color and natural shape, not masked into a
 * circle or dimmed to grayscale - the mark itself is the content, same as a
 * plain institutional logo strip. Missing/failed logos fall back to a flat
 * monogram plaque instead of a broken-image glyph. */
function PartnerMark({ partner }: { partner: PartnerCard }) {
  const [errored, setErrored] = useState(false);

  if (!partner.media || errored) {
    return (
      <span
        title={partner.title}
        className="flex h-20 w-44 shrink-0 items-center justify-center border-y border-slate-200 bg-white text-xl font-bold text-royal-700"
      >
        {monogram(partner.title)}
      </span>
    );
  }

  return (
    <span className="relative flex h-20 w-44 shrink-0 items-center justify-center">
      <Image
        src={partner.media.url}
        alt=""
        fill
        className="object-contain"
        onError={() => setErrored(true)}
        unoptimized
      />
    </span>
  );
}

type PartnersMarqueeProps = { partners: readonly PartnerCard[] };

/* Fixed per-mark footprint (matches PartnerMark's w-44 box) plus the row
 * gap below, used to size the animation duration to the actual scroll
 * distance instead of a guessed number of seconds. */
const MARK_PITCH_PX = 176 + 56;
const PX_PER_SECOND = 60;

/**
 * The scroll itself needs no React state: pausing on hover/focus is pure
 * CSS (`.fuspi-marquee-track:hover`/`:focus-within` in globals.css) so
 * nothing here re-renders while the loop is running - a React-driven style
 * rewrite mid-loop was what previously made the animation visibly stop and
 * restart from the beginning. Duration is derived from the actual track
 * distance (mark count x pitch) at a fixed px/second pace, so the scroll
 * speed always reads the same regardless of how many partners exist or how
 * many copies the loop needs to stay wider than the viewport.
 */
export function PartnersMarquee({ partners }: PartnersMarqueeProps) {
  if (partners.length === 0) return null;

  /* Enough copies to outrun any viewport: with only a handful of partners,
   * two copies at this mark size can be narrower than the screen, so the
   * track would run out and leave dead space before the loop repeats. */
  const copies = Math.max(2, Math.ceil(14 / partners.length));
  const halfLength = partners.length * copies;
  const track = Array.from({ length: copies * 2 }, () => partners).flat();
  const durationSeconds = Math.round((halfLength * MARK_PITCH_PX) / PX_PER_SECOND);

  return (
    <div className="fuspi-marquee relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

      <div
        className="fuspi-marquee-track flex w-max items-center gap-14"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {track.map((partner, index) => {
          const href = partner.link?.href;
          const content = <PartnerMark partner={partner} />;
          return href ? (
            <a
              key={`${partner.id}-${index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={partner.title}
              tabIndex={index < halfLength ? 0 : -1}
              aria-hidden={index >= halfLength}
              className="rounded-lg focus-visible:outline-none"
            >
              {content}
            </a>
          ) : (
            <div key={`${partner.id}-${index}`} aria-label={partner.title} aria-hidden={index >= halfLength}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
