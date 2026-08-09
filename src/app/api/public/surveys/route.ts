import {getActiveSurvey, submitSurveyAnswers, surveyHttpStatus} from "@/features/survey/domain";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (!slug || slug.length === 0 || slug.length > 191) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, surveyHttpStatus(result));
  }

  const result = await getActiveSurvey(getPrismaClient(), slug);
  return json(result.ok ? result.data : result, surveyHttpStatus(result));
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, surveyHttpStatus(result));
  }

  const payload = body as Record<string, unknown>;

  const clientIp =
    request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "127.0.0.1";

  const rateLimitSecret = process.env.RATE_LIMIT_HMAC_SECRET;
  if (!rateLimitSecret || rateLimitSecret.length < 32) {
    const result = {ok: false as const, code: "UNAVAILABLE" as const};
    return json(result, surveyHttpStatus(result));
  }

  const result = await submitSurveyAnswers(
    getPrismaClient(),
    payload as Parameters<typeof submitSurveyAnswers>[1],
    rateLimitSecret,
    clientIp,
  );

  return json(result.ok ? result.data : result, surveyHttpStatus(result));
}
