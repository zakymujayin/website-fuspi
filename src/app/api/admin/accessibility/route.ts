import {revalidatePath} from "next/cache";

import {
  accessibilityHttpStatus,
  completeAccessibilityRequest,
  createAccessibilityIssue,
  deleteAccessibilityIssue,
  listAccessibilityIssues,
  listAccessibilityRequests,
  normalizeAccessibilityListSearchParams,
  updateAccessibilityIssue,
  updateIssueStatus,
} from "@/features/accessibility/domain";
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

  const pagination = normalizeAccessibilityListSearchParams(url.searchParams);
  if (!pagination.ok) return json(pagination, accessibilityHttpStatus(pagination));

  if (pagination.data.resource === "ISSUE") {
    const result = await listAccessibilityIssues(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, accessibilityHttpStatus(result));
  }

  if (pagination.data.resource === "REQUEST") {
    const result = await listAccessibilityRequests(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, accessibilityHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, accessibilityHttpStatus(invalid));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "CSRF_INVALID" as const};
    return json(result, accessibilityHttpStatus(result));
  }

  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, accessibilityHttpStatus(result));
  }

  const session = await getRequestSession();
  const payload = body.data as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "CREATE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const input = payload.input as Record<string, unknown>;

    if (resource === "ISSUE") {
      const result = await createAccessibilityIssue(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createAccessibilityIssue>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/accessibility`);
        }
      }
      return json(result, accessibilityHttpStatus(result));
    }
  }

  if (action === "UPDATE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const input = payload.input as Record<string, unknown> & {id: string};

    if (resource === "ISSUE" && input.id) {
      const result = await updateAccessibilityIssue(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof updateAccessibilityIssue>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/accessibility`);
        }
      }
      return json(result, accessibilityHttpStatus(result));
    }
  }

  if (action === "UPDATE_STATUS") {
    const input = payload.input as Record<string, unknown>;
    const result = await updateIssueStatus(
      getPrismaClient(),
      session.ok ? session.session : null,
      input as Parameters<typeof updateIssueStatus>[2],
    );
    if (result.ok) {
      for (const locale of ["id", "en", "ar"] as const) {
        revalidatePath(`/${locale}/admin/accessibility`);
      }
    }
    return json(result, accessibilityHttpStatus(result));
  }

  if (action === "DELETE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const id = typeof payload.id === "string" ? payload.id : "";

    if (resource === "ISSUE" && id) {
      const result = await deleteAccessibilityIssue(
        getPrismaClient(),
        session.ok ? session.session : null,
        id,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/accessibility`);
        }
      }
      return json(result, accessibilityHttpStatus(result));
    }
  }

  if (action === "COMPLETE_REQUEST") {
    const id = typeof payload.id === "string" ? payload.id : "";
    if (id) {
      const result = await completeAccessibilityRequest(
        getPrismaClient(),
        session.ok ? session.session : null,
        id,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/accessibility`);
        }
      }
      return json(result, accessibilityHttpStatus(result));
    }
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, accessibilityHttpStatus(invalid));
}
