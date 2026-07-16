import { Calendar, Clock, Folder, User } from "lucide-react";

import { cn } from "@/lib/utils";

type PostMetaRowProps = {
  authorName?: string | null;
  dateLabel: string;
  categoryLabel?: string | null;
  readingLabel?: string;
  className?: string;
};

/**
 * Author · date · category · reading-time row (docs/19-C). Category is
 * rendered as a plain badge, not a link — `/berita/kategori/[slug]` is a
 * separate, out-of-scope route this task must not fabricate.
 */
export function PostMetaRow({
  authorName,
  dateLabel,
  categoryLabel,
  readingLabel,
  className,
}: PostMetaRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500",
        className,
      )}
    >
      {authorName ? (
        <span className="inline-flex items-center gap-1.5">
          <User aria-hidden className="size-4" strokeWidth={1.5} />
          {authorName}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1.5">
        <Calendar aria-hidden className="size-4" strokeWidth={1.5} />
        <time>{dateLabel}</time>
      </span>
      {categoryLabel ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-royal-50 px-2.5 py-0.5 text-xs font-medium tracking-wide text-royal-700 uppercase">
          <Folder aria-hidden className="size-3.5" strokeWidth={1.5} />
          {categoryLabel}
        </span>
      ) : null}
      {readingLabel ? (
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-4" strokeWidth={1.5} />
          {readingLabel}
        </span>
      ) : null}
    </div>
  );
}
