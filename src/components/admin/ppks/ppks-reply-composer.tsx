"use client";

import {CircleAlert, CircleCheck, EyeOff, Send} from "lucide-react";
import {useActionState, useState} from "react";

import {
  ppksReplyAction,
  type PpksActionState,
} from "@/components/admin/ppks/ppks-action-server-actions";
import {Textarea} from "@/components/ui/textarea";

export type PpksReplyLabels = {
  title: string;
  publicTab: string;
  internalTab: string;
  publicHint: string;
  internalHint: string;
  bodyLabel: string;
  sendPublic: string;
  sendInternal: string;
  sending: string;
  savedPublic: string;
  savedInternal: string;
  errors: Record<string, string>;
};

const INITIAL: PpksActionState = {status: "idle"};

/**
 * Public reply and internal note share one box but never share an appearance.
 * `docs/14` line 77 asks for the two to be told apart clearly so a note is not
 * sent to the reporter by mistake, so the mode is a visible choice that recolours
 * the whole composer and renames the button, not a checkbox that can sit wrong
 * without anyone noticing.
 */
export function PpksReplyComposer({
  ticketId,
  labels,
}: {
  ticketId: string;
  labels: PpksReplyLabels;
}) {
  const [state, action, pending] = useActionState(ppksReplyAction, INITIAL);
  const [mode, setMode] = useState<"public" | "internal">("public");
  const internal = mode === "internal";

  return (
    <form action={action} key={state.status === "done" ? "sent" : "compose"} className="mt-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="mode" value={mode} />

      <div role="radiogroup" aria-label={labels.title} className="flex flex-wrap gap-2">
        {([["public", labels.publicTab], ["internal", labels.internalTab]] as const).map(([value, label]) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 ${
                active
                  ? value === "internal"
                    ? "border-warning bg-warning-surface text-slate-900"
                    : "border-royal-500 bg-royal-50 text-royal-700"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className={`mt-3 flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
        internal ? "bg-warning-surface text-slate-800" : "bg-royal-50 text-royal-900"
      }`}>
        {internal
          ? <EyeOff aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          : <Send aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />}
        {internal ? labels.internalHint : labels.publicHint}
      </p>

      <label htmlFor="ppks-body" className="mt-4 block text-sm font-medium text-slate-700">
        {labels.bodyLabel}
      </label>
      <Textarea
        id="ppks-body"
        name="body"
        required
        minLength={1}
        maxLength={100000}
        rows={5}
        dir="auto"
        className={`mt-2 border-2 ${internal ? "border-warning bg-warning-surface/40" : "border-royal-200"}`}
      />

      {state.status === "error" ? (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger">
          <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          {labels.errors[state.code] ?? labels.errors.UNAVAILABLE}
        </p>
      ) : null}
      {state.status === "done" ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-success">
          <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          {internal ? labels.savedInternal : labels.savedPublic}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`mt-4 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px disabled:opacity-60 ${
          internal
            ? "bg-warning hover:bg-warning/90 focus-visible:outline-warning"
            : "bg-royal-500 hover:bg-royal-600 focus-visible:outline-royal-600"
        }`}
      >
        {pending ? labels.sending : internal ? labels.sendInternal : labels.sendPublic}
      </button>
    </form>
  );
}
