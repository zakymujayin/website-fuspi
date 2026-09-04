import Papa from "papaparse";
import {readSheet} from "read-excel-file/node";

import {LecturerInputSchema} from "@/contracts/academic";
import {AcademicImportSafeCellSchema} from "@/contracts/academic-editor";

export const LECTURER_CSV_COLUMNS = [
  "nama", "slug", "nidn", "nip", "orcid", "email",
  "telepon", "prodi", "jabatan", "keahlian", "scholar", "sinta",
] as const;

export const LECTURER_CSV_TEMPLATE = `${LECTURER_CSV_COLUMNS.join(",")}\n`;

/* The contract caps a row number at 500 and line 1 is the header, so 499
   records is the most that can be numbered. */
const MAX_ROWS = 499;

export type LecturerCsvIssueCode =
  | "UNSAFE_CELL"
  | "NAME_REQUIRED"
  | "UNKNOWN_PROGRAM"
  | "DUPLICATE_SLUG"
  | "INVALID_VALUE";

export type LecturerCsvIssue = {
  rowNumber: number;
  column: string;
  code: LecturerCsvIssueCode;
};

export type LecturerCsvRow = {
  rowNumber: number;
  resource: "LECTURER";
  payload: ReturnType<typeof LecturerInputSchema.parse>;
};

export type LecturerCsvParseResult =
  | {ok: true; rows: LecturerCsvRow[]; issues: LecturerCsvIssue[]; skipped: number}
  | {ok: false; code: "EMPTY" | "TOO_MANY_ROWS" | "MISSING_NAME_COLUMN" | "MALFORMED"};

export type LecturerImportFile = Readonly<{
  bytes: Uint8Array;
  filename: string;
  declaredMime: string;
}>;

/* Phone numbers legitimately open with "+", which the formula guard rejects.
   The column is exempt because `PhoneSchema` already narrows it to an optional
   leading "+" followed by digits, spaces, parentheses and hyphens, a shape that
   cannot carry a formula payload. */
const FORMULA_GUARD_EXEMPT = new Set(["telepon"]);

/* Spreadsheet cells beginning with a formula prefix are refused rather than
   escaped: the file is data the faculty typed, and a cell that looks like a
   formula is a mistake worth showing rather than silently rewriting. The
   contract already defined this guard; the import path had never applied it. */
function isSafeCell(column: string, value: string): boolean {
  if (FORMULA_GUARD_EXEMPT.has(column)) return true;
  return AcademicImportSafeCellSchema.safeParse(value).success;
}

export function slugifyName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 191);
}

function cell(row: Record<string, string>, key: string): string {
  return (row[key] ?? "").trim();
}

function orNull(value: string): string | null {
  return value === "" ? null : value;
}

function externalLink(value: string) {
  return value === "" ? null : {kind: "EXTERNAL" as const, href: value};
}

/**
 * Turns an uploaded CSV into import rows the existing academic import backend
 * already understands. Values are validated per row against the shared
 * `LecturerInputSchema`, so a single bad cell reports its own row and column
 * instead of rejecting the whole file.
 */
export function parseLecturerCsv(
  text: string,
  programIdByCode: ReadonlyMap<string, string>,
  /* Numbering continues past what is already stored. Restarting at zero on every
     batch left imported lecturers sharing an `order` with existing ones. */
  orderOffset = 0,
): LecturerCsvParseResult {
  /* Checked before parsing: an empty upload is empty, not malformed, and the
     delimiter sniffer would otherwise report it as a broken file. */
  if (text.trim() === "") return {ok: false, code: "EMPTY"};

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.some((error) => error.type === "Delimiter" || error.type === "Quotes")) {
    return {ok: false, code: "MALFORMED"};
  }
  const records = parsed.data.filter((record) =>
    Object.values(record).some((value) => (value ?? "").trim() !== ""),
  );
  if (records.length === 0) return {ok: false, code: "EMPTY"};
  if (records.length > MAX_ROWS) return {ok: false, code: "TOO_MANY_ROWS"};
  if (!(parsed.meta.fields ?? []).includes("nama")) return {ok: false, code: "MISSING_NAME_COLUMN"};

  return parseLecturerRecords(records, programIdByCode, orderOffset);
}

