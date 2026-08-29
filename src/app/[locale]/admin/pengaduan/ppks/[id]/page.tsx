import {FileLock2, UserRound} from "lucide-react";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {PpksCaseActions, type PpksCaseActionLabels} from "@/components/admin/ppks/ppks-case-actions";
import {PpksReplyComposer, type PpksReplyLabels} from "@/components/admin/ppks/ppks-reply-composer";
import {PpksTicketDetailSchema} from "@/contracts/ticket";
import {Link} from "@/i18n/navigation";
import {currentSessionToken, getTicketQueryBoundary} from "@/features/tickets/boundary";
import {getPrismaClient} from "@/lib/db/client";
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

  /* Only Satgas members can be assigned. Offering the wider staff list would
     invite handing a PPKS case to an account that cannot even open it. */
  const assignees = await getPrismaClient().user.findMany({
    where: {role: "SATGAS_PPKS", isActive: true},
    select: {id: true, name: true},
    orderBy: {name: "asc"},
  });

  const errors = {
    SESSION_INVALID: t("errorSession"),
    REQUEST_INVALID: t("errorRequestInvalid"),
    NOT_FOUND: t("errorNotFound"),
    VALIDATION_FAILED: t("errorRequestInvalid"),
    UNAVAILABLE: t("errorUnavailable"),
  };
  const statuses = Object.fromEntries(
    (["BARU", "DIVERIFIKASI", "DIPROSES", "MENUNGGU_PELAPOR", "SELESAI", "DITOLAK"] as const)
      .map((value) => [value, t(`status${value}` as "statusBARU")]),
  );
  const priorities = Object.fromEntries(
    (["RENDAH", "SEDANG", "TINGGI", "URGENT"] as const)
      .map((value) => [value, t(`priority${value}` as "priorityRENDAH")]),
  );

  const replyLabels = {
    title: t("composerTitle"),
    publicTab: t("replyPublicTab"), internalTab: t("replyInternalTab"),
    publicHint: t("replyPublicHint"), internalHint: t("replyInternalHint"),
    bodyLabel: t("replyBody"),
    sendPublic: t("replySendPublic"), sendInternal: t("replySendInternal"),
    sending: t("saving"),
    savedPublic: t("replySavedPublic"), savedInternal: t("replySavedInternal"),
    errors,
  } satisfies PpksReplyLabels;

  const actionLabels = {
    statusTitle: t("statusTitle"), statusField: t("statusField"),
    statusReason: t("statusReason"), statusSubmit: t("statusSubmit"),
    priorityTitle: t("priorityTitle"), priorityField: t("priorityField"),
    priorityReason: t("priorityReason"), priorityReasonHint: t("priorityReasonHint"),
    prioritySubmit: t("prioritySubmit"),
    assignTitle: t("assignTitle"), assignField: t("assignField"),
    assignSubmit: t("assignSubmit"), assignEmpty: t("assignEmpty"),
    closeTitle: t("closeTitle"), closeField: t("closeField"),
    closeHint: t("closeHint"), closeSubmit: t("closeSubmit"),
    saving: t("saving"), saved: t("saved"), optional: t("optional"),
    errors, statuses, priorities,
  } satisfies PpksCaseActionLabels;

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
            {/* An internal note is marked and tinted so it can never be mistaken
                for something the reporter has already read. */}
            {ticket.replies.map((reply) => (
              <li
                key={reply.id}
                className={`border-s-2 ps-4 ${
                  reply.isInternal ? "border-warning bg-warning-surface/40 py-2" : "border-slate-200"
                }`}
              >
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{stamp.format(reply.createdAt)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    reply.isInternal ? "bg-warning-surface text-slate-900" : "bg-royal-50 text-royal-700"
                  }`}>
                    {reply.isInternal ? t("replyInternalBadge") : t("replyPublicBadge")}
                  </span>
                </p>
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

      <section aria-labelledby="ppks-compose" className="mt-10 border-t border-slate-200 pt-8">
        <h2 id="ppks-compose" className="font-display text-lg font-semibold text-slate-900">
          {t("composerTitle")}
        </h2>
        <PpksReplyComposer ticketId={ticket.id} labels={replyLabels} />
      </section>

      <section aria-labelledby="ppks-actions" className="mt-10 border-t border-slate-200 pt-8">
        <h2 id="ppks-actions" className="font-display text-lg font-semibold text-slate-900">
          {t("actionsTitle")}
        </h2>
        <PpksCaseActions
          ticketId={ticket.id}
          currentStatus={ticket.status}
          currentPriority={ticket.priority}
          assignees={assignees}
          labels={actionLabels}
        />
      </section>
    </div>
  );
}
