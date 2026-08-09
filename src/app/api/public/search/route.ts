import {normalizeSearchQuery, searchHttpStatus, searchPublicContent} from "@/features/search/domain";
import {getPrismaClient} from "@/lib/db/client";

export async function GET(request: Request) {
  const normalized = normalizeSearchQuery(new URL(request.url).searchParams);
  if (!normalized.ok) {
    return Response.json(normalized, {status: searchHttpStatus(normalized), headers: {"Cache-Control": "no-store"}});
  }
  const result = await searchPublicContent(getPrismaClient(), normalized.query);
  return Response.json(result, {status: searchHttpStatus(result), headers: {"Cache-Control": "no-store"}});
}
