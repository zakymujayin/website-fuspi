import {z} from "zod";

import {
  AdminLecturerAcademicCommandSchema,
  LecturerAcademicFailureCodeSchema,
  LecturerAcademicMutationResultSchema,
  LecturerTeachingImportRowSchema,
  type AdminLecturerAcademicCommand,
  type LecturerHkiInput,
  type LecturerTeachingImportRow,
  type LecturerTeachingInput,
} from "@/contracts/lecturer-academic";
import {TrustedAdminFoundationActorSchema} from "@/contracts/admin-foundation";
import {CmsIdentifierSchema} from "@/contracts/cms";
import type {Prisma} from "@/generated/prisma/client";
import type {createPrismaClient} from "@/lib/db/client";

type LecturerAcademicDatabase = ReturnType<typeof createPrismaClient>;

const CsvHeaderAliases: Record<string, string> = {
  lecturerid: "lecturerId", iddosen: "lecturerId", idpengampu: "lecturerId",
  nidn: "nidn", kode: "courseCode", "kodematakuliah": "courseCode", kodemk: "courseCode",
  coursecode: "courseCode", matakuliah: "courseName", namamatakuliah: "courseName", course: "courseName",
  prodi: "programCode", program: "programCode", programcode: "programCode", sks: "credits", credits: "credits",
  tahunawal: "academicYearStart", tahunajaranawal: "academicYearStart", academicyearstart: "academicYearStart",
  tahunakhir: "academicYearEnd", tahunajaranakhir: "academicYearEnd", academicyearend: "academicYearEnd",
  semester: "semester", term: "term", periode: "term",
};

function actorOrNull(rawActor: unknown, now: Date) {
  const actor = TrustedAdminFoundationActorSchema.safeParse(rawActor);
  return actor.success && actor.data.expiresAt > now ? actor.data : null;
}

function sorted<T extends {order: number}>(rows: T[]) {
  return [...rows].sort((a, b) => a.order - b.order);
}

export type AdminLecturerAcademicRecords = {
  hki: Array<{
    id: string;
    title: string;
    type: string;
    registrationNumber: string | null;
    year: number | null;
    url: string | null;
    order: number;
  }>;
  teaching: Array<{
    id: string;
    courseCode: string;
    courseName: string;
    programCode: string;
    credits: number;
    academicYearStart: number;
    academicYearEnd: number;
    term: string;
    semester: number;
    order: number;
  }>;
};

