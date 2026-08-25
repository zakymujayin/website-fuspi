"use client";

import { ImageOff } from "lucide-react";
import NextImage from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ImageWithFallbackProps = {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Fills its (relatively-positioned, sized) parent. Missing src or a failed
 * load both resolve to the same quiet icon placeholder — never the browser's
 * broken-image glyph plus raw alt text.
 */
export function ImageWithFallback({ src, alt, className, sizes, priority }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-300", className)}>
        <ImageOff aria-hidden className="size-8" strokeWidth={1.25} />
      </div>
    );
  }

  return (
    <NextImage
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => setErrored(true)}
      unoptimized
    />
  );
}
