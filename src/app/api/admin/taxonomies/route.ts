import {revalidatePath} from "next/cache";

import {TaxonomyMutationResultSchema, normalizeTaxonomySearchParams} from "@/contracts/admin-foundation";
import {adminFoundationHttpStatus, executeTaxonomyCommand, listTaxonomies} from "@/features/admin/foundation";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

const MAX_JSON_BYTES = 262_144;

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

async function readBoundedJson(request: Request): Promise<{ok: true; data: unknown} | {ok: false}> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return {ok: false};
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_JSON_BYTES || !request.body) return {ok: false};
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

function failure(code: "CSRF_INVALID" | "REQUEST_INVALID") {
  return TaxonomyMutationResultSchema.parse({ok: false, code});
}

export async function GET(request: Request) {
  let query: ReturnType<typeof normalizeTaxonomySearchParams>;
  try {
    query = normalizeTaxonomySearchParams(new URL(request.url).searchParams);
  } catch {
    const result = failure("REQUEST_INVALID");
    return json(result, adminFoundationHttpStatus(result));
  }
  const session = await getRequestSession();
  const result = await listTaxonomies(getPrismaClient(), session.ok ? session.session : null, query);
  return json(result.ok ? result.data : result, adminFoundationHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = failure("CSRF_INVALID");
    return json(result, adminFoundationHttpStatus(result));
  }
  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = failure("REQUEST_INVALID");
    return json(result, adminFoundationHttpStatus(result));
  }
  const session = await getRequestSession();
  const result = await executeTaxonomyCommand(getPrismaClient(), session.ok ? session.session : null, body.data);
  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/posts`);
      revalidatePath(`/${locale}/berita`);
    }
  }
  return json(result, adminFoundationHttpStatus(result));
}