export async function loadAdminLecturerAcademicRecords(
  prisma: LecturerAcademicDatabase,
  rawActor: unknown,
  lecturerId: unknown,
  now = new Date(),
) {
  const actor = actorOrNull(rawActor, now);
  const id = CmsIdentifierSchema.safeParse(lecturerId);
  if (!actor) return {ok: false as const, code: "SESSION_INVALID" as const};
  if (!id.success) return {ok: false as const, code: "NOT_FOUND" as const};
  try {
    const row = await prisma.lecturer.findUnique({
      where: {id: id.data},
      select: {
        intellectualProperties: {select: {id: true, title: true, type: true, registrationNumber: true, year: true, url: true, order: true}},
        teachingAssignments: {select: {id: true, courseCode: true, courseName: true, programCode: true, credits: true, academicYearStart: true, academicYearEnd: true, term: true, semester: true, order: true}},
      },
    });
    if (!row) return {ok: false as const, code: "NOT_FOUND" as const};
    return {ok: true as const, data: {hki: sorted(row.intellectualProperties), teaching: sorted(row.teachingAssignments)}};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

async function nextOrder(tx: Prisma.TransactionClient, lecturerId: string, kind: "hki" | "teaching") {
  if (kind === "hki") {
    const result = await tx.lecturerIntellectualProperty.aggregate({where: {lecturerId}, _max: {order: true}});
    return (result._max.order ?? -1) + 1;
  }
  const result = await tx.lecturerTeachingAssignment.aggregate({where: {lecturerId}, _max: {order: true}});
  return (result._max.order ?? -1) + 1;
}

function hkiWrite(payload: LecturerHkiInput) {
  return {title: payload.title, type: payload.type, registrationNumber: payload.registrationNumber, year: payload.year, url: payload.url};
}

function teachingWrite(payload: LecturerTeachingInput) {
  return {
    courseCode: payload.courseCode, courseName: payload.courseName, programCode: payload.programCode,
    credits: payload.credits, academicYearStart: payload.academicYearStart, academicYearEnd: payload.academicYearEnd,
    term: payload.term, semester: payload.semester,
  };
}

export async function executeAdminLecturerAcademicCommand(
  prisma: LecturerAcademicDatabase,
  rawActor: unknown,
  rawCommand: unknown,
  now = new Date(),
): Promise<z.infer<typeof LecturerAcademicMutationResultSchema>> {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false, code: "SESSION_INVALID"};
  const parsed = AdminLecturerAcademicCommandSchema.safeParse(rawCommand);
  if (!parsed.success) return {ok: false, code: "VALIDATION_FAILED"};
  const command: AdminLecturerAcademicCommand = parsed.data;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const lecturer = await tx.lecturer.findUnique({where: {id: command.lecturerId}, select: {id: true}});
      if (!lecturer) return {ok: false as const, code: "NOT_FOUND" as const};

      if (command.action === "HKI_CREATE") {
        const row = await tx.lecturerIntellectualProperty.create({data: {lecturerId: command.lecturerId, order: await nextOrder(tx, command.lecturerId, "hki"), ...hkiWrite(command.payload)}, select: {id: true}});
        await tx.activityLog.create({data: {actorId: actor.userId, action: "CREATE", resourceType: "LecturerIntellectualProperty", resourceId: row.id}});
        return {ok: true as const, action: command.action, id: row.id};
      }
      if (command.action === "HKI_UPDATE") {
        const result = await tx.lecturerIntellectualProperty.updateMany({where: {id: command.id, lecturerId: command.lecturerId}, data: hkiWrite(command.payload)});
        if (result.count === 0) return {ok: false as const, code: "NOT_FOUND" as const};
        await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: "LecturerIntellectualProperty", resourceId: command.id}});
        return {ok: true as const, action: command.action, id: command.id};
      }
      if (command.action === "HKI_DELETE") {
        const result = await tx.lecturerIntellectualProperty.deleteMany({where: {id: command.id, lecturerId: command.lecturerId}});
        if (result.count === 0) return {ok: false as const, code: "NOT_FOUND" as const};
        await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: "LecturerIntellectualProperty", resourceId: command.id, metadata: {operation: "DELETE"}}});
        return {ok: true as const, action: command.action, id: command.id};
      }
      if (command.action === "TEACHING_CREATE") {
        const row = await tx.lecturerTeachingAssignment.create({data: {lecturerId: command.lecturerId, order: await nextOrder(tx, command.lecturerId, "teaching"), ...teachingWrite(command.payload)}, select: {id: true}});
        await tx.activityLog.create({data: {actorId: actor.userId, action: "CREATE", resourceType: "LecturerTeachingAssignment", resourceId: row.id}});
        return {ok: true as const, action: command.action, id: row.id};
      }
      if (command.action === "TEACHING_UPDATE") {
        const result = await tx.lecturerTeachingAssignment.updateMany({where: {id: command.id, lecturerId: command.lecturerId}, data: teachingWrite(command.payload)});
        if (result.count === 0) return {ok: false as const, code: "NOT_FOUND" as const};
        await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: "LecturerTeachingAssignment", resourceId: command.id}});
        return {ok: true as const, action: command.action, id: command.id};
      }
      const result = await tx.lecturerTeachingAssignment.deleteMany({where: {id: command.id, lecturerId: command.lecturerId}});
      if (result.count === 0) return {ok: false as const, code: "NOT_FOUND" as const};
      await tx.activityLog.create({data: {actorId: actor.userId, action: "UPDATE", resourceType: "LecturerTeachingAssignment", resourceId: command.id, metadata: {operation: "DELETE"}}});
      return {ok: true as const, action: command.action, id: command.id};
    }, {isolationLevel: "Serializable"});
    const parsedResult = LecturerAcademicMutationResultSchema.safeParse(result);
    return parsedResult.success ? parsedResult.data : {ok: false, code: "UNAVAILABLE"};
  } catch {
    return {ok: false, code: "UNAVAILABLE"};
  }
}

function splitCsvLine(line: string) {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const character = line[i];
    if (character === '"') {
      if (quoted && line[i + 1] === '"') { field += '"'; i += 1; } else quoted = !quoted;
    } else if (character === "," && !quoted) { fields.push(field.trim()); field = ""; } else field += character;
  }
  fields.push(field.trim());
  return fields;
}

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/[._-]+/gu, "").replace(/\s+/gu, "");
}

function numberValue(value: string) {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function termValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "ganjil" || normalized === "odd" ? "GANJIL" : normalized === "genap" || normalized === "even" ? "GENAP" : value.trim();
}

export type TeachingCsvIssue = {row: number; message: string};

export function parseTeachingScheduleCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/u, "").split(/\r?\n/u).filter((line) => line.trim() !== "");
  if (lines.length < 2) return {rows: [] as LecturerTeachingImportRow[], issues: [{row: 1, message: "CSV must contain a header and at least one row."}]};
  const headers = splitCsvLine(lines[0]).map((value) => CsvHeaderAliases[headerKey(value)] ?? "");
  const issues: TeachingCsvIssue[] = [];
  const rows: LecturerTeachingImportRow[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = splitCsvLine(lines[index]);
    const raw: Record<string, unknown> = {};
    headers.forEach((key, column) => { if (key) raw[key] = values[column] ?? ""; });
    raw.lecturerId = raw.lecturerId ? String(raw.lecturerId) : null;
    raw.nidn = raw.nidn ? String(raw.nidn) : null;
    raw.credits = numberValue(String(raw.credits ?? ""));
    raw.academicYearStart = numberValue(String(raw.academicYearStart ?? ""));
    raw.academicYearEnd = numberValue(String(raw.academicYearEnd ?? ""));
    raw.semester = numberValue(String(raw.semester ?? ""));
    raw.term = termValue(String(raw.term ?? ""));
    const parsed = LecturerTeachingImportRowSchema.safeParse(raw);
    if (parsed.success) rows.push(parsed.data); else issues.push({row: index + 1, message: "Row data is invalid. Check lecturer ID/NIDN, course, program, years, term, and semester."});
  }
  return {rows, issues};
}

