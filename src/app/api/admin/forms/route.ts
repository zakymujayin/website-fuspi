import {exportFormCsv, exportSubscribersCsv, formHttpStatus, getFormSubmission, listFormSubmissions, listSubscribers} from "@/features/form/domain";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";


function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const resource = url.searchParams.get("resource");

  if (resource === "SUBSCRIBERS") {
    const exportParam = url.searchParams.get("export");
    const subscriberQuery = {
      page: Number(url.searchParams.get("page")) || 1,
      pageSize: Number(url.searchParams.get("pageSize")) || 20,
      active: url.searchParams.get("active") ?? "ALL",
      locale: url.searchParams.get("locale") ?? undefined,
      search: url.searchParams.get("search") ?? "",
    };

    if (exportParam === "csv") {
      const session = await getRequestSession();
      const result = await exportSubscribersCsv(
        getPrismaClient(),
        session.ok ? session.session : null,
        subscriberQuery,
      );
      if (!result.ok) return json(result, formHttpStatus(result));

      const header = "Email,Locale,Active,SubscribedAt\n";
      const csvContent = header + result.rows
        .map((row) => `"${row.email}","${row.locale}","${row.isActive}","${row.subscribedAt}"`)
        .join("\n");

      return new Response(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const session = await getRequestSession();
    const result = await listSubscribers(
      getPrismaClient(),
      session.ok ? session.session : null,
      subscriberQuery,
    );
    return json(result.ok ? result.data : result, formHttpStatus(result));
  }

  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  if (id && action === "detail") {
    const session = await getRequestSession();
    const result = await getFormSubmission(
      getPrismaClient(),
      session.ok ? session.session : null,
      {id},
    );
    return json(result, formHttpStatus(result));
  }

  if (action === "export") {
    const session = await getRequestSession();
    const result = await exportFormCsv(
      getPrismaClient(),
      session.ok ? session.session : null,
    );
    if (!result.ok) return json(result, formHttpStatus(result));

    const header = "Name,Email,Subject,Message,Locale,ReceivedAt\n";
    const csvContent = header + result.rows
      .map((row) => `"${row.name}","${row.email}","${row.subject}","${row.message}","${row.locale}","${row.receivedAt}"`)
      .join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const query = {
    page: Number(url.searchParams.get("page")) || 1,
    pageSize: Number(url.searchParams.get("pageSize")) || 20,
    search: url.searchParams.get("search") ?? "",
    fromDate: url.searchParams.get("fromDate") ?? undefined,
    toDate: url.searchParams.get("toDate") ?? undefined,
  };

  const session = await getRequestSession();
  const result = await listFormSubmissions(
    getPrismaClient(),
    session.ok ? session.session : null,
    query,
  );
  return json(result, formHttpStatus(result));
}
