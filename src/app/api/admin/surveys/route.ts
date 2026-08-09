import {revalidatePath} from "next/cache";

import {
  createSurveyDefinition,
  exportSurveySubmissionsCsv,
  listSurveyDefinitions,
  listSurveySubmissions,
  normalizeSurveyPagination,
  setSurveyActivation,
  surveyHttpStatus,
  updateSurveyDefinition,
} from "@/features/survey/domain";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

const MAX_JSON_BYTES = 1_048_576;

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

async function readBoundedJson(
  request: Request,
): Promise<{ok: true; data: unknown} | {ok: false}> {
  if (
    !(request.headers.get("content-type") ?? "")
      .toLowerCase()
      .startsWith("application/json")
  ) return {ok: false};

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (
    !Number.isFinite(declared)
    || declared < 0
    || declared > MAX_JSON_BYTES
    || !request.body
  ) return {ok: false};

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
    return {
      ok: true,
      data: JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes)),
    };
  } catch {
    return {ok: false};
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getRequestSession();

  if (url.searchParams.get("export") === "csv") {
    const definitionId = url.searchParams.get("definitionId") ?? "";
    if (!definitionId) {
      const result = {ok: false as const, code: "REQUEST_INVALID" as const};
      return json(result, surveyHttpStatus(result));
    }
    const result = await exportSurveySubmissionsCsv(
      getPrismaClient(),
      session.ok ? session.session : null,
      definitionId,
    );
    if (!result.ok) return json(result, surveyHttpStatus(result));
    return new Response(result.data, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="survey-submissions.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  if (url.searchParams.get("resource") === "submissions") {
    const pagination = normalizeSurveyPagination(url.searchParams);
    if (!("page" in pagination)) return json(pagination, surveyHttpStatus(pagination));
    const result = await listSurveySubmissions(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination,
    );
    return json(result.ok ? result.data : result, surveyHttpStatus(result));
  }

  const pagination = normalizeSurveyPagination(url.searchParams);
  if (!("page" in pagination)) return json(pagination, surveyHttpStatus(pagination));
  const result = await listSurveyDefinitions(
    getPrismaClient(),
    session.ok ? session.session : null,
    pagination,
  );
  return json(result.ok ? result.data : result, surveyHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "CSRF_INVALID" as const};
    return json(result, surveyHttpStatus(result));
  }

  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, surveyHttpStatus(result));
  }

  const session = await getRequestSession();
  const payload = body.data as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "CREATE") {
    const result = await createSurveyDefinition(
      getPrismaClient(),
      session.ok ? session.session : null,
      payload.input as Parameters<typeof createSurveyDefinition>[2],
    );
    return json(result.ok ? result.data : result, surveyHttpStatus(result));
  }

  if (action === "UPDATE") {
    const input = payload as {id: string; input: Parameters<typeof updateSurveyDefinition>[3]};
    const result = await updateSurveyDefinition(
      getPrismaClient(),
      session.ok ? session.session : null,
      input.id,
      input.input,
    );
    if (result.ok) {
      for (const locale of ["id", "en", "ar"] as const) {
        revalidatePath(`/${locale}/admin/surveys`);
      }
    }
    return json(result.ok ? result.data : result, surveyHttpStatus(result));
  }

  if (action === "ACTIVATE" || action === "DEACTIVATE") {
    const input = payload as {id: string};
    const result = await setSurveyActivation(
      getPrismaClient(),
      session.ok ? session.session : null,
      input.id,
      action === "ACTIVATE",
    );
    if (result.ok) {
      for (const locale of ["id", "en", "ar"] as const) {
        revalidatePath(`/${locale}/admin/surveys`);
      }
    }
    return json(result.ok ? result.data : result, surveyHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, surveyHttpStatus(invalid));
}