type ResolvedTeachingRow = LecturerTeachingInput & {lecturerId: string; row: number};

async function resolveTeachingRows(prisma: LecturerAcademicDatabase, rows: LecturerTeachingImportRow[]) {
  const resolved: ResolvedTeachingRow[] = [];
  const issues: TeachingCsvIssue[] = [];
  for (const [index, row] of rows.entries()) {
    const lecturer = row.lecturerId
      ? await prisma.lecturer.findUnique({where: {id: row.lecturerId}, select: {id: true, nidn: true}})
      : row.nidn ? await prisma.lecturer.findUnique({where: {nidn: row.nidn}, select: {id: true, nidn: true}}) : null;
    if (!lecturer) { issues.push({row: index + 2, message: "Lecturer was not found by the supplied stable identifier."}); continue; }
    if (row.lecturerId && row.nidn && lecturer.nidn !== row.nidn) { issues.push({row: index + 2, message: "Lecturer ID and NIDN refer to different records."}); continue; }
    resolved.push({...row, lecturerId: lecturer.id, row: index + 2});
  }
  return {resolved, issues};
}

export async function previewTeachingScheduleImport(prisma: LecturerAcademicDatabase, rawActor: unknown, rows: unknown, now = new Date()) {
  if (!actorOrNull(rawActor, now)) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = z.array(LecturerTeachingImportRowSchema).min(1).max(5_000).safeParse(rows);
  if (!parsed.success) return {ok: false as const, code: "VALIDATION_FAILED" as const};
  const {resolved, issues} = await resolveTeachingRows(prisma, parsed.data);
  const seen = new Set<string>();
  let validRows = 0;
  for (const row of resolved) {
    const key = [row.lecturerId, row.courseCode, row.academicYearStart, row.academicYearEnd, row.term, row.semester].join("|");
    if (seen.has(key)) issues.push({row: row.row, message: "Duplicate assignment in the uploaded file."});
    else { seen.add(key); validRows += 1; }
  }
  return {ok: true as const, data: {validRows, totalRows: parsed.data.length, issues}};
}

export async function commitTeachingScheduleImport(prisma: LecturerAcademicDatabase, rawActor: unknown, rows: unknown, now = new Date()) {
  const actor = actorOrNull(rawActor, now);
  if (!actor) return {ok: false as const, code: "SESSION_INVALID" as const};
  const parsed = z.array(LecturerTeachingImportRowSchema).min(1).max(5_000).safeParse(rows);
  if (!parsed.success) return {ok: false as const, code: "VALIDATION_FAILED" as const};
  const {resolved, issues} = await resolveTeachingRows(prisma, parsed.data);
  if (issues.length > 0) return {ok: false as const, code: "VALIDATION_FAILED" as const, issues};
  try {
    await prisma.$transaction(async (tx) => {
      for (const row of resolved) {
        await tx.lecturerTeachingAssignment.upsert({
          where: {lecturerId_courseCode_academicYearStart_academicYearEnd_term_semester: {
            lecturerId: row.lecturerId, courseCode: row.courseCode, academicYearStart: row.academicYearStart,
            academicYearEnd: row.academicYearEnd, term: row.term, semester: row.semester,
          }},
          create: {lecturerId: row.lecturerId, order: 0, ...teachingWrite(row)},
          update: teachingWrite(row),
        });
      }
      await tx.activityLog.create({data: {actorId: actor.userId, action: "CREATE", resourceType: "LecturerTeachingAssignment", metadata: {operation: "IMPORT", rowCount: resolved.length}}});
    }, {isolationLevel: "Serializable"});
    return {ok: true as const, imported: resolved.length};
  } catch {
    return {ok: false as const, code: "UNAVAILABLE" as const};
  }
}

export function lecturerAcademicHttpStatus(result: {ok: boolean; code?: z.infer<typeof LecturerAcademicFailureCodeSchema>}) {
  if (result.ok) return 200;
  if (result.code === "SESSION_INVALID") return 401;
  if (result.code === "CSRF_INVALID") return 403;
  if (result.code === "NOT_FOUND" || result.code === "LECTURER_NOT_FOUND") return 404;
  if (result.code === "UNAVAILABLE") return 503;
  return 400;
}
