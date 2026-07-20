import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

import type { ResolvedCoverImage } from "./cover-image";
import { LOCALE_DIRECTION } from "./locale";
import { PostCoverImage } from "./post-cover-image";

export type PostSidebarItem = {
  id: string;
  href: string;
  title: string;
  /** Actual language `title` is rendered in — may be Indonesian fallback on an Arabic page. */
  resolvedLocale: AppLocale;
  dateLabel: string;
  dateTimeIso: string;
  cover: ResolvedCoverImage;
};

type PostSidebarLatestProps = {
  heading: string;
  items: readonly PostSidebarItem[];
  seeAllLabel: string;
  seeAllHref: string;
};

/**
 * "Berita Terbaru" sidebar widget (docs/19-C). Sticky on desktop, moves
 * below the article on mobile via the caller's layout order — sticky is
 * disabled below `lg` per docs/19 mobile note.
 */
export function PostSidebarLatest({ heading, items, seeAllLabel, seeAllHref }: PostSidebarLatestProps) {
  if (items.length === 0) return null;

  return (
    <aside className="lg:sticky lg:top-[92px] lg:self-start">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="section-rule font-display text-base font-medium text-slate-900">{heading}</h2>
        <ul className="mt-6 flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="border-b border-slate-100 py-3 last:border-b-0">
              <Link
                href={item.href}
                className="group flex items-center gap-3 rounded-lg transition-colors hover:bg-slate-50"
              >
                <PostCoverImage
                  cover={item.cover}
                  sizes="72px"
                  className="h-14 w-[72px] shrink-0 rounded-md"
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span
                    lang={item.resolvedLocale}
                    dir={LOCALE_DIRECTION[item.resolvedLocale]}
                    className="line-clamp-2 break-words text-sm font-medium text-slate-900 group-hover:text-royal-600"
                  >
                    {item.title}
                  </span>
                  <time dateTime={item.dateTimeIso} className="text-xs text-slate-500">
                    {item.dateLabel}
                  </time>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={seeAllHref}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-royal-600 hover:text-royal-700"
        >
          {seeAllLabel}
          <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
        </Link>
      </div>
    </aside>
  );
}
