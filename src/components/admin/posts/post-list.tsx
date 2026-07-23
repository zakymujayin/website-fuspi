import type { AppLocale } from "@/i18n/routing";

import { formatAdminPostInstant, formatAdminPostLocales } from "./post-format";
import { AdminPostStatusBadge, type AdminPostPublicationState } from "./post-status-badge";

export type AdminPostListItem = {
  id: string;
  slug: string;
  title: string;
  availableLocales: readonly string[];
  publicationState: AdminPostPublicationState;
  isFeatured: boolean;
  publishedAt: string | null;
  updatedAt: string;
  category: { id: string; label: string } | null;
  author: { name: string } | null;
};

export type AdminPostListLabels = {
  stateLabel: (state: AdminPostPublicationState) => string;
  featured: string;
  localesLabel: (locales: string) => string;
  uncategorized: string;
  unknownAuthor: string;
  byLabel: (name: string) => string;
  publishedAtLabel: (instant: string) => string;
  updatedAtLabel: (instant: string) => string;
};

type AdminPostListProps = {
  items: readonly AdminPostListItem[];
  locale: AppLocale;
  ariaLabel: string;
  labels: AdminPostListLabels;
};

/**
 * Read-only Post rows. This task is presentation only: no row is a link and no mutation affordance
 * is rendered, because the editor, publish, and delete flows are not yet built. Adding a dead
 * control here would advertise capability the product does not have.
 */
export function AdminPostList({ items, locale, ariaLabel, labels }: AdminPostListProps) {
  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5"
        >
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <h2 className="min-w-0 flex-1 text-pretty font-display text-base font-medium text-slate-900">
              {item.title}
            </h2>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {item.isFeatured ? (
                <span className="inline-flex h-6 items-center rounded-full border border-royal-300 bg-royal-50 px-2.5 text-xs font-medium text-royal-700">
                  {labels.featured}
                </span>
              ) : null}
              <AdminPostStatusBadge
                state={item.publicationState}
                label={labels.stateLabel(item.publicationState)}
              />
            </div>
          </div>

          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{labels.localesLabel("")}</dt>
              <dd>{formatAdminPostLocales(item.availableLocales)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{labels.uncategorized}</dt>
              <dd>{item.category ? item.category.label : labels.uncategorized}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{labels.byLabel("")}</dt>
              <dd>{labels.byLabel(item.author ? item.author.name : labels.unknownAuthor)}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">
                {item.publishedAt ? labels.publishedAtLabel("") : labels.updatedAtLabel("")}
              </dt>
              <dd>
                <time dateTime={item.publishedAt ?? item.updatedAt}>
                  {item.publishedAt
                    ? labels.publishedAtLabel(formatAdminPostInstant(item.publishedAt, locale))
                    : labels.updatedAtLabel(formatAdminPostInstant(item.updatedAt, locale))}
                </time>
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
