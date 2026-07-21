import {revalidatePath} from "next/cache";

import {AdminMediaMutationResponseSchema} from "@/contracts/media-admin";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {
  adminMediaHttpStatus,
  executeAdminMediaCommand,
  listAdminMedia,
  normalizeAdminMediaSearchParams,
} from "@/lib/content/media-admin-transport";
import {getPrismaClient} from "@/lib/db/client";
import {parseStorageRoots} from "@/lib/storage";

const MAX_JSON_BYTES = 1_048_576;

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

function failure(code: "SESSION_INVALID" | "CSRF_INVALID" | "REQUEST_INVALID" | "UNAVAILABLE") {
  return AdminMediaMutationResponseSchema.parse({ok: false, code});
}

function storageRoots() {
  return parseStorageRoots({
    PUBLIC: process.env.UPLOAD_DIR ?? "",
    PRIVATE: process.env.UPLOAD_PRIVATE_DIR ?? "",
    PPKS_PRIVATE: process.env.PPKS_PRIVATE_DIR ?? "",
  });
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
  const normalized = normalizeAdminMediaSearchParams(new URL(request.url).searchParams);
  if (!normalized.ok) return json(normalized, 400);
  const session = await getRequestSession();
  const result = await listAdminMedia(
    getPrismaClient(),
    session.ok ? session.session : null,
    normalized.data,
    process.env.UPLOAD_PUBLIC_URL ?? "",
  );
  return json(result.ok ? result.data : result, adminMediaHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = failure("CSRF_INVALID");
    return json(result, adminMediaHttpStatus(result));
  }
  const session = await getRequestSession();
  if (!session.ok) {
    const result = failure("SESSION_INVALID");
    return json(result, adminMediaHttpStatus(result));
  }
  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = failure("REQUEST_INVALID");
    return json(result, adminMediaHttpStatus(result));
  }
  let roots;
  try {
    roots = storageRoots();
  } catch {
    const result = failure("UNAVAILABLE");
    return json(result, adminMediaHttpStatus(result));
  }
  const result = await executeAdminMediaCommand(
    getPrismaClient(),
    session.session,
    body.data,
    roots,
  );
  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/media`);
    }
  }
  return json(result, adminMediaHttpStatus(result));
}
