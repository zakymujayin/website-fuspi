"use client";

import {CircleAlert} from "lucide-react";
import {useActionState} from "react";

import {
  trackBookingAction,
  type BookingTrackState,
} from "@/components/public/booking/booking-server-actions";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";

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
  historyLabel: string;
  participantUnit: string;
  statuses: Record<string, string>;
  errorCodes: Record<string, string>;
};

const INITIAL: BookingTrackState = {status: "idle"};

/* Stored instants already carry the Jakarta offset, so the reader sees the same
   wall-clock time the room is actually booked for. */
function formatRange(locale: string, startIso: string, endIso: string) {
  const date = new Intl.DateTimeFormat(locale, {dateStyle: "full", timeZone: "Asia/Jakarta"});
  const time = new Intl.DateTimeFormat(locale, {timeStyle: "short", timeZone: "Asia/Jakarta"});
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${date.format(start)}, ${time.format(start)} - ${time.format(end)} WIB`;
}

export function BookingTrackForm({
  labels,
  locale,
}: {
  labels: BookingTrackLabels;
  locale: string;
}) {
  const [state, action, pending] = useActionState(trackBookingAction, INITIAL);

  const formatStamp = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(iso));

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
        </section>
      ) : null}
    </div>
  );
}
