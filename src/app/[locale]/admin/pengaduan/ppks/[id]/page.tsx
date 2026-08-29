import {FileLock2, UserRound} from "lucide-react";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {PpksTicketDetailSchema} from "@/contracts/ticket";
import {Link} from "@/i18n/navigation";
import {currentSessionToken, getTicketQueryBoundary} from "@/features/tickets/boundary";
import {isPpksEncryptionConfigured} from "@/lib/tickets/ppks-encryption";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminPpks"});
  return {title: t("detailTitle"), robots: {index: false, follow: false}};
}

export default async function AdminPpksDetailPage({
  params,
}: {
  params: Promise<{locale: string; id: string}>;
}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AdminPpks");

  if (!isPpksEncryptionConfigured()) notFound();

  /* `detail` decides access itself and writes the access log inside the same
     transaction as the read, so opening this page is what gets recorded, not a
     later action. A caller without PPKS scope gets NOT_FOUND and their attempt
     is logged too. */
  const detail = await getTicketQueryBoundary().detail(
    {sessionToken: (await currentSessionToken()) ?? ""},
    {id},
  );
  if (!detail.ok) notFound();
  /* Re-parsed rather than cast: `category` is not a discriminant on the detail
     union, and this both narrows the type and proves the payload really is a
     PPKS record before any of it is rendered. */
  const parsed = PpksTicketDetailSchema.safeParse(detail.data);
  if (!parsed.success) notFound();
  const ticket = parsed.data;

  const stamp = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
  });

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/pengaduan/ppks"
        className="text-sm font-medium text-royal-600 underline-offset-2 hover:underline"
      >
        {t("backToInbox")}
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 dir="ltr" className="font-display text-2xl font-bold tracking-tight text-slate-900">
          {ticket.ticketNumber}
        </h1>
        <span className="rounded-full bg-royal-50 px-3 py-1 text-xs font-medium text-royal-700">
          {t(`status${ticket.status}` as "statusBARU")}
        </span>
      </div>

      <p className="mt-4 rounded-lg bg-warning-surface px-4 py-3 text-sm text-slate-800">
        {t("accessLogged")}
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-400 uppercase">{t("columnPriority")}</dt>
          <dd className="text-sm text-slate-700">{t(`priority${ticket.priority}` as "priorityRENDAH")}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400 uppercase">{t("columnReceived")}</dt>
          <dd className="text-sm text-slate-700">{stamp.format(ticket.createdAt)}</dd>
        </div>
      </dl>

      <section aria-labelledby="ppks-reporter" className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 id="ppks-reporter" className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
          <UserRound aria-hidden className="size-4 text-slate-400" strokeWidth={1.5} />
          {t("reporterTitle")}
        </h2>
        {/* An empty identity is a decision the reporter made, not missing data,
            so it is named rather than shown as a blank. */}
        <p dir="auto" className="mt-3 text-sm whitespace-pre-wrap text-slate-700">
          {ticket.reporterIdentity ?? t("reporterAnonymous")}
        </p>
      </section>

      {ticket.subject ? (
        <section aria-labelledby="ppks-subject" className="mt-6">
          <h2 id="ppks-subject" className="font-display text-sm font-semibold text-slate-900">
            {t("subjectTitle")}
          </h2>
          <p dir="auto" className="mt-2 text-slate-800">{ticket.subject}</p>
        </section>
      ) : null}

      <section aria-labelledby="ppks-description" className="mt-6">
        <h2 id="ppks-description" className="font-display text-sm font-semibold text-slate-900">
          {t("descriptionTitle")}
        </h2>
        <p dir="auto" className="mt-2 whitespace-pre-wrap text-slate-800">{ticket.description}</p>
      </section>

      {ticket.attachments.length > 0 ? (
        <section aria-labelledby="ppks-attachments" className="mt-8">
          <h2 id="ppks-attachments" className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <FileLock2 aria-hidden className="size-4 text-slate-400" strokeWidth={1.5} />
            {t("attachmentsTitle")}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {ticket.attachments.map((file) => (
              <li key={file.id} className="flex flex-wrap items-baseline gap-x-3 text-slate-700">
                <span dir="auto">{file.originalName}</span>
                <span className="font-mono text-xs text-slate-400">{Math.ceil(file.size / 1024)} KB</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">{t("attachmentsNotice")}</p>
        </section>
      ) : null}

      <section aria-labelledby="ppks-replies" className="mt-8">
        <h2 id="ppks-replies" className="font-display text-sm font-semibold text-slate-900">
          {t("repliesTitle")}
        </h2>
        {ticket.replies.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t("repliesEmpty")}</p>
        ) : (
          <ol className="mt-3 space-y-4">
            {ticket.replies.map((reply) => (
              <li key={reply.id} className="border-s-2 border-slate-200 ps-4">
                <p className="font-mono text-xs text-slate-400">{stamp.format(reply.createdAt)}</p>
                <p dir="auto" className="mt-1 text-sm whitespace-pre-wrap text-slate-700">{reply.body}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {ticket.resolution ? (
        <section aria-labelledby="ppks-resolution" className="mt-8 rounded-lg bg-success-surface p-4">
          <h2 id="ppks-resolution" className="font-display text-sm font-semibold text-slate-900">
            {t("resolutionTitle")}
          </h2>
          <p dir="auto" className="mt-2 text-sm whitespace-pre-wrap text-slate-700">{ticket.resolution}</p>
        </section>
      ) : null}

      <p className="mt-10 text-xs text-slate-500">{t("actionsPending")}</p>
    </div>
  );
}
