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

export type AdminPostListColumnLabels = {
  title: string;
  category: string;
  author: string;
  locales: string;
  status: string;
  published: string;
  actions: string;
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
  columns: AdminPostListColumnLabels;
};

type AdminPostListProps = {
  items: readonly AdminPostListItem[];
  locale: AppLocale;
  ariaLabel: string;
  labels: AdminPostListLabels;
  editHrefFor?: (id: string) => string;
};

/**
 * Post rows rendered as a scannable data table. The only affordance is a navigation link to the
 * editor, shown only where the server reported `capabilities.update`. The table itself performs no
 * mutation — no publish, archive, or delete control lives here, because those flows are not built.
 */
export function AdminPostList({
  items,
  locale,
  ariaLabel,
  labels,
  editHrefFor = (id) => `/admin/posts/${id}/edit`,
}: AdminPostListProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table aria-label={ariaLabel} className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-4 py-3 text-start font-medium">
              {labels.columns.title}
            </th>
            <th scope="col" className="px-4 py-3 text-start font-medium">
              {labels.columns.category}
            </th>
            <th scope="col" className="hidden px-4 py-3 text-start font-medium lg:table-cell">
              {labels.columns.author}
            </th>
            <th scope="col" className="hidden px-4 py-3 text-start font-medium xl:table-cell">
              {labels.columns.locales}
            </th>
            <th scope="col" className="px-4 py-3 text-start font-medium">
              {labels.columns.status}
            </th>
            <th scope="col" className="px-4 py-3 text-end font-medium">
              {labels.columns.published}
            </th>
            <th scope="col" className="px-4 py-3 text-end font-medium">
              <span className="sr-only">{labels.columns.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="align-middle transition-colors hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex max-w-prose flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-pretty font-medium text-slate-900">{item.title}</span>
                  {item.isFeatured ? (
                    <span className="inline-flex h-5 shrink-0 items-center rounded-full border border-amber-300 bg-amber-50 px-2 text-xs font-medium text-amber-700">
                      {labels.featured}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">
                {item.category ? (
                  <span className="text-slate-600">{item.category.label}</span>
                ) : (
                  <span className="text-slate-400">{labels.uncategorized}</span>
                )}
              </td>
              <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                {labels.byLabel(item.author ? item.author.name : labels.unknownAuthor)}
              </td>
              <td className="hidden px-4 py-3 xl:table-cell">
                <span className="font-mono text-xs tracking-wide text-slate-500">
                  {formatAdminPostLocales(item.availableLocales)}
                </span>
              </td>
              <td className="px-4 py-3">
                <AdminPostStatusBadge
                  state={item.publicationState}
                  label={labels.stateLabel(item.publicationState)}
                />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-end text-slate-500 tabular-nums">
                <time dateTime={item.publishedAt ?? item.updatedAt}>
                  {item.publishedAt
                    ? labels.publishedAtLabel(formatAdminPostInstant(item.publishedAt, locale))
                    : labels.updatedAtLabel(formatAdminPostInstant(item.updatedAt, locale))}
                </time>
              </td>
              <td className="px-4 py-3 text-end">
                {item.capabilities.update ? (
                  <Link
                    href={editHrefFor(item.id)}
                    aria-label={labels.editLabelFor(item.title)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <PencilLineIcon aria-hidden data-icon className="size-3.5" strokeWidth={1.5} />
                    {labels.edit}
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
