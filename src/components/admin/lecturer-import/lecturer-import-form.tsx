"use client";

import {CircleAlert, CircleCheck, Upload} from "lucide-react";
import {useTranslations} from "next-intl";
import {useActionState, useState} from "react";

import {
  importLecturersFromCsvAction,
  type LecturerImportState,
} from "@/components/admin/lecturer-import/lecturer-import-server-actions";

export type LecturerImportLabels = {
  fileLabel: string;
  fileHint: string;
  columnsLabel: string;
  preview: string;
  previewing: string;
  commit: string;
  committing: string;
  provision: string;
  provisionHint: string;
  issueTitle: string;
  issueRow: string;
  issueColumn: string;
  issueProblem: string;
  nothingReady: string;
  credentialsTitle: string;
  credentialsWarning: string;
  credentialName: string;
  credentialEmail: string;
  credentialPassword: string;
  noAccounts: string;
  issueCodes: Record<string, string>;
  errorCodes: Record<string, string>;
};

const INITIAL: LecturerImportState = {status: "idle"};

export function LecturerImportForm({
  labels,
  columns,
}: {
  labels: LecturerImportLabels;
  columns: readonly string[];
}) {
  const [state, action, pending] = useActionState(importLecturersFromCsvAction, INITIAL);
  /* The counts are only known once the action has run, so these two strings are
     resolved here where the ICU argument can actually be supplied. */
  const t = useTranslations("AdminLecturerImport");
  const [fileName, setFileName] = useState("");

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
  }

  const ready = state.status === "preview" ? state.ready : 0;

  return (
    <div className="max-w-4xl space-y-8">
      <form action={action} className="space-y-5">
        <div>
          <label htmlFor="lecturer-csv" className="block text-sm font-medium text-slate-700">
            {labels.fileLabel}
          </label>
          <input
            id="lecturer-csv"
            name="file"
            type="file"
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onFileChange}
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 file:me-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500"
          />
          <p className="mt-2 text-sm text-slate-500">{labels.fileHint}</p>
          <p className="mt-1 text-xs text-slate-400">
            {labels.columnsLabel}: <code className="font-mono">{columns.join(", ")}</code>
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" name="provision" defaultChecked className="mt-0.5 size-4 rounded border-slate-300" />
          <span>
            {labels.provision}
            <span className="block text-xs text-slate-500">{labels.provisionHint}</span>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="preview"
            disabled={pending || (fileName === "" && state.status !== "preview")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 disabled:opacity-60"
          >
            <Upload aria-hidden data-icon className="size-4" strokeWidth={1.5} />
            {pending ? labels.previewing : labels.preview}
          </button>
          {ready > 0 ? (
            <button
              type="submit"
              name="intent"
              value="commit"
              disabled={pending}
              className="rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px disabled:opacity-60"
            >
              {pending ? labels.committing : labels.commit}
            </button>
          ) : null}
          {fileName === "" ? null : <span className="text-sm text-slate-500">{fileName}</span>}
        </div>
      </form>

      {state.status === "error" ? (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-danger-surface px-4 py-3 text-sm text-danger">
          <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
          {labels.errorCodes[state.code] ?? labels.errorCodes.UNAVAILABLE}
        </p>
      ) : null}

      {state.status === "preview" ? (
        <section aria-live="polite">
          <p className={ready > 0 ? "text-sm text-slate-700" : "text-sm text-slate-500"}>
            {ready > 0 ? t("readyCount", {count: ready}) : labels.nothingReady}
          </p>
          {state.issues.length > 0 ? (
            <div className="mt-4">
              <h2 className="font-display text-sm font-semibold text-slate-900">{labels.issueTitle}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-start text-xs text-slate-500 uppercase">
                      <th scope="col" className="py-2 pe-4 text-start font-medium">{labels.issueRow}</th>
                      <th scope="col" className="py-2 pe-4 text-start font-medium">{labels.issueColumn}</th>
                      <th scope="col" className="py-2 text-start font-medium">{labels.issueProblem}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.issues.map((issue) => (
                      <tr key={`${issue.rowNumber}-${issue.column}-${issue.code}`} className="border-b border-slate-100">
                        <td className="py-2 pe-4 font-mono text-slate-500">{issue.rowNumber}</td>
                        <td className="py-2 pe-4 font-mono text-slate-700">{issue.column}</td>
                        <td className="py-2 text-slate-700">{labels.issueCodes[issue.code] ?? issue.code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {state.status === "imported" ? (
        <section aria-live="polite" className="space-y-5">
          <p className="flex items-center gap-2 text-sm text-success">
            <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            {t("importedTitle", {count: state.created})}
          </p>

          {state.accounts.length > 0 ? (
            <div className="rounded-xl border border-warning bg-warning-surface p-5">
              <h2 className="font-display text-sm font-semibold text-slate-900">{labels.credentialsTitle}</h2>
              <p className="mt-1 text-sm text-slate-700">{labels.credentialsWarning}</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 text-xs text-slate-600 uppercase">
                      <th scope="col" className="py-2 pe-4 text-start font-medium">{labels.credentialName}</th>
                      <th scope="col" className="py-2 pe-4 text-start font-medium">{labels.credentialEmail}</th>
                      <th scope="col" className="py-2 text-start font-medium">{labels.credentialPassword}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.accounts.map((account) => (
                      <tr key={account.lecturerId} className="border-b border-slate-200/70">
                        <td dir="auto" className="py-2 pe-4 text-slate-900">{account.name}</td>
                        <td dir="ltr" className="py-2 pe-4 font-mono text-slate-700">{account.email}</td>
                        <td dir="ltr" className="py-2 font-mono font-semibold text-slate-900">{account.temporaryPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{labels.noAccounts}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
