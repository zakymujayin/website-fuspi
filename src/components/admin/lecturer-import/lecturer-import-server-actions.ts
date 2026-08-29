"use server";

import {revalidatePath} from "next/cache";

import {provisionLecturerAccounts, type ProvisionedAccount} from "@/features/academic/lecturer-account-provisioning";
import {executeAcademicPeopleImport} from "@/features/academic/editor-import";
import {parseLecturerCsv, type LecturerCsvIssue} from "@/features/academic/lecturer-csv-import";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

const LOCALES = ["id", "en", "ar"] as const;
const MAX_CSV_BYTES = 1_048_576;

export type LecturerImportState =
  | {status: "idle"}
  | {status: "preview"; ready: number; issues: LecturerCsvIssue[]; csv: string}
  | {status: "imported"; created: number; accounts: ProvisionedAccount[]; skipped: {
      existingAccount: number; missingEmail: number; emailTaken: number;
    } | null}
  | {status: "error"; code: string};

async function programIdByCode() {
  const rows = await getPrismaClient().studyProgram.findMany({select: {id: true, code: true}});
  return new Map(rows.map(({code, id}) => [code, id]));
}

async function nextLecturerOrder() {
  const top = await getPrismaClient().lecturer.aggregate({_max: {order: true}});
  return (top._max.order ?? -1) + 1;
}

export async function importLecturersFromCsvAction(
  _prevState: LecturerImportState,
  form: FormData,
): Promise<LecturerImportState> {
  const session = await getRequestSession();
  const actor = session.ok ? session.session : null;
  if (!actor) return {status: "error", code: "SESSION_INVALID"};

  const csv = form.get("csv");
  if (typeof csv !== "string" || csv === "") return {status: "error", code: "FILE_REQUIRED"};
  /* Measured in bytes, not characters: a multi-byte name must not slip past a
     length check that only counts code units. */
  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) return {status: "error", code: "FILE_TOO_LARGE"};

  const commit = form.get("intent") === "commit";
  const provision = form.get("provision") === "on";

  let parsed;
  try {
    parsed = parseLecturerCsv(csv, await programIdByCode(), await nextLecturerOrder());
  } catch {
    return {status: "error", code: "UNAVAILABLE"};
  }
  if (!parsed.ok) return {status: "error", code: parsed.code};
  if (parsed.rows.length === 0) return {status: "preview", ready: 0, issues: parsed.issues, csv};
  if (!commit) return {status: "preview", ready: parsed.rows.length, issues: parsed.issues, csv};

  const prisma = getPrismaClient();
  const result = await executeAcademicPeopleImport(prisma, actor, {
    intent: "COMMIT",
    atomic: true,
    rows: parsed.rows,
  });

  if (!result.ok) return {status: "error", code: result.code};
  if (!("committed" in result) || !result.committed) {
    /* The backend downgrades a commit to a preview when a row conflicts with
       data already stored, so nothing was written. */
    return {status: "error", code: "IDENTITY_CONFLICT"};
  }

  const createdIds = result.rows.flatMap((row) => ("id" in row && row.id ? [row.id] : []));

  let accounts: ProvisionedAccount[] = [];
  let skipped: {existingAccount: number; missingEmail: number; emailTaken: number} | null = null;
  if (provision && createdIds.length > 0) {
    const provisioned = await provisionLecturerAccounts(prisma, actor, createdIds);
    if (provisioned.ok) {
      accounts = provisioned.created;
      skipped = {
        existingAccount: provisioned.skippedExistingAccount,
        missingEmail: provisioned.skippedMissingEmail,
        emailTaken: provisioned.skippedEmailTaken,
      };
    }
  }

  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/dosen`);
    revalidatePath(`/${locale}/admin/impor-dosen`);
  }

  return {status: "imported", created: createdIds.length, accounts, skipped};
}
