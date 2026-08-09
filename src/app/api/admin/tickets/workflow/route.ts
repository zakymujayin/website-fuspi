import {revalidatePath} from "next/cache";

import {
  addAttachment,
  executeStaffCommand,
  getStaffTicket,
  listStaffTickets,
  ticketWorkflowHttpStatus,
} from "@/features/tickets/workflow";
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
  const session = await getRequestSession();
  const url = new URL(request.url);
  const ticketId = url.searchParams.get("id");

  if (ticketId) {
    const result = await getStaffTicket(
      getPrismaClient(),
      session.ok ? session.session : null,
      ticketId,
    );
    return json(result.ok ? result.data : result, ticketWorkflowHttpStatus(result));
  }

  const query = {
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : 1,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : 25,
    status: url.searchParams.get("status") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    priority: url.searchParams.get("priority") ?? undefined,
    assigneeId: url.searchParams.get("assigneeId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  };

  const result = await listStaffTickets(
    getPrismaClient(),
    session.ok ? session.session : null,
    query,
  );
  return json(result.ok ? result.data : result, ticketWorkflowHttpStatus(result));
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    const result = {ok: false as const, code: "SESSION_INVALID" as const};
    return json(result, ticketWorkflowHttpStatus(result));
  }
  const session = await getRequestSession();
  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, ticketWorkflowHttpStatus(result));
  }

  const input = body.data as Record<string, unknown>;

  if (input?.action === "ATTACH") {
    const result = await addAttachment(
      getPrismaClient(),
      session.ok ? session.session : null,
      String(input.ticketId ?? ""),
      input.fileData,
    );
    return json(result, ticketWorkflowHttpStatus(result));
  }

  const result = await executeStaffCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    input,
  );

  if (result.ok) {
    revalidatePath("/id/admin/tiket", "page");
    revalidatePath("/en/admin/tickets", "page");
    revalidatePath("/ar/admin/tickets", "page");
  }
  return json(result.ok ? result.data : result, ticketWorkflowHttpStatus(result));
}