function parseLecturerRecords(
  records: Record<string, string>[],
  programIdByCode: ReadonlyMap<string, string>,
  orderOffset: number,
): LecturerCsvParseResult {
  const rows: LecturerCsvRow[] = [];
  const issues: LecturerCsvIssue[] = [];
  const seenSlugs = new Set<string>();

  records.forEach((record, index) => {
    /* Row 1 is the header, so the first record the person sees is row 2. */
    const rowNumber = index + 2;

    for (const column of Object.keys(record)) {
      if (!isSafeCell(column, cell(record, column))) {
        issues.push({rowNumber, column, code: "UNSAFE_CELL"});
      }
    }
    if (issues.some((issue) => issue.rowNumber === rowNumber)) return;

    const name = cell(record, "nama");
    if (name === "") {
      issues.push({rowNumber, column: "nama", code: "NAME_REQUIRED"});
      return;
    }

    const programCode = cell(record, "prodi").toUpperCase();
    if (programCode !== "" && !programIdByCode.has(programCode)) {
      issues.push({rowNumber, column: "prodi", code: "UNKNOWN_PROGRAM"});
      return;
    }

    const slug = orNull(cell(record, "slug")) ?? slugifyName(name);
    if (seenSlugs.has(slug)) {
      issues.push({rowNumber, column: "slug", code: "DUPLICATE_SLUG"});
      return;
    }

    const candidate = {
      name,
      slug,
      nidn: orNull(cell(record, "nidn")),
      nip: orNull(cell(record, "nip")),
      orcid: orNull(cell(record, "orcid")),
      googleScholarUrl: externalLink(cell(record, "scholar")),
      sintaUrl: externalLink(cell(record, "sinta")),
      scopusUrl: null,
      linkedinUrl: null,
      instagramUrl: null,
      twitterUrl: null,
      email: orNull(cell(record, "email")),
      phone: orNull(cell(record, "telepon")),
      photoMediaId: null,
      cvMediaId: null,
      studyProgramId: programCode === "" ? null : programIdByCode.get(programCode) ?? null,
      order: orderOffset + rows.length,
      isActive: true,
      translations: {
        id: {
          position: orNull(cell(record, "jabatan")),
          expertise: orNull(cell(record, "keahlian")),
          bio: null,
          officeHours: null,
          officeLocation: null,
          quote: null,
        },
      },
    };

    const validated = LecturerInputSchema.safeParse(candidate);
    if (!validated.success) {
      const first = validated.error.issues[0];
      issues.push({
        rowNumber,
        column: String(first?.path[0] ?? "nama"),
        code: "INVALID_VALUE",
      });
      return;
    }

    seenSlugs.add(slug);
    rows.push({rowNumber, resource: "LECTURER", payload: validated.data});
  });

  return {ok: true, rows, issues, skipped: records.length - rows.length};
}

function isXlsxUpload(file: LecturerImportFile) {
  const name = file.filename.toLowerCase();
  const mime = file.declaredMime.toLowerCase();
  return name.endsWith(".xlsx")
    || mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function isCsvUpload(file: LecturerImportFile) {
  const name = file.filename.toLowerCase();
  const mime = file.declaredMime.toLowerCase();
  return name.endsWith(".csv") || mime === "text/csv" || mime === "application/csv";
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

export async function parseLecturerImportFile(
  file: LecturerImportFile,
  programIdByCode: ReadonlyMap<string, string>,
  orderOffset = 0,
): Promise<LecturerCsvParseResult> {
  if (file.bytes.byteLength < 1) return {ok: false, code: "EMPTY"};
  if (isCsvUpload(file)) {
    try {
      return parseLecturerCsv(
        new TextDecoder("utf-8", {fatal: true}).decode(file.bytes),
        programIdByCode,
        orderOffset,
      );
    } catch {
      return {ok: false, code: "MALFORMED"};
    }
  }
  if (!isXlsxUpload(file)) return {ok: false, code: "MALFORMED"};

  try {
    const rows = await readSheet(Buffer.from(file.bytes));
    if (rows.length === 0) return {ok: false, code: "EMPTY"};
    const fields = rows[0]!.map((value) => cellToString(value).trim().toLowerCase());
    if (!fields.includes("nama")) return {ok: false, code: "MISSING_NAME_COLUMN"};
    const records = rows.slice(1).map((row) => Object.fromEntries(
      fields.map((field, index) => [field, cellToString(row[index]).trim()]),
    ) as Record<string, string>).filter((record) =>
      Object.values(record).some((value) => value.trim() !== ""),
    );
    if (records.length === 0) return {ok: false, code: "EMPTY"};
    if (records.length > MAX_ROWS) return {ok: false, code: "TOO_MANY_ROWS"};
    return parseLecturerRecords(records, programIdByCode, orderOffset);
  } catch {
    return {ok: false, code: "MALFORMED"};
  }
}
