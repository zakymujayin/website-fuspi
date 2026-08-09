import {bookingHttpStatus, listPublicRooms} from "@/features/booking/domain";
import {getPrismaClient} from "@/lib/db/client";

function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {"Cache-Control": "public, max-age=300, s-maxage=600"},
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en"
    : url.searchParams.get("locale") === "ar" ? "ar"
    : "id";

  const result = await listPublicRooms(getPrismaClient(), locale);
  return json(result, bookingHttpStatus(result));
}
