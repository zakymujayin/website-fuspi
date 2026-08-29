"use client";

import {CircleAlert, KeyRound} from "lucide-react";
import {useActionState} from "react";

import {
  submitComplaintAction,
  type SubmitState,
} from "@/components/public/complaint/complaint-server-actions";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Link} from "@/i18n/navigation";

export type ComplaintSubmitLabels = {
  category: string;
  subject: string;
  subjectHint: string;
  description: string;
  descriptionHint: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  ticketNumberLabel: string;
  tokenLabel: string;
  tokenWarning: string;
  trackLink: string;
  categories: ReadonlyArray<{value: string; label: string}>;
  errorCodes: Record<string, string>;
};

const INITIAL: SubmitState = {status: "idle"};

export function ComplaintSubmitForm({labels}: {labels: ComplaintSubmitLabels}) {
  const [state, action, pending] = useActionState(submitComplaintAction, INITIAL);

  if (state.status === "submitted") {
    return (
      <div className="max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-slate-900">{labels.successTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">{labels.successBody}</p>

        {/* The token is issued once and never shown again: losing it means losing
            access to the report, so it is given the loudest treatment on the page. */}
        <div className="mt-6 rounded-xl border-2 border-warning bg-warning-surface p-5">
          <p className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900">
            <KeyRound aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            {labels.tokenWarning}
          </p>
          <dl className="mt-4 space-y-3">
            <div>
              <dt className="text-xs text-slate-600 uppercase">{labels.ticketNumberLabel}</dt>
              <dd dir="ltr" className="mt-0.5 font-mono text-base font-semibold text-slate-900">
                {state.ticketNumber}
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
          href="/pengaduan/lacak"
          className="mt-6 inline-block text-sm font-medium text-royal-600 underline-offset-2 hover:underline"
        >
          {labels.trackLink}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="max-w-2xl">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="category">{labels.category}</FieldLabel>
          <select
            id="category"
            name="category"
            required
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500"
          >
            <option value="" disabled>{labels.category}</option>
            {labels.categories.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="subject">{labels.subject}</FieldLabel>
          <Input id="subject" name="subject" required minLength={2} maxLength={500} dir="auto" />
          <FieldDescription>{labels.subjectHint}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="description">{labels.description}</FieldLabel>
          <Textarea id="description" name="description" required minLength={10} maxLength={100000} rows={8} dir="auto" />
          <FieldDescription>{labels.descriptionHint}</FieldDescription>
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
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
