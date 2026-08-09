import {submitPublicTicket, getPublicTicket, addPublicReply, ticketWorkflowHttpStatus} from "@/features/tickets/workflow";
import {getPrismaClient} from "@/lib/db/client";

const MAX_JSON_BYTES = 1_048_576;

const TRACKING_HMAC_SECRET = process.env.TRACKING_HMAC_SECRET ?? "dev-tracking-hmac-secret-min-32-chars!!";
const IP_HMAC_SECRET = process.env.IP_HMAC_SECRET ?? "dev-ip-hmac-secret-minimum-32chars!!";

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

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "0.0.0.0";
  return "0.0.0.0";
}

export async function POST(request: Request) {
  const body = await readBoundedJson(request);
  if (!body.ok) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, ticketWorkflowHttpStatus(result));
  }

  const input = body.data as Record<string, unknown>;
  const action = input?.action;

  if (action === "track") {
    const result = await getPublicTicket(
      getPrismaClient(),
      String(input.ticketNumber ?? ""),
      String(input.token ?? ""),
      TRACKING_HMAC_SECRET,
    );
    return json(result.ok ? result.data : result, ticketWorkflowHttpStatus(result));
  }

  if (action === "reply") {
    const result = await addPublicReply(
      getPrismaClient(),
      String(input.ticketNumber ?? ""),
      String(input.token ?? ""),
      String(input.body ?? ""),
      TRACKING_HMAC_SECRET,
    );
    return json(result.ok ? result.data : result, ticketWorkflowHttpStatus(result));
  }

  const result = await submitPublicTicket(
    getPrismaClient(),
    input,
    clientIp(request),
    IP_HMAC_SECRET,
    TRACKING_HMAC_SECRET,
  );
  return json(result.ok ? result.data : result, ticketWorkflowHttpStatus(result));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await getPublicTicket(
    getPrismaClient(),
    url.searchParams.get("ticketNumber") ?? "",
    url.searchParams.get("token") ?? "",
    TRACKING_HMAC_SECRET,
  );
  return json(result.ok ? result.data : result, ticketWorkflowHttpStatus(result));
}
