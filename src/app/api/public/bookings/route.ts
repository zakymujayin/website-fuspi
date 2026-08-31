import {
  bookingHttpStatus,
  getPublicBooking,
  submitBooking,
} from "@/features/booking/domain";
import {getPrismaClient} from "@/lib/db/client";
import {parseStorageRoots, stageUpload, validateAndTransformUpload} from "@/lib/storage";

const MAX_MULTIPART_BYTES = 12_582_912;

function json(value: unknown, status = 200) {
  return Response.json(value, {status, headers: {"Cache-Control": "no-store"}});
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function orNull(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value === "" ? null : value;
}

function fileOrNull(form: FormData, key: string): File | null {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function jakartaIso(date: string, time: string): string {
  return `${date}T${time}:00+07:00`;
}

function bookingIso(form: FormData, key: "startTime" | "endTime"): string {
  const value = text(form, key);
  const date = text(form, "date");
  return date !== "" && /^\d{2}:\d{2}$/u.test(value) ? jakartaIso(date, value) : value;
}

export async function POST(request: Request) {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.startsWith("multipart/form-data")) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, bookingHttpStatus(result));
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared < 0 || declared > MAX_MULTIPART_BYTES) {
    const result = {ok: false as const, code: "REQUEST_INVALID" as const};
    return json(result, bookingHttpStatus(result));
  }

  let staged: Awaited<ReturnType<typeof stageUpload>> | null = null;
  try {
    const form = await request.formData();
    const applicationLetter = fileOrNull(form, "applicationLetter");
    if (!applicationLetter) {
      const result = {ok: false as const, code: "REQUEST_INVALID" as const};
      return json(result, bookingHttpStatus(result));
    }

    const validated = await validateAndTransformUpload({
      bytes: new Uint8Array(await applicationLetter.arrayBuffer()),
      originalName: applicationLetter.name,
      declaredMime: applicationLetter.type,
      policy: "BOOKING_DOCUMENT",
    });
    staged = await stageUpload(validated, parseStorageRoots({
      PUBLIC: process.env.UPLOAD_DIR ?? "",
      PRIVATE: process.env.UPLOAD_PRIVATE_DIR ?? "",
      PPKS_PRIVATE: process.env.PPKS_PRIVATE_DIR ?? "",
    }));

    const participantCount = Number.parseInt(text(form, "participantCount"), 10);
    const result = await submitBooking(getPrismaClient(), {
      roomId: text(form, "roomId"),
      requesterName: text(form, "requesterName"),
      requesterEmail: text(form, "requesterEmail"),
      requesterPhone: orNull(form, "requesterPhone"),
      organization: orNull(form, "organization"),
      purpose: text(form, "purpose"),
      participantCount: Number.isFinite(participantCount) ? participantCount : Number.NaN,
      startTime: bookingIso(form, "startTime"),
      endTime: bookingIso(form, "endTime"),
      applicationStorageKey: staged.storageKey,
    });

    if (!result.ok) {
      await staged.discard().catch(() => undefined);
      return json(result, bookingHttpStatus(result));
    }

    await staged.commit();
    return json(result, bookingHttpStatus(result));
  } catch {
    if (staged) await staged.discard().catch(() => undefined);
    const result = {ok: false as const, code: "UNAVAILABLE" as const};
    return json(result, bookingHttpStatus(result));
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookingNumber = url.searchParams.get("bookingNumber") ?? "";
  const token = url.searchParams.get("token") ?? "";

  const result = await getPublicBooking(getPrismaClient(), {bookingNumber, token});
  return json(result, bookingHttpStatus(result));
}
