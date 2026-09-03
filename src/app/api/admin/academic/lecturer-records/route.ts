import {revalidatePath} from "next/cache";
import {z} from "zod";

import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";
import {
  commitTeachingScheduleImport,
  executeAdminLecturerAcademicCommand,
  lecturerAcademicHttpStatus,
  loadAdminLecturerAcademicRecords,
  parseTeachingScheduleCsv,
  previewTeachingScheduleImport,
} from "@/features/academic/lecturer-academic-records";
import {CmsIdentifierSchema} from "@/contracts/cms";

const MAX_JSON_BYTES = 2_097_152;

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

async function readJson(request: Request) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_JSON_BYTES || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes)) as unknown;
  } catch { return null; }
}

const ImportBodySchema = z.object({
  action: z.enum(["IMPORT_PREVIEW", "IMPORT_COMMIT"]),
  rows: z.unknown().optional(),
  csv: z.string().max(MAX_JSON_BYTES).optional(),
}).strict();

function importRows(body: z.infer<typeof ImportBodySchema>) {
  if (body.csv !== undefined) return parseTeachingScheduleCsv(body.csv);
  const rows = z.array(z.unknown()).safeParse(body.rows);
  return rows.success ? {rows: rows.data, issues: []} : {rows: [], issues: [{row: 1, message: "Rows must be an array."}]};
}

export async function GET(request: Request) {
  const lecturerId = CmsIdentifierSchema.safeParse(new URL(request.url).searchParams.get("lecturerId"));
  const session = await getRequestSession();
  const result = await loadAdminLecturerAcademicRecords(getPrismaClient(), session.ok ? session.session : null, lecturerId.success ? lecturerId.data : null);
  return json(result.ok ? result.data : result, lecturerAcademicHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) return json({ok: false, code: "CSRF_INVALID"}, 403);
  const body = await readJson(request);
  if (!body || typeof body !== "object") return json({ok: false, code: "REQUEST_INVALID"}, 400);
  const session = await getRequestSession();
  const actor = session.ok ? session.session : null;

  const action = "action" in body && typeof body.action === "string" ? body.action : "";
  if (action.startsWith("HKI_") || action.startsWith("TEACHING_")) {
    const result = await executeAdminLecturerAcademicCommand(getPrismaClient(), actor, body);
    if (result.ok) revalidatePublicPaths(body);
    return json(result, lecturerAcademicHttpStatus(result));
  }

  const parsedImport = ImportBodySchema.safeParse(body);
  if (!parsedImport.success) return json({ok: false, code: "REQUEST_INVALID"}, 400);
  const parsedRows = importRows(parsedImport.data);
  if (parsedRows.issues.length > 0) return json({ok: false, code: "VALIDATION_FAILED", issues: parsedRows.issues}, 400);
  const result = parsedImport.data.action === "IMPORT_PREVIEW"
    ? await previewTeachingScheduleImport(getPrismaClient(), actor, parsedRows.rows)
    : await commitTeachingScheduleImport(getPrismaClient(), actor, parsedRows.rows);
  if (result.ok && parsedImport.data.action === "IMPORT_COMMIT") revalidatePath("/id/dosen", "page");
  return json(result, lecturerAcademicHttpStatus(result));
}

function revalidatePublicPaths(body: object) {
  const lecturerId = "lecturerId" in body && typeof body.lecturerId === "string" ? body.lecturerId : null;
  if (!lecturerId) return;
  for (const locale of ["id", "en", "ar"] as const) {
    revalidatePath(`/${locale}/dosen/${lecturerId}`);
    revalidatePath(`/${locale}/dosen`, "page");
  }
}
