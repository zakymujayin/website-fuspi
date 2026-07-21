import {revalidatePath} from "next/cache";

import {AdminPostMutationResponseSchema} from "@/contracts/post-admin";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {
  adminPostHttpStatus,
  executeAdminPostCommand,
  listAdminPosts,
  normalizeAdminPostSearchParams,
} from "@/lib/content/post-admin-transport";
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
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_JSON_BYTES) return {ok: false};
  if (!request.body) return {ok: false};
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
  return AdminPostMutationResponseSchema.parse({ok: false, code});
}

export async function GET(request: Request) {
  const normalized = normalizeAdminPostSearchParams(new URL(request.url).searchParams);
  if (!normalized.ok) return json(normalized, 400);
  const session = await getRequestSession();
  const result = await listAdminPosts(
    getPrismaClient(),
    session.ok ? session.session : null,
    normalized.data,
  );
  return json(result.ok ? result.data : result, adminPostHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = failure("CSRF_INVALID");
    return json(result, adminPostHttpStatus(result));
  }
  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = failure("REQUEST_INVALID");
    return json(result, adminPostHttpStatus(result));
  }
  const session = await getRequestSession();
  const result = await executeAdminPostCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    body.data,
  );
  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/berita`);
      revalidatePath(`/${locale}/berita/[slug]`, "page");
      revalidatePath(`/${locale}/admin/berita`);
    }
  }
  return json(result, adminPostHttpStatus(result));
}
