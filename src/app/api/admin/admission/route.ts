import {revalidatePath} from "next/cache";

import {
  admissionHttpStatus,
  createAdmissionInfo,
  getAdmissionInfo,
  listAdmissionInfos,
  normalizeAdmissionPagination,
  reviewAdmissionInfo,
  setAdmissionActivation,
  updateAdmissionInfo,
} from "@/features/admission/domain";
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

  const id = url.searchParams.get("id");
  if (id) {
    const result = await getAdmissionInfo(
      getPrismaClient(),
      session.ok ? session.session : null,
      id,
    );
    return json(result.ok ? result.data : result, admissionHttpStatus(result));
  }

  const pagination = normalizeAdmissionPagination(url.searchParams);
  if (!("page" in pagination)) {
    return json(pagination, admissionHttpStatus(pagination));
  }

  const result = await listAdmissionInfos(
    getPrismaClient(),
    session.ok ? session.session : null,
    pagination,
  );
  return json(result.ok ? result.data : result, admissionHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "CSRF_INVALID" as const};
    return json(result, admissionHttpStatus(result));
  }

  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, admissionHttpStatus(result));
  }

  const session = await getRequestSession();
  const payload = body.data as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "CREATE") {
    const result = await createAdmissionInfo(
      getPrismaClient(),
      session.ok ? session.session : null,
      payload.input as Parameters<typeof createAdmissionInfo>[2],
    );
    if (result.ok) {
      for (const locale of ["id", "en", "ar"] as const) {
        revalidatePath(`/${locale}/admin/admission`);
      }
    }
    return json(result.ok ? result.data : result, admissionHttpStatus(result));
  }

  if (action === "UPDATE") {
    const input = payload as {
      id: string;
      input: Parameters<typeof updateAdmissionInfo>[3];
    };
    const result = await updateAdmissionInfo(
      getPrismaClient(),
      session.ok ? session.session : null,
      input.id,
      input.input,
    );
    if (result.ok) {
      for (const locale of ["id", "en", "ar"] as const) {
        revalidatePath(`/${locale}/admin/admission`);
      }
    }
    return json(result.ok ? result.data : result, admissionHttpStatus(result));
  }

  if (action === "ACTIVATE" || action === "DEACTIVATE") {
    const input = payload as {id: string};
    const result = await setAdmissionActivation(
      getPrismaClient(),
      session.ok ? session.session : null,
      input.id,
      action === "ACTIVATE",
    );
    if (result.ok) {
      for (const locale of ["id", "en", "ar"] as const) {
        revalidatePath(`/${locale}/admin/admission`);
      }
    }
    return json(result.ok ? result.data : result, admissionHttpStatus(result));
  }

  if (action === "REVIEW") {
    const input = payload as {
      input: Parameters<typeof reviewAdmissionInfo>[2];
    };
    const result = await reviewAdmissionInfo(
      getPrismaClient(),
      session.ok ? session.session : null,
      input.input,
    );
    if (result.ok) {
      for (const locale of ["id", "en", "ar"] as const) {
        revalidatePath(`/${locale}/admin/admission`);
      }
    }
    return json(result.ok ? result.data : result, admissionHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, admissionHttpStatus(invalid));
}
