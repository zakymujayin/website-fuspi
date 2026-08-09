import {revalidatePath} from "next/cache";

import {
  changeContentOwner,
  createGlossaryTerm,
  createRetentionPolicy,
  deleteGlossaryTerm,
  deleteRetentionPolicy,
  getRevisionDiff,
  governanceHttpStatus,
  listContentRevisions,
  listDueReviews,
  listGlossaryTerms,
  listRetentionPolicies,
  normalizeGovernanceListSearchParams,
  restoreRevision,
  updateGlossaryTerm,
  updateRetentionPolicy,
} from "@/features/governance/domain";
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

  const resourceType = url.searchParams.get("resourceType");
  const resourceId = url.searchParams.get("resourceId");
  const revisionId = url.searchParams.get("revisionId");

  if (url.searchParams.get("action") === "revisions" && resourceType && resourceId) {
    const result = await listContentRevisions(
      getPrismaClient(),
      session.ok ? session.session : null,
      resourceType,
      resourceId,
    );
    return json(result.ok ? result.data : result, governanceHttpStatus(result));
  }

  if (url.searchParams.get("action") === "diff" && revisionId) {
    const result = await getRevisionDiff(
      getPrismaClient(),
      session.ok ? session.session : null,
      revisionId,
    );
    return json(result.ok ? result.data : result, governanceHttpStatus(result));
  }

  if (url.searchParams.get("action") === "due-reviews") {
    const result = await listDueReviews(
      getPrismaClient(),
      session.ok ? session.session : null,
    );
    return json(result.ok ? result.data : result, governanceHttpStatus(result));
  }

  const pagination = normalizeGovernanceListSearchParams(url.searchParams);
  if (!pagination.ok) return json(pagination, governanceHttpStatus(pagination));

  if (pagination.data.resource === "GLOSSARY_TERM") {
    const result = await listGlossaryTerms(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, governanceHttpStatus(result));
  }

  if (pagination.data.resource === "RETENTION_POLICY") {
    const result = await listRetentionPolicies(
      getPrismaClient(),
      session.ok ? session.session : null,
      pagination.data,
    );
    return json(result.ok ? result.data : result, governanceHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, governanceHttpStatus(invalid));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "CSRF_INVALID" as const};
    return json(result, governanceHttpStatus(result));
  }

  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, governanceHttpStatus(result));
  }

  const session = await getRequestSession();
  const payload = body.data as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "CREATE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const input = payload.input as Record<string, unknown>;

    if (resource === "GLOSSARY_TERM") {
      const result = await createGlossaryTerm(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createGlossaryTerm>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/governance`);
        }
      }
      return json(result, governanceHttpStatus(result));
    }

    if (resource === "RETENTION_POLICY") {
      const result = await createRetentionPolicy(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof createRetentionPolicy>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/governance`);
        }
      }
      return json(result, governanceHttpStatus(result));
    }
  }

  if (action === "UPDATE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const input = payload.input as Record<string, unknown>;

    if (resource === "GLOSSARY_TERM") {
      const result = await updateGlossaryTerm(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof updateGlossaryTerm>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/governance`);
        }
      }
      return json(result, governanceHttpStatus(result));
    }

    if (resource === "RETENTION_POLICY") {
      const result = await updateRetentionPolicy(
        getPrismaClient(),
        session.ok ? session.session : null,
        input as Parameters<typeof updateRetentionPolicy>[2],
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/governance`);
        }
      }
      return json(result, governanceHttpStatus(result));
    }
  }

  if (action === "DELETE") {
    const resource = typeof payload.resource === "string" ? payload.resource : null;
    const id = typeof payload.id === "string" ? payload.id : "";

    if (resource === "GLOSSARY_TERM" && id) {
      const result = await deleteGlossaryTerm(
        getPrismaClient(),
        session.ok ? session.session : null,
        id,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/governance`);
        }
      }
      return json(result, governanceHttpStatus(result));
    }

    if (resource === "RETENTION_POLICY" && id) {
      const result = await deleteRetentionPolicy(
        getPrismaClient(),
        session.ok ? session.session : null,
        id,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/governance`);
        }
      }
      return json(result, governanceHttpStatus(result));
    }
  }

  if (action === "RESTORE_REVISION") {
    const resourceType = typeof payload.resourceType === "string" ? payload.resourceType : "";
    const resourceId = typeof payload.resourceId === "string" ? payload.resourceId : "";
    const revisionId = typeof payload.revisionId === "string" ? payload.revisionId : "";

    if (resourceType && resourceId && revisionId) {
      const result = await restoreRevision(
        getPrismaClient(),
        session.ok ? session.session : null,
        resourceType,
        resourceId,
        revisionId,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/governance`);
        }
      }
      return json(result, governanceHttpStatus(result));
    }
  }

  if (action === "CHANGE_OWNER") {
    const resourceType = typeof payload.resourceType === "string" ? payload.resourceType : "";
    const resourceId = typeof payload.resourceId === "string" ? payload.resourceId : "";
    const newOwnerId = typeof payload.newOwnerId === "string" ? payload.newOwnerId : "";

    if (resourceType && resourceId && newOwnerId) {
      const result = await changeContentOwner(
        getPrismaClient(),
        session.ok ? session.session : null,
        resourceType,
        resourceId,
        newOwnerId,
      );
      if (result.ok) {
        for (const locale of ["id", "en", "ar"] as const) {
          revalidatePath(`/${locale}/admin/governance`);
        }
      }
      return json(result, governanceHttpStatus(result));
    }
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, governanceHttpStatus(invalid));
}
