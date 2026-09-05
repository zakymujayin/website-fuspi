"use client";

import { useState } from "react";
import Image from "next/image";
import type { z } from "zod";

import type { PublicContentCardSchema } from "@/contracts/public-content";

type PartnerCard = z.infer<typeof PublicContentCardSchema>;

/** Real logo shown at full color and natural shape, not masked into a
 * circle or dimmed to grayscale - the mark itself is the content, same as a
 * plain institutional logo strip. Missing/failed logos fall back to a flat
 * organization name instead of a broken-image glyph. */
function PartnerMark({ partner }: { partner: PartnerCard }) {
  const [errored, setErrored] = useState(false);

  if (!partner.media || errored) {
    return (
      <span
        title={partner.title}
        className="flex min-h-24 w-full items-center justify-center px-4 text-center text-base font-semibold leading-snug text-royal-800"
      >
        {partner.title}
      </span>
    );
  }

  return (
    <span className="relative mx-auto flex h-24 w-full max-w-44 items-center justify-center">
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

/** Static, keyboard-accessible partner strip. Each partner occurs once. */
export function PartnersMarquee({ partners }: PartnersMarqueeProps) {
  if (partners.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:flex lg:flex-wrap">
        {partners.map((partner) => {
          const href = partner.link?.href;
          const content = <PartnerMark partner={partner} />;
          return href ? (
            <a
              key={partner.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={partner.title}
              className="min-w-0 bg-white p-4 transition-colors hover:bg-slate-50 lg:flex-1 lg:basis-40"
            >
              {content}
            </a>
          ) : (
            <div key={partner.id} aria-label={partner.title} className="min-w-0 bg-white p-4 lg:flex-1 lg:basis-40">
              {content}
            </div>
          );
        })}
    </div>
  );
}
