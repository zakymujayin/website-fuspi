"use client";

import {CircleAlert, KeyRound, UploadIcon} from "lucide-react";
import {useActionState} from "react";

import {
  submitBookingAction,
  type BookingSubmitState,
} from "@/components/public/booking/booking-server-actions";
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldSet} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Link} from "@/i18n/navigation";

export type BookingRoomOption = {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
};

export type BookingRequestLabels = {
  room: string;
  roomHint: string;
  date: string;
  startTime: string;
  endTime: string;
  timeHint: string;
  participantCount: string;
  purpose: string;
  purposeHint: string;
  applicationLetter: string;
  applicationLetterHint: string;
  requesterSection: string;
  bookingSection: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  organization: string;
  optional: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  bookingNumberLabel: string;
  tokenLabel: string;
  tokenWarning: string;
  trackLink: string;
  capacityUnit: string;
  errorCodes: Record<string, string>;
};

const INITIAL: BookingSubmitState = {status: "idle"};

export function BookingRequestForm({
  rooms,
  labels,
  minDate,
}: {
  rooms: readonly BookingRoomOption[];
  labels: BookingRequestLabels;
  minDate: string;
}) {
  const [state, action, pending] = useActionState(submitBookingAction, INITIAL);

  if (state.status === "submitted") {
    return (
      <div className="max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-slate-900">{labels.successTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">{labels.successBody}</p>

        {/* Same treatment as a complaint receipt: the code is issued once, and
            without it the request cannot be opened again. */}
        <div className="mt-6 rounded-xl border-2 border-warning bg-warning-surface p-5">
          <p className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <KeyRound aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            {labels.tokenWarning}
          </p>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-slate-600 uppercase">{labels.bookingNumberLabel}</dt>
              <dd dir="ltr" className="mt-0.5 font-mono text-base font-semibold text-slate-900">
                {state.bookingNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-600 uppercase">{labels.tokenLabel}</dt>
              <dd dir="ltr" className="mt-0.5 font-mono text-sm font-semibold break-all text-slate-900">
                {state.trackingToken}
              </dd>
            </div>
          </dl>
        </div>

        <Link
          href="/peminjaman/lacak"
          className="mt-6 inline-block text-sm font-medium text-royal-600 underline-offset-2 hover:underline"
        >
          {labels.trackLink}
        </Link>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="max-w-2xl overflow-hidden rounded-2xl border border-slate-200 border-t-4 border-t-royal-500 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] sm:p-8"
      encType="multipart/form-data"
    >
      <FieldSet className="border-b border-slate-200 pb-8">
        <legend className="border-s-2 border-brass-400 ps-3 font-display text-sm font-semibold text-slate-900">{labels.bookingSection}</legend>
        <FieldGroup className="mt-4">
          <Field>
            <FieldLabel htmlFor="roomId">{labels.room}</FieldLabel>
            <select
              id="roomId"
              name="roomId"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500"
            >
              <option value="" disabled>{labels.room}</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.capacity} {labels.capacityUnit})
                </option>
              ))}
            </select>
            <FieldDescription>{labels.roomHint}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="date">{labels.date}</FieldLabel>
            <Input id="date" name="date" type="date" required min={minDate} dir="ltr" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="startTime">{labels.startTime}</FieldLabel>
              <Input id="startTime" name="startTime" type="time" required dir="ltr" />
            </Field>
            <Field>
              <FieldLabel htmlFor="endTime">{labels.endTime}</FieldLabel>
              <Input id="endTime" name="endTime" type="time" required dir="ltr" />
            </Field>
          </div>
          <FieldDescription>{labels.timeHint}</FieldDescription>

          <Field>
            <FieldLabel htmlFor="participantCount">{labels.participantCount}</FieldLabel>
            <Input
              id="participantCount"
              name="participantCount"
              type="number"
              inputMode="numeric"
              required
              min={1}
              max={10000}
              dir="ltr"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="purpose">{labels.purpose}</FieldLabel>
            <Textarea id="purpose" name="purpose" required minLength={1} maxLength={5000} rows={4} dir="auto" />
            <FieldDescription>{labels.purposeHint}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="applicationLetter">{labels.applicationLetter}</FieldLabel>
              <div className="rounded-xl border-2 border-dashed border-royal-200 bg-royal-50/40 p-3 transition-colors hover:border-royal-400 hover:bg-royal-50/70">
              <UploadIcon aria-hidden className="size-4 shrink-0 text-slate-500" strokeWidth={1.5} />
              <Input
                id="applicationLetter"
                name="applicationLetter"
                type="file"
                accept="application/pdf,.pdf"
                required
                className="mt-2 h-auto min-h-12 border-0 bg-transparent p-0 text-sm text-slate-600 shadow-none file:me-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-royal-500 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-royal-600 focus-visible:ring-3 focus-visible:ring-royal-500/25"
              />
            </div>
            <FieldDescription>{labels.applicationLetterHint}</FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="pt-8">
        <legend className="border-s-2 border-brass-400 ps-3 font-display text-sm font-semibold text-slate-900">{labels.requesterSection}</legend>
        <FieldGroup className="mt-4">
          <Field>
            <FieldLabel htmlFor="requesterName">{labels.requesterName}</FieldLabel>
            <Input id="requesterName" name="requesterName" required maxLength={191} dir="auto" />
          </Field>
          <Field>
            <FieldLabel htmlFor="requesterEmail">{labels.requesterEmail}</FieldLabel>
            <Input id="requesterEmail" name="requesterEmail" type="email" required maxLength={320} dir="ltr" />
          </Field>
          <Field>
            <FieldLabel htmlFor="requesterPhone">
              {labels.requesterPhone} <span className="text-slate-400">({labels.optional})</span>
            </FieldLabel>
            <Input id="requesterPhone" name="requesterPhone" maxLength={30} dir="ltr" />
          </Field>
          <Field>
            <FieldLabel htmlFor="organization">
              {labels.organization} <span className="text-slate-400">({labels.optional})</span>
            </FieldLabel>
            <Input id="organization" name="organization" maxLength={255} dir="auto" />
          </Field>
        </FieldGroup>
      </FieldSet>

      {state.status === "error" ? (
        <p role="alert" className="mt-6 flex items-start gap-2 rounded-lg bg-danger-surface px-4 py-3 text-sm text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          {labels.errorCodes[state.code] ?? labels.errorCodes.UNAVAILABLE}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || rooms.length === 0}
        className="mt-8 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
