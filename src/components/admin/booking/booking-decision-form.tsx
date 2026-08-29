"use client";

import {CheckIcon, XIcon} from "lucide-react";
import {useActionState} from "react";

import {
  executeBookingAdminAction,
  type BookingAdminActionState,
} from "@/components/admin/booking/booking-admin-actions";
import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Textarea} from "@/components/ui/textarea";

export type BookingDecisionLabels = {
  approve: string;
  reject: string;
  cancel: string;
  reason: string;
  reasonHint: string;
  saved: string;
  saving: string;
  errors: Record<string, string>;
};

const INITIAL: BookingAdminActionState = {status: "idle"};

export function BookingDecisionForm({
  bookingId,
  expectedVersion,
  status,
  labels,
}: {
  bookingId: string;
  expectedVersion: number;
  status: string;
  labels: BookingDecisionLabels;
}) {
  const [state, action, pending] = useActionState(executeBookingAdminAction, INITIAL);
  const canReview = status === "MENUNGGU";
  const canCancel = status === "MENUNGGU" || status === "DISETUJUI";

  if (!canReview && !canCancel) return null;

  return (
    <form action={action} className="mt-4 border-t border-slate-200 pt-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <Field>
        <FieldLabel htmlFor={`reason-${bookingId}`}>{labels.reason}</FieldLabel>
        <Textarea id={`reason-${bookingId}`} name="reason" rows={2} maxLength={500} dir="auto" />
        <FieldDescription>{labels.reasonHint}</FieldDescription>
      </Field>

      <div className="mt-3 flex flex-wrap gap-2">
        {canReview ? (
          <button
            type="submit"
            name="action"
            value="APPROVE"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-success px-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            <CheckIcon aria-hidden data-icon strokeWidth={1.5} />
            {pending ? labels.saving : labels.approve}
          </button>
        ) : null}
        {canReview ? (
          <button
            type="submit"
            name="action"
            value="REJECT"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-warning px-3 text-sm font-semibold text-warning hover:bg-warning-surface disabled:opacity-60"
          >
            <XIcon aria-hidden data-icon strokeWidth={1.5} />
            {pending ? labels.saving : labels.reject}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="submit"
            name="action"
            value="CANCEL"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger px-3 text-sm font-semibold text-danger hover:bg-danger-surface disabled:opacity-60"
          >
            <XIcon aria-hidden data-icon strokeWidth={1.5} />
            {pending ? labels.saving : labels.cancel}
          </button>
        ) : null}
      </div>

      {state.status === "saved" ? (
        <p role="status" className="mt-3 text-sm text-success">{labels.saved}</p>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {labels.errors[state.code] ?? labels.errors.UNAVAILABLE}
        </p>
      ) : null}
    </form>
  );
}
