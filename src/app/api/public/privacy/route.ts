import {
  getActivePrivacyNotice,
  privacyHttpStatus,
  recordConsent,
  submitDataRequest,
} from "@/features/privacy/domain";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug || slug.length === 0 || slug.length > 191) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, privacyHttpStatus(result));
  }

  const result = await getActivePrivacyNotice(getPrismaClient());
  return json(result.ok ? result.data : result, privacyHttpStatus(result));
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, privacyHttpStatus(result));
  }

  const payload = body as Record<string, unknown>;
  const action = typeof payload.action === "string" ? payload.action : null;

  if (action === "CONSENT") {
    const input = payload as {
      privacyNoticeId: string;
      purpose: string;
      granted: boolean;
      sessionId: string;
      subjectHash: string;
    };

    const result = await recordConsent(getPrismaClient(), input);
    return json(result.ok ? result.data : result, privacyHttpStatus(result));
  }

  if (action === "DATA_REQUEST") {
    const input = payload as {
      type: "ACCESS" | "CORRECTION" | "ERASURE" | "RESTRICTION" | "OBJECTION";
      requesterCiphertext: string;
      trackingTokenHash: string;
    };

    const result = await submitDataRequest(getPrismaClient(), input);
    return json(result.ok ? result.data : result, privacyHttpStatus(result));
  }

  const invalid = {ok: false as const, code: "REQUEST_INVALID" as const};
  return json(invalid, privacyHttpStatus(invalid));
}
