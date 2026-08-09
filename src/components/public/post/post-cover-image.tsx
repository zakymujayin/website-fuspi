import { ImageOff } from "lucide-react";
import NextImage from "next/image";

import { cn } from "@/lib/utils";

import type { ResolvedCoverImage } from "./cover-image";

type PostCoverImageProps = {
  cover: ResolvedCoverImage;
  className?: string;
  sizes: string;
  priority?: boolean;
};

/**
 * Renders `next/image` only for a same-origin, already-validated cover
 * (docs manifest list requirement 3); anything else falls back to a
 * decorative placeholder so an unconfigured remote host never reaches
 * `next/image` and no broken image ever renders.
 */
export function PostCoverImage({ cover, className, sizes, priority }: PostCoverImageProps) {
  if (cover.kind === "placeholder") {
    return (
      <div
        aria-hidden
        className={cn(
          "flex items-center justify-center bg-slate-100 text-slate-300",
          className,
        )}
      >
        <ImageOff className="size-10" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-slate-100", className)}>
      <NextImage
        src={cover.src}
        alt={cover.alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
