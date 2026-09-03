"use client";

import {CircleAlert} from "lucide-react";
import {useActionState} from "react";

import {
  trackBookingAction,
  type BookingTrackState,
} from "@/components/public/booking/booking-server-actions";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {formatDateDdMmYyyy, formatDateTimeDdMmYyyy, formatTimeWib} from "@/lib/format/date";

export type BookingTrackLabels = {
  bookingNumber: string;
  bookingNumberHint: string;
  token: string;
  tokenHint: string;
  track: string;
  tracking: string;
  roomLabel: string;
  scheduleLabel: string;
  participantLabel: string;
  purposeLabel: string;
  submittedLabel: string;
  cancelReasonLabel: string;
  cancelTitle: string;
  cancelHint: string;
  cancelSubmit: string;
  cancelling: string;
  historyLabel: string;
  participantUnit: string;
  statuses: Record<string, string>;
  errorCodes: Record<string, string>;
};

const INITIAL: BookingTrackState = {status: "idle"};

/* Stored instants already carry the Jakarta offset, so the reader sees the same
   wall-clock time the room is actually booked for. */
function formatRange(_locale: string, startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${formatDateDdMmYyyy(start)} ${formatTimeWib(start).replace(/\sWIB$/u, "")} - ${formatTimeWib(end)}`;
}

export function BookingTrackForm({
  labels,
  locale,
}: {
  labels: BookingTrackLabels;
  locale: string;
}) {
  const [state, action, pending] = useActionState(trackBookingAction, INITIAL);

  const formatStamp = (iso: string) => formatDateTimeDdMmYyyy(iso);

  return (
    <div className="max-w-2xl">
      <form action={action}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="bookingNumber">{labels.bookingNumber}</FieldLabel>
            <Input
              id="bookingNumber"
              name="bookingNumber"
              required
              dir="ltr"
              placeholder="FUSPI-B-2026-0001"
              defaultValue={state.status === "found" ? state.booking.bookingNumber : ""}
              className="font-mono"
            />
            <FieldDescription>{labels.bookingNumberHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="token">{labels.token}</FieldLabel>
            <Input
              id="token"
              name="token"
              required
              dir="ltr"
              defaultValue={state.status === "found" ? state.token : ""}
              className="font-mono"
            />
            <FieldDescription>{labels.tokenHint}</FieldDescription>
          </Field>
        </FieldGroup>

        {state.status === "error" ? (
          <p role="alert" className="mt-5 flex items-center gap-2 rounded-lg bg-danger-surface px-4 py-3 text-sm text-danger">
            <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            {labels.errorCodes[state.code] ?? labels.errorCodes.UNAVAILABLE}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px disabled:opacity-60"
        >
          {pending ? labels.tracking : labels.track}
        </button>
      </form>

      {state.status === "found" ? (
        <section aria-live="polite" className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 dir="auto" className="font-display text-lg font-semibold text-slate-900">
              {state.booking.roomName}
            </h2>
            <span className="rounded-full bg-royal-50 px-3 py-1 text-xs font-medium text-royal-700">
              {labels.statuses[state.booking.status] ?? state.booking.status}
            </span>
          </div>
          <p dir="ltr" className="mt-1 font-mono text-sm text-slate-500">{state.booking.bookingNumber}</p>

          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.scheduleLabel}</dt>
              <dd className="text-slate-700">
                {formatRange(locale, state.booking.startTime, state.booking.endTime)}
              </dd>
            </div>
            {state.booking.roomLocation ? (
              <div>
                <dt className="text-xs text-slate-400 uppercase">{labels.roomLabel}</dt>
                <dd dir="auto" className="text-slate-700">{state.booking.roomLocation}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.participantLabel}</dt>
              <dd className="text-slate-700">
                {state.booking.participantCount} {labels.participantUnit}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.purposeLabel}</dt>
              <dd dir="auto" className="whitespace-pre-wrap text-slate-700">{state.booking.purpose}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.submittedLabel}</dt>
              <dd className="text-slate-700">{formatStamp(state.booking.createdAt)}</dd>
            </div>
            {state.booking.cancelReason ? (
              <div>
                <dt className="text-xs text-slate-400 uppercase">{labels.cancelReasonLabel}</dt>
                <dd dir="auto" className="text-slate-700">{state.booking.cancelReason}</dd>
              </div>
            ) : null}
          </dl>

          {state.booking.history.length > 0 ? (
            <div className="mt-6">
              <h3 className="font-display text-sm font-semibold text-slate-900">{labels.historyLabel}</h3>
              <ol className="mt-3 border-s border-slate-200">
                {state.booking.history.map((entry) => (
                  <li key={`${entry.toStatus}-${entry.createdAt}`} className="relative ps-6 pb-5 last:pb-0">
                    <span
                      aria-hidden
                      className="absolute start-0 top-1.5 size-2 -translate-x-1/2 rounded-full bg-royal-500 rtl:translate-x-1/2"
                    />
                    <p className="text-sm font-medium text-slate-900">
                      {labels.statuses[entry.toStatus] ?? entry.toStatus}
                    </p>
                    <p className="font-mono text-xs text-slate-400">{formatStamp(entry.createdAt)}</p>
                    {entry.reason ? (
                      <p dir="auto" className="mt-1 text-sm text-slate-600">{entry.reason}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {state.booking.status === "MENUNGGU" || state.booking.status === "DISETUJUI" ? (
            <form action={action} className="mt-8 border-t border-slate-200 pt-6">
              <input type="hidden" name="intent" value="cancel" />
              <input type="hidden" name="bookingNumber" value={state.booking.bookingNumber} />
              <input type="hidden" name="token" value={state.token} />
              <Field>
                <FieldLabel htmlFor="cancelReason">{labels.cancelTitle}</FieldLabel>
                <Textarea id="cancelReason" name="cancelReason" rows={3} maxLength={500} dir="auto" />
                <FieldDescription>{labels.cancelHint}</FieldDescription>
              </Field>
              <button
                type="submit"
                disabled={pending}
                className="mt-4 rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger disabled:opacity-60"
              >
                {pending ? labels.cancelling : labels.cancelSubmit}
              </button>
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
