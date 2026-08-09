import {admissionHttpStatus, listActiveAdmissionInfos} from "@/features/admission/domain";
import {getPrismaClient} from "@/lib/db/client";

const VALID_LOCALES = new Set(["id", "en", "ar"]);

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawLocale = url.searchParams.get("locale") ?? "id";
  const locale = VALID_LOCALES.has(rawLocale) ? (rawLocale as "id" | "en" | "ar") : "id";

  const result = await listActiveAdmissionInfos(getPrismaClient(), locale);
  return json(result.ok ? result.data : result, admissionHttpStatus(result));
}
