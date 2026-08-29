"use server";

import {revalidatePath} from "next/cache";

import {executeBookingCommand} from "@/features/booking/domain";
import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";

export type BookingAdminActionState =
  | {status: "idle"}
  | {status: "saved"}
  | {status: "error"; code: string};

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value === "" ? null : value;
}

export async function executeBookingAdminAction(
  _prevState: BookingAdminActionState,
  form: FormData,
): Promise<BookingAdminActionState> {
  const session = await getRequestSession();
  const expectedVersion = Number.parseInt(text(form, "expectedVersion"), 10);
  const actionName = text(form, "action");
  const bookingId = text(form, "bookingId");
  const version = Number.isSafeInteger(expectedVersion) ? expectedVersion : Number.NaN;
  const reason = optionalText(form, "reason");
  const command =
    actionName === "APPROVE"
      ? {action: "APPROVE" as const, bookingId, expectedVersion: version}
      : actionName === "REJECT"
        ? {action: "REJECT" as const, bookingId, expectedVersion: version, reason}
        : actionName === "CANCEL"
          ? {action: "CANCEL" as const, bookingId, expectedVersion: version, reason}
          : {action: actionName, bookingId, expectedVersion: version};
  const result = await executeBookingCommand(
    getPrismaClient(),
    session.ok ? session.session : null,
    command,
  );

  if (!result.ok) return {status: "error", code: result.code};
  revalidatePath("/id/admin/peminjaman");
  revalidatePath("/en/admin/peminjaman");
  revalidatePath("/ar/admin/peminjaman");
  return {status: "saved"};
}
