import {
  accessibilityHttpStatus,
  submitAccessibilityRequest,
} from "@/features/accessibility/domain";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, accessibilityHttpStatus(result));
  }

  const payload = body as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "SUBMIT_REQUEST") {
    const input = payload as {
      requestedFormat: string;
      resourcePath: string;
      requesterEncrypted: string;
    };

    const result = await submitAccessibilityRequest(getPrismaClient(), input);
    return json(result.ok ? result.data : result, accessibilityHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, accessibilityHttpStatus(invalid));
}
