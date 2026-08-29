"use client";

import {CircleAlert, CircleCheck} from "lucide-react";

import type {PortalFormState} from "@/components/portal/lecturer-portal-server-actions";

export type PortalStatusLabels = {
  saved: string;
  errorValidation: string;
  errorSession: string;
  errorUnavailable: string;
};

/* Errors say what happened and what to do about it, never a raw failure code. */
function messageFor(state: PortalFormState, labels: PortalStatusLabels) {
  if (state.status === "saved") return {tone: "ok" as const, text: labels.saved};
  if (state.status !== "error") return null;
  if (state.code === "VALIDATION_FAILED" || state.code === "NOT_FOUND") {
    return {tone: "error" as const, text: labels.errorValidation};
  }
  if (state.code === "SESSION_INVALID" || state.code === "NO_LECTURER_PROFILE") {
    return {tone: "error" as const, text: labels.errorSession};
  }
  return {tone: "error" as const, text: labels.errorUnavailable};
}

export function PortalFormStatus({state, labels}: {state: PortalFormState; labels: PortalStatusLabels}) {
  const message = messageFor(state, labels);
  return (
    <p
      role="status"
      aria-live="polite"
      className={
        message === null
          ? "sr-only"
          : message.tone === "ok"
            ? "flex items-center gap-2 text-sm text-success"
            : "flex items-center gap-2 text-sm text-danger"
      }
    >
      {message === null ? null : (
        <>
          {message.tone === "ok" ? (
            <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          ) : (
            <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          )}
          {message.text}
        </>
      )}
    </p>
  );
}

export function PortalSubmitButton({
  pending,
  label,
  pendingLabel,
  variant = "primary",
  name,
  value,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "quiet";
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={
        variant === "primary"
          ? "rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px disabled:opacity-60"
          : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 disabled:opacity-60"
      }
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
