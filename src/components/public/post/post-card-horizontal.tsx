import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";

import type { ResolvedCoverImage } from "./cover-image";
import { PostFallbackBanner } from "./post-fallback-banner";
import { PostMetaRow } from "./post-meta-row";
import { PostCoverImage } from "./post-cover-image";

type PostCardHorizontalProps = {
  href: string;
  title: string;
  excerpt?: string | null;
  cover: ResolvedCoverImage;
  authorName?: string | null;
  dateLabel: string;
  categoryLabel?: string | null;
  readMoreLabel: string;
  fallbackNoticeMessage?: string | null;
};

/** Horizontal list card for `/berita` (docs/19-B) — stacks on mobile, never forced sideways. */
export function PostCardHorizontal({
  href,
  title,
  excerpt,
  cover,
  authorName,
  dateLabel,
  categoryLabel,
  readMoreLabel,
  fallbackNoticeMessage,
}: PostCardHorizontalProps) {
  return (
    <article className="flex flex-col gap-5 border-b border-slate-200 py-6 first:pt-0 sm:flex-row">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="block aspect-video w-full shrink-0 overflow-hidden rounded-lg sm:w-60"
      >
        <PostCoverImage cover={cover} sizes="(min-width: 640px) 240px, 100vw" className="size-full" />
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        {categoryLabel ? (
          <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">
            {categoryLabel}
          </span>
        ) : null}

        <h3 className="font-display text-xl font-medium text-slate-900">
          <Link href={href} className="line-clamp-2 hover:text-royal-600">
            {title}
          </Link>
        </h3>

        <PostMetaRow authorName={authorName} dateLabel={dateLabel} className="text-[13px]" />

        {excerpt ? <p className="line-clamp-2 text-sm text-slate-600">{excerpt}</p> : null}

        {fallbackNoticeMessage ? <PostFallbackBanner message={fallbackNoticeMessage} compact /> : null}

        <Link
          href={href}
          className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-royal-600 hover:text-royal-700"
        >
          {readMoreLabel}
          <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      </div>
    </article>
  );
}
