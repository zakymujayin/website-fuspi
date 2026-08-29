"use client";

import {CircleAlert, CircleCheck} from "lucide-react";
import {useActionState} from "react";

import {
  ppksAssignAction,
  ppksCloseAction,
  ppksPriorityAction,
  ppksStatusAction,
  type PpksActionState,
} from "@/components/admin/ppks/ppks-action-server-actions";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";

export type PpksCaseActionLabels = {
  statusTitle: string;
  statusField: string;
  statusReason: string;
  statusSubmit: string;
  priorityTitle: string;
  priorityField: string;
  priorityReason: string;
  priorityReasonHint: string;
  prioritySubmit: string;
  assignTitle: string;
  assignField: string;
  assignSubmit: string;
  assignEmpty: string;
  closeTitle: string;
  closeField: string;
  closeHint: string;
  closeSubmit: string;
  saving: string;
  saved: string;
  optional: string;
  errors: Record<string, string>;
  statuses: Record<string, string>;
  priorities: Record<string, string>;
};

const INITIAL: PpksActionState = {status: "idle"};
const STATUSES = ["BARU", "DIVERIFIKASI", "DIPROSES", "MENUNGGU_PELAPOR", "DITOLAK"] as const;
const PRIORITIES = ["RENDAH", "SEDANG", "TINGGI", "URGENT"] as const;

function Feedback({state, labels}: {state: PpksActionState; labels: PpksCaseActionLabels}) {
  if (state.status === "error") {
    return (
      <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger">
        <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        {labels.errors[state.code] ?? labels.errors.UNAVAILABLE}
      </p>
    );
  }
  if (state.status === "done") {
    return (
      <p role="status" className="mt-3 flex items-center gap-2 text-sm text-success">
        <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        {labels.saved}
      </p>
    );
  }
  return null;
}

const PANEL = "rounded-xl border border-slate-200 bg-white p-5";
const FIELD = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500";
const BUTTON = "mt-4 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px disabled:opacity-60";

export function PpksCaseActions({
  ticketId,
  currentStatus,
  currentPriority,
  assignees,
  labels,
}: {
  ticketId: string;
  currentStatus: string;
  currentPriority: string;
  assignees: ReadonlyArray<{id: string; name: string}>;
  labels: PpksCaseActionLabels;
}) {
  const [statusState, statusAction, statusPending] = useActionState(ppksStatusAction, INITIAL);
  const [priorityState, priorityAction, priorityPending] = useActionState(ppksPriorityAction, INITIAL);
  const [assignState, assignAction, assignPending] = useActionState(ppksAssignAction, INITIAL);
  const [closeState, closeAction, closePending] = useActionState(ppksCloseAction, INITIAL);

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <form action={statusAction} className={PANEL}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <h3 className="font-display text-sm font-semibold text-slate-900">{labels.statusTitle}</h3>
        <label htmlFor="ppks-status" className="mt-3 block text-sm text-slate-700">{labels.statusField}</label>
        <select id="ppks-status" name="status" defaultValue={currentStatus} className={`mt-1.5 ${FIELD}`}>
          {STATUSES.map((value) => (
            <option key={value} value={value}>{labels.statuses[value] ?? value}</option>
          ))}
        </select>
        <label htmlFor="ppks-status-reason" className="mt-3 block text-sm text-slate-700">
          {labels.statusReason} <span className="text-slate-400">({labels.optional})</span>
        </label>
        <Input id="ppks-status-reason" name="reason" maxLength={500} dir="auto" className="mt-1.5" />
        <Feedback state={statusState} labels={labels} />
        <button type="submit" disabled={statusPending} className={BUTTON}>
          {statusPending ? labels.saving : labels.statusSubmit}
        </button>
      </form>

      <form action={priorityAction} className={PANEL}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <h3 className="font-display text-sm font-semibold text-slate-900">{labels.priorityTitle}</h3>
        <label htmlFor="ppks-priority" className="mt-3 block text-sm text-slate-700">{labels.priorityField}</label>
        <select id="ppks-priority" name="priority" defaultValue={currentPriority} className={`mt-1.5 ${FIELD}`}>
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>{labels.priorities[value] ?? value}</option>
          ))}
        </select>
        {/* Required, not optional: the domain refuses a priority change without
            a reason, and the form says so before the request is made. */}
        <label htmlFor="ppks-priority-reason" className="mt-3 block text-sm text-slate-700">
          {labels.priorityReason}
        </label>
        <Input id="ppks-priority-reason" name="reason" required maxLength={500} dir="auto" className="mt-1.5" />
        <p className="mt-1.5 text-xs text-slate-500">{labels.priorityReasonHint}</p>
        <Feedback state={priorityState} labels={labels} />
        <button type="submit" disabled={priorityPending} className={BUTTON}>
          {priorityPending ? labels.saving : labels.prioritySubmit}
        </button>
      </form>

      <form action={assignAction} className={PANEL}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <h3 className="font-display text-sm font-semibold text-slate-900">{labels.assignTitle}</h3>
        {assignees.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{labels.assignEmpty}</p>
        ) : (
          <>
            <label htmlFor="ppks-assignee" className="mt-3 block text-sm text-slate-700">{labels.assignField}</label>
            <select id="ppks-assignee" name="assigneeId" required defaultValue="" className={`mt-1.5 ${FIELD}`}>
              <option value="" disabled>{labels.assignField}</option>
              {assignees.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
            <Feedback state={assignState} labels={labels} />
            <button type="submit" disabled={assignPending} className={BUTTON}>
              {assignPending ? labels.saving : labels.assignSubmit}
            </button>
          </>
        )}
      </form>

      <form action={closeAction} className={PANEL}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <h3 className="font-display text-sm font-semibold text-slate-900">{labels.closeTitle}</h3>
        <label htmlFor="ppks-resolution" className="mt-3 block text-sm text-slate-700">{labels.closeField}</label>
        <Textarea id="ppks-resolution" name="resolution" required minLength={1} maxLength={100000} rows={4} dir="auto" className="mt-1.5" />
        <p className="mt-1.5 text-xs text-slate-500">{labels.closeHint}</p>
        <Feedback state={closeState} labels={labels} />
        <button type="submit" disabled={closePending} className={BUTTON}>
          {closePending ? labels.saving : labels.closeSubmit}
        </button>
      </form>
    </div>
  );
}
