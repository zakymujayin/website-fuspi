"use client";

import {CircleAlert} from "lucide-react";
import {useActionState} from "react";

import {
  trackComplaintAction,
  type TrackState,
} from "@/components/public/complaint/complaint-server-actions";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";

export type ComplaintTrackLabels = {
  ticketNumber: string;
  ticketNumberHint: string;
  token: string;
  tokenHint: string;
  track: string;
  tracking: string;
  statusLabel: string;
  categoryLabel: string;
  submittedLabel: string;
  updatedLabel: string;
  descriptionLabel: string;
  resolutionLabel: string;
  repliesLabel: string;
  noReplies: string;
  replyLabel: string;
  replyHint: string;
  sendReply: string;
  sendingReply: string;
  statuses: Record<string, string>;
  priorities: Record<string, string>;
  categories: Record<string, string>;
  confidentialTitle: string;
  confidentialBody: string;
  priorityLabel: string;
  errorCodes: Record<string, string>;
};

const INITIAL: TrackState = {status: "idle"};

function ErrorNote({state, labels}: {state: TrackState; labels: ComplaintTrackLabels}) {
  if (state.status !== "error") return null;
  return (
    <p role="alert" className="mt-5 flex items-center gap-2 rounded-lg bg-danger-surface px-4 py-3 text-sm text-danger">
      <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
      {labels.errorCodes[state.code] ?? labels.errorCodes.UNAVAILABLE}
    </p>
  );
}

function ReplyForm({
  ticketNumber,
  token,
  labels,
  action,
  pending,
}: {
  ticketNumber: string;
  token: string;
  labels: ComplaintTrackLabels;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  return (
    <form action={action} className="mt-8 border-t border-slate-200 pt-6">
      <input type="hidden" name="intent" value="reply" />
      <input type="hidden" name="ticketNumber" value={ticketNumber} />
      <input type="hidden" name="token" value={token} />
      <Field>
        <FieldLabel htmlFor="reply-body">{labels.replyLabel}</FieldLabel>
        <Textarea id="reply-body" name="body" required minLength={1} maxLength={100000} rows={5} dir="auto" />
        <FieldDescription>{labels.replyHint}</FieldDescription>
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px disabled:opacity-60"
      >
        {pending ? labels.sendingReply : labels.sendReply}
      </button>
    </form>
  );
}

export function ComplaintTrackForm({
  labels,
  locale,
}: {
  labels: ComplaintTrackLabels;
  locale: string;
}) {
  const [state, action, pending] = useActionState(trackComplaintAction, INITIAL);

  const formatDate = (iso: string) =>
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
            <FieldLabel htmlFor="ticketNumber">{labels.ticketNumber}</FieldLabel>
            <Input
              id="ticketNumber"
              name="ticketNumber"
              required
              dir="ltr"
              placeholder="FUSPI-2026-0001"
              defaultValue={state.status === "found" ? state.ticket.ticketNumber : ""}
              className="font-mono"
            />
            <FieldDescription>{labels.ticketNumberHint}</FieldDescription>
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

        <ErrorNote state={state} labels={labels} />

        <button
          type="submit"
          disabled={pending}
          className="mt-6 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px disabled:opacity-60"
        >
          {pending ? labels.tracking : labels.track}
        </button>
      </form>

      {state.status === "status-only" ? (
        <section aria-live="polite" className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-slate-900">{labels.confidentialTitle}</h2>
            <span className="rounded-full bg-royal-50 px-3 py-1 text-xs font-medium text-royal-700">
              {labels.statuses[state.ticket.status] ?? state.ticket.status}
            </span>
          </div>
          <p dir="ltr" className="mt-1 font-mono text-sm text-slate-500">{state.ticket.ticketNumber}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.priorityLabel}</dt>
              <dd className="text-slate-700">
                {labels.priorities[state.ticket.priority] ?? state.ticket.priority}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.updatedLabel}</dt>
              <dd className="text-slate-700">{formatDate(state.ticket.updatedAt)}</dd>
            </div>
          </dl>
          {/* No content is shown here by design, so the reader is told why
              rather than left thinking the page is broken. */}
          <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {labels.confidentialBody}
          </p>
        </section>
      ) : null}

      {state.status === "found" ? (
        <section aria-live="polite" className="mt-10 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 dir="auto" className="font-display text-lg font-semibold text-slate-900">
              {state.ticket.subject}
            </h2>
            <span className="rounded-full bg-royal-50 px-3 py-1 text-xs font-medium text-royal-700">
              {labels.statuses[state.ticket.status] ?? state.ticket.status}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.categoryLabel}</dt>
              <dd className="text-slate-700">
                {labels.categories[state.ticket.category] ?? state.ticket.category}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.submittedLabel}</dt>
              <dd className="text-slate-700">{formatDate(state.ticket.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 uppercase">{labels.updatedLabel}</dt>
              <dd className="text-slate-700">{formatDate(state.ticket.updatedAt)}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <h3 className="font-display text-sm font-semibold text-slate-900">{labels.descriptionLabel}</h3>
            <p dir="auto" className="mt-2 text-sm whitespace-pre-wrap text-slate-700">
              {state.ticket.description}
            </p>
          </div>

          {state.ticket.resolution ? (
            <div className="mt-6 rounded-lg bg-success-surface p-4">
              <h3 className="font-display text-sm font-semibold text-slate-900">{labels.resolutionLabel}</h3>
              <p dir="auto" className="mt-2 text-sm whitespace-pre-wrap text-slate-700">
                {state.ticket.resolution}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <h3 className="font-display text-sm font-semibold text-slate-900">{labels.repliesLabel}</h3>
            {state.ticket.replies.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">{labels.noReplies}</p>
            ) : (
              <ol className="mt-3 space-y-4">
                {state.ticket.replies.map((reply) => (
                  <li key={reply.id} className="border-s-2 border-slate-200 ps-4">
                    <p className="font-mono text-xs text-slate-400">{formatDate(reply.createdAt)}</p>
                    <p dir="auto" className="mt-1 text-sm whitespace-pre-wrap text-slate-700">{reply.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <ReplyForm
            ticketNumber={state.ticket.ticketNumber}
            token={state.token}
            labels={labels}
            action={action}
            pending={pending}
          />
        </section>
      ) : null}
    </div>
  );
}
