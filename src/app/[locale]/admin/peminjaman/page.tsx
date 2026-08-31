import {CalendarCheckIcon, CheckCircle2Icon, CircleDashedIcon, FileTextIcon} from "lucide-react";
import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {BookingDecisionForm, type BookingDecisionLabels} from "@/components/admin/booking/booking-decision-form";
import {BOOKING_ADMIN_ROLES, listBookings} from "@/features/booking/domain";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {decideProtectedRoute, getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

type Props = {
  params: Promise<{locale: string}>;
};

const STATUSES = [
  "DIAJUKAN",
  "DISPOSISI_DEKAN",
  "CEK_KETERSEDIAAN",
  "PERLU_REVISI",
  "MENUNGGU",
  "DISETUJUI",
  "DITOLAK",
  "DIBATALKAN",
  "SELESAI",
] as const;
const FLOW_STEPS = ["DIAJUKAN", "DISPOSISI_DEKAN", "CEK_KETERSEDIAAN", "DISETUJUI"] as const;

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminBooking"});
  return {title: t("title"), robots: {index: false, follow: false}};
}

function formatDate(locale: string, iso: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function formatRange(locale: string, startIso: string, endIso: string) {
  return `${formatDate(locale, startIso)} - ${formatDate(locale, endIso)} WIB`;
}

function flowState(currentStatus: string, step: string) {
  const currentIndex = FLOW_STEPS.findIndex((value) => value === currentStatus);
  const stepIndex = FLOW_STEPS.findIndex((value) => value === step);
  if (currentIndex < 0 || stepIndex < 0) return "pending";
  if (currentIndex > stepIndex) return "done";
  if (currentIndex === stepIndex) return "active";
  return "pending";
}

export default async function AdminBookingPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);
  const session = await getRequestSession();
  const decision = decideProtectedRoute(
    session,
    appLocale,
    `/${appLocale}/admin/peminjaman`,
    {roles: BOOKING_ADMIN_ROLES},
  );
  if (!decision.allow) redirect(decision.redirectTo);
  const actorRole = session.ok ? session.session.role : "PETUGAS";

  const t = await getTranslations("AdminBooking");
  const result = await listBookings(getPrismaClient(), session.ok ? session.session : null, {});
  const statuses = Object.fromEntries(
    STATUSES.map((value) => [value, t(`status${value}` as "statusMENUNGGU")]),
  );
  const actionLabels = {
    verifyStaff: t("verifyStaff"),
    dispose: t("dispose"),
    requestRevision: t("requestRevision"),
    approve: t("approve"),
    reject: t("reject"),
    cancel: t("cancel"),
    dispositionTarget: t("dispositionTarget"),
    dispositionTargetHint: t("dispositionTargetHint"),
    targets: {
      WADEK_I: t("targetWadekI"),
      WADEK_II: t("targetWadekII"),
      WADEK_III: t("targetWadekIII"),
      KABAG: t("targetKabag"),
    },
    reason: t("reason"),
    reasonHint: t("reasonHint"),
    saved: t("saved"),
    saving: t("saving"),
    errors: {
      SESSION_INVALID: t("errorSession"),
      VALIDATION_FAILED: t("errorValidation"),
      NOT_FOUND: t("errorNotFound"),
      VERSION_CONFLICT: t("errorVersion"),
      INVALID_STATE: t("errorInvalidState"),
      APPLICATION_REQUIRED: t("errorApplicationRequired"),
      TIME_OVERLAP: t("errorTimeOverlap"),
      UNAVAILABLE: t("errorUnavailable"),
    },
  } satisfies BookingDecisionLabels;

  return (
    <section aria-labelledby="admin-booking-title" className="flex flex-col gap-6">
      <div>
        <h1 id="admin-booking-title" className="section-rule font-display text-2xl text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t("description")}</p>
      </div>

      {result.ok && result.data.items.length > 0 ? (
        <ul className="flex flex-col gap-4" aria-label={t("listAria")}>
          {result.data.items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p dir="ltr" className="font-mono text-sm font-semibold text-royal-700">{item.bookingNumber}</p>
                  <h2 dir="auto" className="mt-1 font-display text-base font-semibold text-slate-900">
                    {item.roomName}
                  </h2>
                  <p dir="auto" className="mt-1 text-sm text-slate-600">{item.requesterName}</p>
                </div>
                <span className="rounded-full bg-royal-50 px-3 py-1 text-xs font-medium text-royal-700">
                  {statuses[item.status] ?? item.status}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {item.hasApplicationLetter ? (
                  <a
                    href={`/api/admin/bookings/${item.id}/application`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <FileTextIcon aria-hidden data-icon strokeWidth={1.5} />
                    {t("downloadApplication")}
                  </a>
                ) : (
                  <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger px-3 text-sm font-semibold text-danger">
                    <FileTextIcon aria-hidden data-icon strokeWidth={1.5} />
                    {t("missingApplication")}
                  </span>
                )}
              </div>

              <ol className="mt-5 grid gap-2 text-xs sm:grid-cols-4" aria-label={t("workflowAria")}>
                {FLOW_STEPS.map((step) => {
                  const state = flowState(item.status, step);
                  return (
                    <li
                      key={step}
                      className={
                        state === "done"
                          ? "flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 font-medium text-success"
                          : state === "active"
                            ? "flex items-center gap-2 rounded-lg bg-royal-50 px-3 py-2 font-medium text-royal-700"
                            : "flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-500"
                      }
                    >
                      {state === "done" ? (
                        <CheckCircle2Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                      ) : (
                        <CircleDashedIcon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                      )}
                      {statuses[step] ?? step}
                    </li>
                  );
                })}
              </ol>

              <dl className="mt-5 grid gap-3 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-400 uppercase">{t("schedule")}</dt>
                  <dd className="text-slate-700">{formatRange(locale, item.startTime, item.endTime)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400 uppercase">{t("participants")}</dt>
                  <dd className="text-slate-700">{item.participantCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400 uppercase">{t("email")}</dt>
                  <dd dir="ltr" className="text-slate-700">{item.requesterEmail}</dd>
                </div>
                {item.organization ? (
                  <div>
                    <dt className="text-xs text-slate-400 uppercase">{t("organization")}</dt>
                    <dd dir="auto" className="text-slate-700">{item.organization}</dd>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-400 uppercase">{t("purpose")}</dt>
                  <dd dir="auto" className="whitespace-pre-wrap text-slate-700">{item.purpose}</dd>
                </div>
              </dl>

              {item.history.length > 0 ? (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{t("history")}</h3>
                  <ol className="mt-2 grid gap-2 text-sm text-slate-600">
                    {item.history.slice(-4).map((historyItem) => (
                      <li key={`${historyItem.toStatus}-${historyItem.createdAt}`} className="flex flex-wrap gap-2">
                        <span className="font-medium text-slate-800">
                          {statuses[historyItem.toStatus] ?? historyItem.toStatus}
                        </span>
                        <span>{formatDate(locale, historyItem.createdAt)}</span>
                        {historyItem.reason ? <span dir="auto">- {historyItem.reason}</span> : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <BookingDecisionForm
                bookingId={item.id}
                expectedVersion={item.version}
                status={item.status}
                actorRole={actorRole}
                labels={actionLabels}
              />
            </li>
          ))}
        </ul>
      ) : result.ok ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center">
          <CalendarCheckIcon aria-hidden className="mx-auto size-6 text-slate-300" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-slate-500">{t("empty")}</p>
        </div>
      ) : (
        <p role="alert" className="text-sm text-danger">{t("errorUnavailable")}</p>
      )}
    </section>
  );
}
