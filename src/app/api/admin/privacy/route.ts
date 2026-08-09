import {revalidatePath} from "next/cache";

import {
  createDataExport,
  createDataIncident,
  createPrivacyNotice,
  deletePrivacyNotice,
  listDataExports,
  listDataIncidents,
  listDataSubjectRequests,
  listPrivacyNotices,
  normalizePrivacyListSearchParams,
  privacyHttpStatus,
  processDataRequest,
  recordExportDownload,
  updateDataIncident,
  updatePrivacyNotice,
} from "@/features/privacy/domain";
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

  const pagination = normalizePrivacyListSearchParams(url.searchParams);
  if (!pagination.ok) return json(pagination, privacyHttpStatus(pagination));

  if (pagination.data.resource === "PRIVACY_NOTICE") {
    const result = await listPrivacyNotices(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, privacyHttpStatus(result));
  }

  if (pagination.data.resource === "DATA_REQUEST") {
    const result = await listDataSubjectRequests(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, privacyHttpStatus(result));
  }

  if (pagination.data.resource === "DATA_INCIDENT") {
    const result = await listDataIncidents(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, privacyHttpStatus(result));
  }

  if (pagination.data.resource === "DATA_EXPORT") {
    const result = await listDataExports(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, privacyHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, privacyHttpStatus(invalid));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "CSRF_INVALID" as const};
    return json(result, privacyHttpStatus(result));
  }

  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, privacyHttpStatus(result));
  }

  const session = await getRequestSession();
  const payload = body.data as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "CREATE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const input = payload.input as Record<string, unknown>;

    if (resource === "PRIVACY_NOTICE") {
      const result = await createPrivacyNotice(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createPrivacyNotice>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/privacy`);
        }
      }
      return json(result, privacyHttpStatus(result));
    }

    if (resource === "DATA_INCIDENT") {
      const result = await createDataIncident(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createDataIncident>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/privacy`);
        }
      }
      return json(result, privacyHttpStatus(result));
    }

    if (resource === "DATA_EXPORT") {
      const result = await createDataExport(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createDataExport>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/privacy`);
        }
      }
      return json(result, privacyHttpStatus(result));
    }
  }

  if (action === "UPDATE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const input = payload.input as Record<string, unknown>;

    if (resource === "PRIVACY_NOTICE") {
      const result = await updatePrivacyNotice(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof updatePrivacyNotice>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/privacy`);
        }
      }
      return json(result, privacyHttpStatus(result));
    }

    if (resource === "DATA_INCIDENT") {
      const result = await updateDataIncident(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof updateDataIncident>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/privacy`);
        }
      }
      return json(result, privacyHttpStatus(result));
    }
  }

  if (action === "DELETE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const id = typeof payload.id === "string" ? payload.id : "";

    if (resource === "PRIVACY_NOTICE" && id) {
      const result = await deletePrivacyNotice(
        getPrismaClient(),
        session.ok ? session.session : null,
        id,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/privacy`);
        }
      }
      return json(result, privacyHttpStatus(result));
    }
  }

  if (action === "PROCESS_REQUEST") {
    const input = payload.input as Record<string, unknown>;
    const result = await processDataRequest(
      getPrismaClient(),
      session.ok ? session.session : null,
      input as Parameters<typeof processDataRequest>[2],
    );
    if (result.ok) {
      for (const locale of ["id", "en", "ar"] as const) {
        revalidatePath(`/${locale}/admin/privacy`);
      }
    }
    return json(result, privacyHttpStatus(result));
  }

  if (action === "RECORD_DOWNLOAD") {
    const input = payload.input as Record<string, unknown>;
    const result = await recordExportDownload(
      getPrismaClient(),
      session.ok ? session.session : null,
      input as Parameters<typeof recordExportDownload>[2],
    );
    return json(result, privacyHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, privacyHttpStatus(invalid));
}
