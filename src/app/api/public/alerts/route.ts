import {alertsHttpStatus, listActiveAlerts, listServiceStatus} from "@/features/alerts/domain";
import {getPrismaClient} from "@/lib/db/client";

const CACHE_MAX_AGE = 30;

function json(value: unknown, status = 200, maxAge = CACHE_MAX_AGE) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=60`,
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = (url.searchParams.get("locale") ?? "id") as "id" | "en" | "ar";
  const action = url.searchParams.get("action");

  if (!["id", "en", "ar"].includes(locale)) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, alertsHttpStatus(result));
  }

  if (action === "service-status") {
    const result = await listServiceStatus(getPrismaClient());
    return json(result.ok ? result.data : result, alertsHttpStatus(result));
  }

  const audience = (url.searchParams.get("audience") ?? "PUBLIC") as "ALL" | "ADMIN" | "PUBLIC";
  if (!["ALL", "ADMIN", "PUBLIC"].includes(audience)) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, alertsHttpStatus(result));
  }

  const result = await listActiveAlerts(getPrismaClient(), locale, audience);
  return json(result.ok ? result.data : result, alertsHttpStatus(result));
}
