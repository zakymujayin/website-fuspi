"use server";

import {getPublicBooking, submitBooking} from "@/features/booking/domain";
import {getPrismaClient} from "@/lib/db/client";

export type BookingFailureCode =
  | "REQUEST_INVALID" | "ROOM_NOT_FOUND" | "ROOM_INACTIVE" | "TIME_INVALID"
  | "TIME_OVERLAP" | "CAPACITY_EXCEEDED" | "OPERATING_HOURS" | "BLACKOUT"
  | "NOT_FOUND" | "UNAVAILABLE";

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

const CODES = new Set<BookingFailureCode>([
  "REQUEST_INVALID", "ROOM_NOT_FOUND", "ROOM_INACTIVE", "TIME_INVALID",
  "TIME_OVERLAP", "CAPACITY_EXCEEDED", "OPERATING_HOURS", "BLACKOUT",
  "NOT_FOUND", "UNAVAILABLE",
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
  });

  if (!result.ok) return {status: "error", code: failureCode(result.code)};
  return {
    status: "submitted",
    bookingNumber: result.bookingNumber,
    trackingToken: result.trackingToken,
  };
}

export async function trackBookingAction(
  _prevState: BookingTrackState,
  form: FormData,
): Promise<BookingTrackState> {
  const token = text(form, "token");
  const result = await getPublicBooking(getPrismaClient(), {
    bookingNumber: text(form, "bookingNumber"),
    token,
  });
  if (!result.ok) return {status: "error", code: failureCode(result.code)};

  /* The domain returns the discriminant alongside the data; only the data
     crosses to the client. */
  const {ok, ...booking} = result;
  void ok;
  return {status: "found", booking: booking as TrackedBooking, token};
}
