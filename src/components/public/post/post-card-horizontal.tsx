import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

import type { ResolvedCoverImage } from "./cover-image";
import { LOCALE_DIRECTION } from "./locale";
import { PostFallbackBanner } from "./post-fallback-banner";
import { PostMetaRow } from "./post-meta-row";
import { PostCoverImage } from "./post-cover-image";

type PostCardHorizontalProps = {
  href: string;
  title: string;
  excerpt?: string | null;
  /** Actual language the title/excerpt are rendered in — may differ from the page locale on Indonesian fallback. */
  resolvedLocale: AppLocale;
  cover: ResolvedCoverImage;
  authorName?: string | null;
  dateLabel: string;
  dateTimeIso: string;
  categoryLabel?: string | null;
  fallbackNoticeMessage?: string | null;
};

/** Horizontal list card for `/berita` (docs/19-B) — stacks on mobile, never forced sideways. */
export function PostCardHorizontal({
  href,
  title,
  excerpt,
  resolvedLocale,
  cover,
  authorName,
  dateLabel,
  dateTimeIso,
  categoryLabel,
  fallbackNoticeMessage,
}: PostCardHorizontalProps) {
  const contentDir = LOCALE_DIRECTION[resolvedLocale];

  return (
    <article className="flex flex-col gap-4 border-b border-slate-200 py-5 first:pt-0 sm:flex-row">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden
        className="block aspect-video w-full shrink-0 overflow-hidden rounded-lg sm:w-44"
      >
        <PostCoverImage cover={cover} sizes="(min-width: 640px) 176px, 100vw" className="size-full" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {categoryLabel ? (
          <span className="text-[11px] font-semibold tracking-wide text-royal-600 uppercase">
            {categoryLabel}
          </span>
        ) : null}

        <h2
          lang={resolvedLocale}
          dir={contentDir}
          className="text-pretty font-display text-base leading-snug font-semibold break-words text-slate-900 md:text-lg"
        >
          <Link href={href} className="line-clamp-2 hover:text-royal-600">
            {title}
          </Link>
        </h2>

        {excerpt ? (
          <p lang={resolvedLocale} dir={contentDir} className="line-clamp-2 break-words text-sm text-slate-600">
            {excerpt}
          </p>
        ) : null}

        <PostMetaRow
          authorName={authorName}
          dateLabel={dateLabel}
          dateTimeIso={dateTimeIso}
          className="mt-0.5 text-[13px]"
        />

        {fallbackNoticeMessage ? <PostFallbackBanner message={fallbackNoticeMessage} compact /> : null}
      </div>
    </article>
  );
}
