import {revalidatePath} from "next/cache";

import {
  academicPeopleHttpStatus,
  executeAcademicPeopleCommand,
  listAcademicPeople,
  normalizeAcademicPeopleSearchParams,
} from "@/features/academic/people";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

const MAX_JSON_BYTES = 1_048_576;

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

async function readBoundedJson(request: Request): Promise<{ok: true; data: unknown} | {ok: false}> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return {ok: false};
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_JSON_BYTES || !request.body) {
    return {ok: false};
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) {
        await reader.cancel();
        return {ok: false};
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {ok: true, data: JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes))};
  } catch {
    return {ok: false};
  }
}

export async function GET(request: Request) {
  const query = normalizeAcademicPeopleSearchParams(new URL(request.url).searchParams);
  if (!query.ok) return json(query, academicPeopleHttpStatus(query));
  const session = await getRequestSession();
  const result = await listAcademicPeople(
    getPrismaClient(),
    session.ok ? session.session : null,
    query.data,
  );
  return json(result.ok ? result.data : result, academicPeopleHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "CSRF_INVALID" as const};
    return json(result, academicPeopleHttpStatus(result));
  }
  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, academicPeopleHttpStatus(result));
  }
  const session = await getRequestSession();
  const result = await executeAcademicPeopleCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    body.data,
  );
  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/academic`);
      revalidatePath(`/${locale}/admin/program-studi`);
      revalidatePath(`/${locale}/akademik`, "page");
      revalidatePath(`/${locale}/dosen`, "page");
      revalidatePath(`/${locale}/tenaga-kependidikan`, "page");
      revalidatePath(`/${locale}/prodi/[slug]`, "page");
    }
  }
  return json(result, academicPeopleHttpStatus(result));
}
