"use server";

import {headers} from "next/headers";

import {submitPpksReport} from "@/features/tickets/workflow";
import {getPrismaClient} from "@/lib/db/client";
import {getPpksSealingKey} from "@/lib/tickets/ppks-encryption";

const TRACKING_HMAC_SECRET = process.env.TRACKING_HMAC_SECRET ?? "dev-tracking-hmac-secret-min-32-chars!!";
const IP_HMAC_SECRET = process.env.IP_HASH_SECRET ?? "dev-ip-hmac-secret-minimum-32chars!!";

/* Only the HMAC of the address is ever stored, per docs/14 D5: never a raw IP. */
async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded ? (forwarded.split(",")[0]?.trim() || "0.0.0.0") : "0.0.0.0";
}

export type PpksSubmitState =
  | {status: "idle"}
  | {status: "submitted"; ticketNumber: string; trackingToken: string}
  | {status: "error"; code: "REQUEST_INVALID" | "RATE_LIMITED" | "UNAVAILABLE"};

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function orNull(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value === "" ? null : value;
}

export async function submitPpksReportAction(
  _prevState: PpksSubmitState,
  form: FormData,
): Promise<PpksSubmitState> {
  let sealingKey;
  try {
    sealingKey = getPpksSealingKey();
  } catch {
    /* Refusing is the safe outcome: without a usable key the report could only
       be stored readable. The reporter is told the channel is unavailable and
       pointed at the emergency contacts on the page, never at a configuration detail. */
    return {status: "error", code: "UNAVAILABLE"};
  }

  const role = text(form, "reporterRole");
  const result = await submitPpksReport(
    getPrismaClient(),
    {
      subject: orNull(form, "subject"),
      description: text(form, "description"),
      reporterIdentity: orNull(form, "reporterIdentity"),
      reporterRole: role === "KORBAN" || role === "SAKSI" || role === "PIHAK_KETIGA" ? role : null,
      immediateDanger: form.get("immediateDanger") === "on",
    },
    await clientIp(),
    IP_HMAC_SECRET,
    TRACKING_HMAC_SECRET,
    sealingKey,
  );

  if (!result.ok) {
    return {
      status: "error",
      code: result.code === "RATE_LIMITED" ? "RATE_LIMITED"
        : result.code === "REQUEST_INVALID" ? "REQUEST_INVALID"
        : "UNAVAILABLE",
    };
  }
  return {
    status: "submitted",
    ticketNumber: result.data.ticketNumber,
    trackingToken: result.data.trackingToken,
  };
}
