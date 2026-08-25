import { PencilLineIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
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
  /** From the frozen `AdminPostSummarySchema`. The edit link is presentation of this server
   *  decision — a row the actor cannot update must not offer an edit affordance. */
  capabilities: { update: boolean };
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
  edit: string;
  /** Per-row accessible name; a bare "edit" repeated 20 times is not distinguishable. */
  editLabelFor: (title: string) => string;
};

type AdminPostListProps = {
  items: readonly AdminPostListItem[];
  locale: AppLocale;
  ariaLabel: string;
  labels: AdminPostListLabels;
};

/**
 * Post rows. The only affordance is a navigation link to the editor, shown only where the server
 * reported `capabilities.update`. The list itself still performs no mutation — no publish, archive,
 * or delete control lives here, because those flows are not built.
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
              {item.capabilities.update ? (
                <Link
                  href={`/admin/posts/${item.id}/edit`}
                  aria-label={labels.editLabelFor(item.title)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <PencilLineIcon aria-hidden data-icon className="size-3.5" strokeWidth={1.5} />
                  {labels.edit}
                </Link>
              ) : null}
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
