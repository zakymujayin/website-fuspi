import {revalidatePath} from "next/cache";

import {
  bookingHttpStatus,
  executeRoomCommand,
  getRoomDetail,
  listRooms,
  normalizeRoomSearchParams,
} from "@/features/booking/domain";
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
  const url = new URL(request.url);
  const roomId = url.searchParams.get("id");

  if (roomId) {
    const session = await getRequestSession();
    const result = await getRoomDetail(
      getPrismaClient(),
      session.ok ? session.session : null,
      roomId,
    );
    return json(result.ok ? result.data : result, bookingHttpStatus(result));
  }

  const query = normalizeRoomSearchParams(url.searchParams);
  if (!query.ok) return json(query, bookingHttpStatus(query));
  const session = await getRequestSession();
  const result = await listRooms(
    getPrismaClient(),
    session.ok ? session.session : null,
    query.data,
  );
  return json(result.ok ? result.data : result, bookingHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "CSRF_INVALID" as const};
    return json(result, bookingHttpStatus(result));
  }
  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, bookingHttpStatus(result));
  }
  const session = await getRequestSession();
  const result = await executeRoomCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    body.data,
  );
  if (result.ok) {
    for (const locale of ["id", "en", "ar"] as const) {
      revalidatePath(`/${locale}/admin/rooms`);
      revalidatePath(`/${locale}/ruangan`, "page");
    }
  }
  return json(result, bookingHttpStatus(result));
}
