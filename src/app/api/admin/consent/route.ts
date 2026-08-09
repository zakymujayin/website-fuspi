import {aggregateFeedbackStats, consentHttpStatus, listFeedback} from "@/features/consent/domain";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");

  if (resource === "FEEDBACK") {
    const action = url.searchParams.get("action");

    if (action === "stats") {
      const session = await getRequestSession();
      const result = await aggregateFeedbackStats(
        getPrismaClient(),
        session.ok ? session.session : null,
        {
          fromDate: url.searchParams.get("fromDate") ?? undefined,
          toDate: url.searchParams.get("toDate") ?? undefined,
        },
      );
      return json(result.ok ? result.stats : result, consentHttpStatus(result));
    }

    const query = {
      pageType: url.searchParams.get("pageType") ?? undefined,
      pageId: url.searchParams.get("pageId") ?? undefined,
      locale: url.searchParams.get("locale") ?? undefined,
      fromDate: url.searchParams.get("fromDate") ?? undefined,
      toDate: url.searchParams.get("toDate") ?? undefined,
      page: Number(url.searchParams.get("page")) || 1,
      pageSize: Number(url.searchParams.get("pageSize")) || 20,
    };

    const session = await getRequestSession();
    const result = await listFeedback(
      getPrismaClient(),
      session.ok ? session.session : null,
      query,
    );
    return json(result.ok ? result.data : result, consentHttpStatus(result));
  }

  const action = url.searchParams.get("action");

  if (action === "stats") {
    const session = await getRequestSession();
    const result = await aggregateFeedbackStats(
      getPrismaClient(),
      session.ok ? session.session : null,
      {
        fromDate: url.searchParams.get("fromDate") ?? undefined,
        toDate: url.searchParams.get("toDate") ?? undefined,
      },
    );
    return json(result, consentHttpStatus(result));
  }

  const query = {
    pageId: url.searchParams.get("pagePath") ?? url.searchParams.get("pageId") ?? undefined,
    fromDate: url.searchParams.get("fromDate") ?? undefined,
    toDate: url.searchParams.get("toDate") ?? undefined,
    page: Number(url.searchParams.get("page")) || 1,
    pageSize: Number(url.searchParams.get("pageSize")) || 20,
  };

  const session = await getRequestSession();
  const result = await listFeedback(
    getPrismaClient(),
    session.ok ? session.session : null,
    query,
  );
  return json(result, consentHttpStatus(result));
}
