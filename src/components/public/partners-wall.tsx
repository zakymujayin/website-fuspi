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

/** Missing logo and a failed load both resolve to the same monogram mark,
 * never a broken-image glyph. Grayscale by default, full color on hover or
 * focus so the wall reads as one calm plaque instead of a row of colored
 * badges. */
function PartnerMark({ partner }: { partner: PartnerCard }) {
  const [errored, setErrored] = useState(false);

  if (!partner.media || errored) {
    return (
      <span className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-400 transition-colors duration-200 group-hover:bg-royal-50 group-hover:text-royal-700 group-focus-visible:bg-royal-50 group-focus-visible:text-royal-700">
        {monogram(partner.title)}
      </span>
    );
  }

  return (
    <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 grayscale transition-all duration-200 group-hover:grayscale-0 group-focus-visible:grayscale-0">
      <Image
        src={partner.media.url}
        alt=""
        fill
        className="object-contain p-3"
        onError={() => setErrored(true)}
        unoptimized
      />
    </span>
  );
}

type PartnersWallProps = { partners: readonly PartnerCard[] };

/**
 * A static plaque wall, not an auto-scrolling marquee: no animation timing
 * to get wrong, no track-width math, no border to clip. Marks sit grayscale
 * and unboxed until hover, closer to how a university prints its list of
 * affiliations than a scrolling "trusted by" strip.
 */
export function PartnersWall({ partners }: PartnersWallProps) {
  if (partners.length === 0) return null;

  return (
    <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-8">
      {partners.map((partner) => {
        const content = (
          <div className="group flex w-24 flex-col items-center gap-2.5 text-center">
            <PartnerMark partner={partner} />
            <span className="line-clamp-2 text-xs font-medium tracking-wide text-slate-500 transition-colors duration-200 group-hover:text-royal-700 group-focus-visible:text-royal-700">
              {partner.title}
            </span>
          </div>
        );
        const href = partner.link?.href;
        return href ? (
          <a
            key={partner.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg focus-visible:outline-none"
          >
            {content}
          </a>
        ) : (
          <div key={partner.id}>{content}</div>
        );
      })}
    </div>
  );
}
