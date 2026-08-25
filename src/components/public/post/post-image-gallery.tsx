import NextImage from "next/image";

import type { PublicPostImage } from "@/contracts/post";

type PostImageGalleryProps = {
  images: readonly PublicPostImage[];
  heading: string;
};

/** Activity/documentation photos attached to a post, shown below the article body. */
export function PostImageGallery({ images, heading }: PostImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <section aria-labelledby="post-gallery-heading" className="mt-10">
      <h2 id="post-gallery-heading" className="section-rule font-display text-lg font-bold text-slate-900">
        {heading}
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <figure key={image.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <NextImage
                src={image.media.url}
                alt={image.media.isDecorative ? "" : image.media.alt}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            {image.caption ? (
              <figcaption className="px-3 py-2 text-[13px] leading-relaxed text-slate-500 italic">
                {image.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
