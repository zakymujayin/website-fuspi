import {
  academicEditorImportHttpStatus,
  getAcademicEditorDetail,
  normalizeAcademicEditorSearchParams,
} from "@/features/academic/editor-import";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(request: Request) {
  const query = normalizeAcademicEditorSearchParams(new URL(request.url).searchParams);
  if (!query.ok) return json(query, academicEditorImportHttpStatus(query));
  const session = await getRequestSession();
  const result = await getAcademicEditorDetail(
    getPrismaClient(),
    session.ok ? session.session : null,
    query.data,
  );
  return json(result.ok ? result.data : result, academicEditorImportHttpStatus(result));
}
