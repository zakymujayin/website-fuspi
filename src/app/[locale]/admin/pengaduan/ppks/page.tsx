import {ShieldAlert} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Link} from "@/i18n/navigation";
import {currentSessionToken, getTicketQueryBoundary} from "@/features/tickets/boundary";
import {isPpksEncryptionConfigured} from "@/lib/tickets/ppks-encryption";
import {formatDateTimeDdMmYyyy} from "@/lib/format/date";

const PRIORITY_TONE: Record<string, string> = {
  URGENT: "bg-danger-surface text-danger",
  TINGGI: "bg-warning-surface text-warning",
  SEDANG: "bg-royal-50 text-royal-700",
  RENDAH: "bg-slate-100 text-slate-600",
};

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminPpks"});
  return {title: t("title"), robots: {index: false, follow: false}};
}

export default async function AdminPpksInboxPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AdminPpks");

  if (!isPpksEncryptionConfigured()) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="mt-4 max-w-2xl rounded-xl bg-danger-surface p-5 text-sm text-danger">
          {t("notConfigured")}
        </p>
      </div>
    );
  }

  /* Role is not checked here. The boundary resolves the caller's scope from the
     permission matrix and returns NOT_FOUND to anyone without PPKS detail
     access, so a non-Satgas account sees an empty inbox rather than a hint that
     reports exist. docs/14 D1 wants that decision made at query level. */
  const boundary = getTicketQueryBoundary();
  const session = {sessionToken: (await currentSessionToken()) ?? ""};
  const [listed, aggregate] = await Promise.all([
    boundary.list(session, {page: 1, pageSize: 50}),
    boundary.ppksAggregate(session),
  ]);

  const items = listed.ok
    ? listed.data.items.filter((item) => item.category === "PELECEHAN_SEKSUAL")
    : [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("description")}</p>

      {aggregate.ok ? (
        <dl className="mt-6 flex flex-wrap gap-6 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <dt className="text-xs text-slate-400 uppercase">{t("statTotal")}</dt>
            <dd className="font-display text-xl font-bold text-slate-900">{aggregate.data.total}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase">{t("statActive")}</dt>
            <dd className="font-display text-xl font-bold text-slate-900">{aggregate.data.active}</dd>
          </div>
        </dl>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <ShieldAlert aria-hidden className="mx-auto size-6 text-slate-300" strokeWidth={1.5} />
          {/* An empty list beside a non-zero aggregate means the caller may see
              the count but not the reports. Saying "no reports yet" there would
              contradict the number right above it. */}
          <p className="mt-3 text-sm text-slate-500">
            {!listed.ok
              ? t("noAccess")
              : aggregate.ok && aggregate.data.total > 0
                ? t("aggregateOnly")
                : t("empty")}
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[44rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("columnNumber")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("columnPriority")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("columnStatus")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("columnReceived")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/pengaduan/ppks/${item.id}`}
                      dir="ltr"
                      className="font-mono font-medium text-royal-600 underline-offset-2 hover:underline"
                    >
                      {item.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_TONE[item.priority] ?? ""}`}>
                      {t(`priority${item.priority}` as "priorityRENDAH")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {t(`status${item.status}` as "statusBARU")}
                  </td>
                <td className="px-5 py-3 text-slate-500">{formatDateTimeDdMmYyyy(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* The list deliberately carries no subject or description: the summary
          contract has no content field at all, so nothing sensitive can reach
          this screen even by mistake. */}
      <p className="mt-6 max-w-2xl text-xs text-slate-500">{t("listNotice")}</p>
    </div>
  );
}
