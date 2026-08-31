"use server";

import {cancelPublicBooking, getPublicBooking, submitBooking} from "@/features/booking/domain";
import {getPrismaClient} from "@/lib/db/client";
import {parseStorageRoots, stageUpload, validateAndTransformUpload} from "@/lib/storage";

export type BookingFailureCode =
  | "REQUEST_INVALID" | "ROOM_NOT_FOUND" | "ROOM_INACTIVE" | "TIME_INVALID"
  | "TIME_OVERLAP" | "CAPACITY_EXCEEDED" | "OPERATING_HOURS" | "BLACKOUT"
  | "NOT_FOUND" | "INVALID_STATE" | "UNAVAILABLE";

export type BookingSubmitState =
  | {status: "idle"}
  | {status: "submitted"; bookingNumber: string; trackingToken: string}
  | {status: "error"; code: BookingFailureCode};

export type TrackedBookingHistory = {
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
};

export type TrackedBooking = {
  bookingNumber: string;
  roomName: string;
  roomLocation: string | null;
  status: string;
  startTime: string;
  endTime: string;
  purpose: string;
  participantCount: number;
  createdAt: string;
  approvedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  history: TrackedBookingHistory[];
};

export type BookingTrackState =
  | {status: "idle"}
  | {status: "found"; booking: TrackedBooking; token: string}
  | {status: "error"; code: BookingFailureCode};

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

const CODES = new Set<BookingFailureCode>([
  "REQUEST_INVALID", "ROOM_NOT_FOUND", "ROOM_INACTIVE", "TIME_INVALID",
  "TIME_OVERLAP", "CAPACITY_EXCEEDED", "OPERATING_HOURS", "BLACKOUT",
  "NOT_FOUND", "INVALID_STATE", "UNAVAILABLE",
]);

function failureCode(code: unknown): BookingFailureCode {
  return typeof code === "string" && CODES.has(code as BookingFailureCode)
    ? (code as BookingFailureCode)
    : "REQUEST_INVALID";
}

/* The form collects wall-clock time the way a person on campus reads it. Jakarta
   runs at a fixed +07:00 with no daylight saving, so stamping the offset here is
   exact and keeps the stored instant unambiguous. */
function jakartaIso(date: string, time: string): string {
  return `${date}T${time}:00+07:00`;
}

export async function submitBookingAction(
  _prevState: BookingSubmitState,
  form: FormData,
): Promise<BookingSubmitState> {
  const date = text(form, "date");
  const startTime = text(form, "startTime");
  const endTime = text(form, "endTime");
  const participantCount = Number.parseInt(text(form, "participantCount"), 10);

  if (date === "" || startTime === "" || endTime === "") {
    return {status: "error", code: "TIME_INVALID"};
  }

  const applicationLetter = fileOrNull(form, "applicationLetter");
  if (!applicationLetter) return {status: "error", code: "REQUEST_INVALID"};

  let staged: Awaited<ReturnType<typeof stageUpload>> | null = null;
  try {
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

    const result = await submitBooking(getPrismaClient(), {
      roomId: text(form, "roomId"),
      requesterName: text(form, "requesterName"),
      requesterEmail: text(form, "requesterEmail"),
      requesterPhone: orNull(form, "requesterPhone"),
      organization: orNull(form, "organization"),
      purpose: text(form, "purpose"),
      participantCount: Number.isFinite(participantCount) ? participantCount : Number.NaN,
      startTime: jakartaIso(date, startTime),
      endTime: jakartaIso(date, endTime),
      applicationStorageKey: staged.storageKey,
    });

    if (!result.ok) {
      await staged.discard().catch(() => undefined);
      return {status: "error", code: failureCode(result.code)};
    }

    await staged.commit();
    return {
      status: "submitted",
      bookingNumber: result.bookingNumber,
      trackingToken: result.trackingToken,
    };
  } catch {
    if (staged) await staged.discard().catch(() => undefined);
    return {status: "error", code: "UNAVAILABLE"};
  }
}

export async function trackBookingAction(
  _prevState: BookingTrackState,
  form: FormData,
): Promise<BookingTrackState> {
  const token = text(form, "token");
  const bookingNumber = text(form, "bookingNumber");
  if (text(form, "intent") === "cancel") {
    const cancelled = await cancelPublicBooking(getPrismaClient(), {
      bookingNumber,
      token,
      reason: orNull(form, "cancelReason"),
    });
    if (!cancelled.ok) return {status: "error", code: failureCode(cancelled.code)};
  }
  const result = await getPublicBooking(getPrismaClient(), {
    bookingNumber,
    token,
  });
  if (!result.ok) return {status: "error", code: failureCode(result.code)};

  /* The domain returns the discriminant alongside the data; only the data
     crosses to the client. */
  const {ok, ...booking} = result;
  void ok;
  return {status: "found", booking: booking as TrackedBooking, token};
}
