import type {Metadata} from "next";
import {redirect} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {LecturerImportForm, type LecturerImportLabels} from "@/components/admin/lecturer-import/lecturer-import-form";
import {LECTURER_CSV_COLUMNS} from "@/features/academic/lecturer-csv-import";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getRequestSession} from "@/lib/auth/runtime/request-session";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "AdminLecturerImport"});
  return {title: t("title"), robots: {index: false, follow: false}};
}

export default async function LecturerImportPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const appLocale = parseAppLocale(locale);

  /* Creating accounts is an ADMIN capability, so the page refuses anyone else
     rather than relying on the surrounding layout. */
  const session = await getRequestSession();
  if (!session.ok || session.session.role !== "ADMIN") redirect(`/${appLocale}/admin`);

  const t = await getTranslations("AdminLecturerImport");

  const labels = {
    fileLabel: t("fileLabel"),
    fileHint: t("fileHint"),
    columnsLabel: t("columnsLabel"),
    preview: t("preview"),
    previewing: t("previewing"),
    commit: t("commit"),
    committing: t("committing"),
    provision: t("provision"),
    provisionHint: t("provisionHint"),
    issueTitle: t("issueTitle"),
    issueRow: t("issueRow"),
    issueColumn: t("issueColumn"),
    issueProblem: t("issueProblem"),
    nothingReady: t("nothingReady"),
    credentialsTitle: t("credentialsTitle"),
    credentialsWarning: t("credentialsWarning"),
    credentialName: t("credentialName"),
    credentialEmail: t("credentialEmail"),
    credentialPassword: t("credentialPassword"),
    noAccounts: t("noAccounts"),
    issueCodes: {
      UNSAFE_CELL: t("issueUnsafeCell"),
      NAME_REQUIRED: t("issueNameRequired"),
      UNKNOWN_PROGRAM: t("issueUnknownProgram"),
      DUPLICATE_SLUG: t("issueDuplicateSlug"),
      INVALID_VALUE: t("issueInvalidValue"),
    },
    errorCodes: {
      EMPTY: t("errorEmpty"),
      TOO_MANY_ROWS: t("errorTooManyRows"),
      MISSING_NAME_COLUMN: t("errorMissingNameColumn"),
      MALFORMED: t("errorMalformed"),
      FILE_REQUIRED: t("errorFileRequired"),
      FILE_TOO_LARGE: t("errorFileTooLarge"),
      IDENTITY_CONFLICT: t("errorIdentityConflict"),
      SESSION_INVALID: t("errorSession"),
      UNAVAILABLE: t("errorUnavailable"),
    },
  } satisfies LecturerImportLabels;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{t("description")}</p>
      <div className="mt-8">
        <LecturerImportForm labels={labels} columns={LECTURER_CSV_COLUMNS} />
      </div>
    </div>
  );
}
