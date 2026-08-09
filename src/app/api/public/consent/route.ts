import {checkConsent, consentHttpStatus, recordConsent, submitPageFeedback} from "@/features/consent/domain";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
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
  const params = Object.create(null) as Record<string, string>;
  url.searchParams.forEach((value, key) => { params[key] = value; });

  if (params.action === "check") {
    const result = await checkConsent(getPrismaClient(), {
      subjectHash: params.subjectHash ?? "",
      purpose: params.purpose ?? "",
    });
    return json(result, consentHttpStatus(result));
  }

  return json({ok: false, code: "REQUEST_INVALID"}, 400);
}

export async function POST(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("action") === "feedback") {
    const body = await readBoundedJson(request);
    if (!body.ok) {
      return json({ok: false, code: "REQUEST_INVALID"}, 400);
    }
    const result = await submitPageFeedback(getPrismaClient(), body.data);
    return json(result, consentHttpStatus(result));
  }

  if (!isSameOriginRequest(request.headers)) {
    return json({ok: false, code: "CSRF_INVALID"}, 403);
  }

  const body = await readBoundedJson(request);
  if (!body.ok) {
    return json({ok: false, code: "REQUEST_INVALID"}, 400);
  }

  const result = await recordConsent(getPrismaClient(), body.data);
  return json(result, consentHttpStatus(result));
}
