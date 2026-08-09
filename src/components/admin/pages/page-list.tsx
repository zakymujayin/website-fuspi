import { PencilLineIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

import { formatAdminPageInstant, formatAdminPageOrder } from "./page-format";
import { AdminPageStatusBadge, type AdminPagePublicationState } from "./page-status-badge";

export type AdminPageListItem = {
  id: string;
  slug: string;
  title: string;
  availableLocales: readonly string[];
  status: AdminPagePublicationState;
  order: number;
  parentId: string | null;
  parentTitle: string | null;
  hasChildren: boolean;
  updatedAt: string;
};

export type AdminPageListLabels = {
  stateLabel: (state: AdminPagePublicationState) => string;
  localesLabel: (locales: string) => string;
  parentLabel: (title: string) => string;
  childIndicator: string;
  orderLabel: (order: string) => string;
  updatedAtLabel: (instant: string) => string;
  edit: string;
  editLabelFor: (title: string) => string;
};

type AdminPageListProps = {
  items: readonly AdminPageListItem[];
  locale: AppLocale;
  ariaLabel: string;
  labels: AdminPageListLabels;
};

function LocaleBadges({ locales, noneLabel }: { locales: readonly string[]; noneLabel: string }) {
  if (locales.length === 0) return <span className="text-xs text-slate-400">{noneLabel}</span>;
  return (
    <span className="flex gap-1">
      {["id", "en", "ar"].map((locale) => {
        const present = locales.includes(locale);
        return (
          <span
            key={locale}
            className={[
              "inline-flex h-5 items-center rounded px-1.5 text-xs font-medium",
              present
                ? "bg-royal-100 text-royal-800"
                : "border border-slate-200 text-slate-400",
            ].join(" ")}
            aria-hidden={!present}
          >
            {locale.toUpperCase()}
          </span>
        );
      })}
    </span>
  );
}

export function AdminPageList({ items, locale, ariaLabel, labels }: AdminPageListProps) {
  return (
    <ul aria-label={ariaLabel} className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-balance font-display text-base font-medium text-slate-900">
                {item.title}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 break-words">{item.slug}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <AdminPageStatusBadge
                state={item.status}
                label={labels.stateLabel(item.status)}
              />
              <Link
                href={`/admin/pages/${item.id}/edit`}
                aria-label={labels.editLabelFor(item.title)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                <PencilLineIcon aria-hidden data-icon strokeWidth={1.5} />
                {labels.edit}
              </Link>
            </div>
          </div>

          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{labels.localesLabel("")}</dt>
              <dd>
                <LocaleBadges locales={item.availableLocales} noneLabel={labels.localesLabel("")} />
              </dd>
            </div>
            {item.parentTitle ? (
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">{labels.parentLabel("")}</dt>
                <dd>{labels.parentLabel(item.parentTitle)}</dd>
              </div>
            ) : null}
            {item.hasChildren ? (
              <div className="flex items-center gap-1.5">
                <dd>{labels.childIndicator}</dd>
              </div>
            ) : null}
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{labels.orderLabel("")}</dt>
              <dd>{labels.orderLabel(formatAdminPageOrder(item.order, locale))}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">{labels.updatedAtLabel("")}</dt>
              <dd>
                <time dateTime={item.updatedAt}>
                  {labels.updatedAtLabel(formatAdminPageInstant(item.updatedAt, locale))}
                </time>
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
