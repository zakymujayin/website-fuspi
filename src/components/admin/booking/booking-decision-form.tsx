"use client";

import {CheckIcon, FileCheck2Icon, RotateCcwIcon, SendIcon, XIcon} from "lucide-react";
import {useActionState} from "react";

import {
  executeBookingAdminAction,
  type BookingAdminActionState,
} from "@/components/admin/booking/booking-admin-actions";
import {Field, FieldDescription, FieldLabel} from "@/components/ui/field";
import {Textarea} from "@/components/ui/textarea";

export type BookingDecisionLabels = {
  verifyStaff: string;
  dispose: string;
  requestRevision: string;
  approve: string;
  reject: string;
  cancel: string;
  dispositionTarget: string;
  dispositionTargetHint: string;
  targets: Record<string, string>;
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
  const canVerify = status === "DIAJUKAN" || status === "MENUNGGU";
  const canDispose = status === "DISPOSISI_DEKAN";
  const canDecide = status === "CEK_KETERSEDIAAN";
  const canRequestRevision = status === "DISPOSISI_DEKAN" || status === "CEK_KETERSEDIAAN";
  const canReject = ["DIAJUKAN", "DISPOSISI_DEKAN", "CEK_KETERSEDIAAN", "PERLU_REVISI", "MENUNGGU"].includes(status);
  const canCancel = canReject || status === "DISETUJUI";

  if (!canVerify && !canDispose && !canDecide && !canRequestRevision && !canReject && !canCancel) return null;

  return (
    <form action={action} className="mt-4 border-t border-slate-200 pt-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      {canDispose ? (
        <Field className="mb-3">
          <FieldLabel htmlFor={`target-${bookingId}`}>{labels.dispositionTarget}</FieldLabel>
          <select
            id={`target-${bookingId}`}
            name="target"
            required
            defaultValue="KABAG"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500"
          >
            {Object.entries(labels.targets).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <FieldDescription>{labels.dispositionTargetHint}</FieldDescription>
        </Field>
      ) : null}
      <Field>
        <FieldLabel htmlFor={`reason-${bookingId}`}>{labels.reason}</FieldLabel>
        <Textarea id={`reason-${bookingId}`} name="reason" rows={2} maxLength={500} dir="auto" />
        <FieldDescription>{labels.reasonHint}</FieldDescription>
      </Field>

      <div className="mt-3 flex flex-wrap gap-2">
        {canVerify ? (
          <button
            type="submit"
            name="action"
            value="VERIFY_STAFF"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-royal-600 px-3 text-sm font-semibold text-white hover:bg-royal-700 disabled:opacity-60"
          >
            <FileCheck2Icon aria-hidden data-icon strokeWidth={1.5} />
            {pending ? labels.saving : labels.verifyStaff}
          </button>
        ) : null}
        {canDispose ? (
          <button
            type="submit"
            name="action"
            value="DISPOSE"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-royal-600 px-3 text-sm font-semibold text-white hover:bg-royal-700 disabled:opacity-60"
          >
            <SendIcon aria-hidden data-icon strokeWidth={1.5} />
            {pending ? labels.saving : labels.dispose}
          </button>
        ) : null}
        {canRequestRevision ? (
          <button
            type="submit"
            name="action"
            value="REQUEST_REVISION"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-warning px-3 text-sm font-semibold text-warning hover:bg-warning-surface disabled:opacity-60"
          >
            <RotateCcwIcon aria-hidden data-icon strokeWidth={1.5} />
            {pending ? labels.saving : labels.requestRevision}
          </button>
        ) : null}
        {canDecide ? (
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
        {canReject ? (
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
