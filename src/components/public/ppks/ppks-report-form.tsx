"use client";

import {CircleAlert, KeyRound} from "lucide-react";
import {useActionState} from "react";

import {
  submitPpksReportAction,
  type PpksSubmitState,
} from "@/components/public/ppks/ppks-server-actions";
import {Field, FieldDescription, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Link} from "@/i18n/navigation";

export type PpksFormLabels = {
  reporterRole: string;
  reporterRoleHint: string;
  roleVictim: string;
  roleWitness: string;
  roleThirdParty: string;
  rolePreferNot: string;
  subject: string;
  subjectHint: string;
  description: string;
  descriptionHint: string;
  identity: string;
  identityHint: string;
  attachments: string;
  attachmentsHint: string;
  danger: string;
  dangerHint: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  ticketNumberLabel: string;
  tokenLabel: string;
  tokenWarning: string;
  trackLink: string;
  errorCodes: Record<string, string>;
};

const INITIAL: PpksSubmitState = {status: "idle"};

export function PpksReportForm({labels}: {labels: PpksFormLabels}) {
  const [state, action, pending] = useActionState(submitPpksReportAction, INITIAL);

  if (state.status === "submitted") {
    return (
      <div className="max-w-2xl">
        <h2 className="font-display text-lg font-semibold text-slate-900">{labels.successTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">{labels.successBody}</p>

        {/* A report may be filed with no name and no email, so this token is the
            only thread back to it. docs/14 B requires the warning to be plain. */}
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
    <form
      action={action}
      className="max-w-2xl overflow-hidden rounded-2xl border border-slate-200 border-t-4 border-t-royal-500 bg-white p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] sm:p-8"
    >
      <FieldGroup>
        {/* Nothing here is required except the account of what happened.
            docs/14 D2 forbids compelling a name, a student number, or an email. */}
        <Field>
          <FieldLabel htmlFor="reporterRole">{labels.reporterRole}</FieldLabel>
          <select
            id="reporterRole"
            name="reporterRole"
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500"
          >
            <option value="">{labels.rolePreferNot}</option>
            <option value="KORBAN">{labels.roleVictim}</option>
            <option value="SAKSI">{labels.roleWitness}</option>
            <option value="PIHAK_KETIGA">{labels.roleThirdParty}</option>
          </select>
          <FieldDescription>{labels.reporterRoleHint}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="subject">{labels.subject}</FieldLabel>
          <Input id="subject" name="subject" maxLength={500} dir="auto" />
          <FieldDescription>{labels.subjectHint}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="description">{labels.description}</FieldLabel>
          <Textarea
            id="description"
            name="description"
            required
            minLength={10}
            maxLength={100000}
            rows={10}
            dir="auto"
          />
          <FieldDescription>{labels.descriptionHint}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="reporterIdentity">{labels.identity}</FieldLabel>
          <Textarea id="reporterIdentity" name="reporterIdentity" maxLength={2000} rows={3} dir="auto" />
          <FieldDescription>{labels.identityHint}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="attachments">{labels.attachments}</FieldLabel>
          <Input
            id="attachments"
            name="attachments"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="h-auto min-h-14 cursor-pointer rounded-xl border-2 border-dashed border-royal-200 bg-royal-50/40 px-3 py-2.5 text-sm text-slate-600 transition-colors file:me-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-royal-500 file:px-4 file:py-2 file:font-semibold file:text-white hover:border-royal-400 hover:bg-royal-50/70 hover:file:bg-royal-600 focus-visible:border-royal-500 focus-visible:ring-3 focus-visible:ring-royal-500/25"
          />
          <FieldDescription>{labels.attachmentsHint}</FieldDescription>
        </Field>
      </FieldGroup>

      <label className="mt-6 flex items-start gap-3 rounded-xl border border-danger bg-danger-surface p-4 text-sm text-slate-900">
        <input type="checkbox" name="immediateDanger" className="mt-0.5 size-4 rounded border-slate-400" />
        <span>
          {labels.danger}
          <span className="mt-0.5 block text-xs text-slate-700">{labels.dangerHint}</span>
        </span>
      </label>

      {state.status === "error" ? (
        <p role="alert" className="mt-6 flex items-start gap-2 rounded-lg bg-danger-surface px-4 py-3 text-sm text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
          {labels.errorCodes[state.code] ?? labels.errorCodes.UNAVAILABLE}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-8 rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
