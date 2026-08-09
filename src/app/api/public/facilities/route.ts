import {facilityHttpStatus, listPublicFacilities, normalizeFacilitySearchParams} from "@/features/facility/domain";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = normalizeFacilitySearchParams(url.searchParams);
  if (!query.ok) return json(query, facilityHttpStatus(query));
  const result = await listPublicFacilities(
    getPrismaClient(),
    query.data,
  );
  return json(result.ok ? result.data : result, facilityHttpStatus(result));
}
