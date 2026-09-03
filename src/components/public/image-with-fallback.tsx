"use client";

import { ImageOff } from "lucide-react";
import NextImage from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { FocalPoint } from "@/components/public/focal-point";

type ImageWithFallbackProps = {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  focalPoint?: FocalPoint | null;
};

/**
 * Fills its (relatively-positioned, sized) parent. Missing src or a failed
 * load both resolve to the same quiet icon placeholder — never the browser's
 * broken-image glyph plus raw alt text.
 *
 * `focalPoint`, when given, keeps that point of the source image visible
 * under `object-cover` regardless of the container's aspect ratio (e.g. a
 * portrait photo in a wide box no longer crops the subject's head/caption).
 * Omitted/null falls back to the browser default (`50% 50%`, i.e. today's
 * unchanged behavior).
 */
export function ImageWithFallback({ src, alt, className, sizes, priority, loading, focalPoint }: ImageWithFallbackProps) {
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
      loading={loading}
      sizes={sizes}
      className={className}
      style={focalPoint ? { objectPosition: `${focalPoint.x}% ${focalPoint.y}%` } : undefined}
      onError={() => setErrored(true)}
      unoptimized
    />
  );
}
