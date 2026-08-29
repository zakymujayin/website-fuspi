"use server";

import {headers} from "next/headers";

import {submitPpksReport} from "@/features/tickets/workflow";
import {getPrismaClient} from "@/lib/db/client";
import {parseStorageRoots, validatePpksAttachmentUpload} from "@/lib/storage";
import {getPpksSealingKey} from "@/lib/tickets/ppks-encryption";
import {getTicketTrackingSecret} from "@/lib/tickets/tracking-secret";

const MAX_PPKS_ATTACHMENTS = 3;

/* Only the HMAC of the address is ever stored, per docs/14 D5: never a raw IP. */
async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded ? (forwarded.split(",")[0]?.trim() || "0.0.0.0") : "0.0.0.0";
}

function getIpHmacSecret(): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw new Error("IP_HASH_SECRET is not configured.");
  return secret;
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

function submittedFiles(form: FormData): File[] {
  return form.getAll("attachments").filter((value): value is File =>
    value instanceof File && value.size > 0,
  );
}

export async function submitPpksReportAction(
  _prevState: PpksSubmitState,
  form: FormData,
): Promise<PpksSubmitState> {
  let sealingKey;
  let ipHmacSecret: string;
  let trackingHmacSecret: string;
  try {
    sealingKey = getPpksSealingKey();
    ipHmacSecret = getIpHmacSecret();
    trackingHmacSecret = getTicketTrackingSecret();
  } catch {
    /* Refusing is the safe outcome: without a usable key the report could only
       be stored readable. The reporter is told the channel is unavailable and
       pointed at the emergency contacts on the page, never at a configuration detail. */
    return {status: "error", code: "UNAVAILABLE"};
  }

  const files = submittedFiles(form);
  if (files.length > MAX_PPKS_ATTACHMENTS) return {status: "error", code: "REQUEST_INVALID"};
  const attachments: Awaited<ReturnType<typeof validatePpksAttachmentUpload>>[] = [];
  try {
    for (const file of files) {
      attachments.push(await validatePpksAttachmentUpload({
        bytes: new Uint8Array(await file.arrayBuffer()),
        originalName: file.name,
        declaredMime: file.type,
      }));
    }
  } catch {
    return {status: "error", code: "REQUEST_INVALID"};
  }
  const storageRoots = attachments.length > 0
    ? (() => {
        try {
          return parseStorageRoots({
            PUBLIC: process.env.UPLOAD_DIR ?? "",
            PRIVATE: process.env.UPLOAD_PRIVATE_DIR ?? "",
            PPKS_PRIVATE: process.env.PPKS_PRIVATE_DIR ?? "",
          });
        } catch {
          return null;
        }
      })()
    : undefined;
  if (attachments.length > 0 && !storageRoots) return {status: "error", code: "UNAVAILABLE"};

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
    ipHmacSecret,
    trackingHmacSecret,
    sealingKey,
    {
      attachments,
      storageRoots: storageRoots ?? undefined,
      notificationRecipient: process.env.PPKS_NOTIFICATION_EMAIL ?? null,
    },
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
