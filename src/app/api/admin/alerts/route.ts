import {revalidatePath} from "next/cache";

import {
  alertsHttpStatus,
  createServiceEndpoint,
  createServiceIncident,
  createSiteAlert,
  deleteServiceEndpoint,
  deleteServiceIncident,
  deleteSiteAlert,
  listServiceEndpoints,
  listServiceIncidents,
  listSiteAlerts,
  normalizeAlertsListSearchParams,
  updateServiceEndpoint,
  updateServiceIncident,
  updateSiteAlert,
} from "@/features/alerts/domain";
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

  const pagination = normalizeAlertsListSearchParams(url.searchParams);
  if (!pagination.ok) return json(pagination, alertsHttpStatus(pagination));

  if (pagination.data.resource === "SITE_ALERT") {
    const result = await listSiteAlerts(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, alertsHttpStatus(result));
  }

  if (pagination.data.resource === "SERVICE_ENDPOINT") {
    const result = await listServiceEndpoints(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, alertsHttpStatus(result));
  }

  if (pagination.data.resource === "SERVICE_INCIDENT") {
    const result = await listServiceIncidents(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, alertsHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, alertsHttpStatus(invalid));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "CSRF_INVALID" as const};
    return json(result, alertsHttpStatus(result));
  }

  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, alertsHttpStatus(result));
  }

  const session = await getRequestSession();
  const payload = body.data as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "CREATE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const input = payload.input as Record<string, unknown>;

    if (resource === "SITE_ALERT") {
      const result = await createSiteAlert(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createSiteAlert>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }

    if (resource === "SERVICE_ENDPOINT") {
      const result = await createServiceEndpoint(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createServiceEndpoint>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }

    if (resource === "SERVICE_INCIDENT") {
      const result = await createServiceIncident(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createServiceIncident>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }
  }

  if (action === "UPDATE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const input = payload.input as Record<string, unknown>;

    if (resource === "SITE_ALERT") {
      const result = await updateSiteAlert(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof updateSiteAlert>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }

    if (resource === "SERVICE_ENDPOINT") {
      const result = await updateServiceEndpoint(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof updateServiceEndpoint>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }

    if (resource === "SERVICE_INCIDENT") {
      const result = await updateServiceIncident(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof updateServiceIncident>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }
  }

  if (action === "DELETE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const id = typeof payload.id === "string" ? payload.id : "";

    if (resource === "SITE_ALERT" && id) {
      const result = await deleteSiteAlert(
        getPrismaClient(),
        session.ok ? session.session : null,
        id,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }

    if (resource === "SERVICE_ENDPOINT" && id) {
      const result = await deleteServiceEndpoint(
        getPrismaClient(),
        session.ok ? session.session : null,
        id,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }

    if (resource === "SERVICE_INCIDENT" && id) {
      const result = await deleteServiceIncident(
        getPrismaClient(),
        session.ok ? session.session : null,
        id,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/alerts`);
        }
      }
      return json(result, alertsHttpStatus(result));
    }
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, alertsHttpStatus(invalid));
}
