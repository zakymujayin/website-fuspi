import { FileTextIcon, ImageOffIcon } from "lucide-react";
import NextImage from "next/image";

import { cn } from "@/lib/utils";

import type { ResolvedAdminMediaThumbnail } from "./media-thumbnail-resolver";

type AdminMediaThumbnailProps = {
  thumbnail: ResolvedAdminMediaThumbnail;
  className?: string;
};

/** Renders `next/image` only for a resolved local image; otherwise an intentional, decorative placeholder icon. */
export function AdminMediaThumbnail({ thumbnail, className }: AdminMediaThumbnailProps) {
  if (thumbnail.kind === "image") {
    return (
      <div className={cn("relative overflow-hidden bg-slate-100", className)}>
        <NextImage
          src={thumbnail.src}
          alt={thumbnail.isDecorative ? "" : thumbnail.alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    );
  }

  const Icon = thumbnail.kind === "pdf" ? FileTextIcon : ImageOffIcon;

  return (
    <div aria-hidden className={cn("flex items-center justify-center bg-navy-50 text-royal-300", className)}>
      <Icon className="size-10" strokeWidth={1.5} />
    </div>
  );
}
