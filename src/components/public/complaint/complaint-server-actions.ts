"use server";

import {headers} from "next/headers";

import {addPublicReply, getPublicTicket, submitPublicTicket} from "@/features/tickets/workflow";
import {getPrismaClient} from "@/lib/db/client";

/* Mirrors the public ticket route: the same secrets and the same client-address
   derivation, so the rate limit counts a submitter identically whichever entry
   point they arrive through. */
const TRACKING_HMAC_SECRET = process.env.TRACKING_HMAC_SECRET ?? "dev-tracking-hmac-secret-min-32-chars!!";
const IP_HMAC_SECRET = process.env.IP_HMAC_SECRET ?? "dev-ip-hmac-secret-minimum-32chars!!";

async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded ? (forwarded.split(",")[0]?.trim() || "0.0.0.0") : "0.0.0.0";
}

export type ComplaintFailureCode =
  | "REQUEST_INVALID" | "RATE_LIMITED" | "NOT_FOUND" | "VALIDATION_FAILED" | "UNAVAILABLE";

export type SubmitState =
  | {status: "idle"}
  | {status: "submitted"; ticketNumber: string; trackingToken: string}
  | {status: "error"; code: ComplaintFailureCode};

export type TrackedReply = {id: string; body: string; createdAt: string};

export type TrackedTicket = {
  ticketNumber: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  resolution: string | null;
  replies: TrackedReply[];
  createdAt: string;
  updatedAt: string;
};

export type TrackState =
  | {status: "idle"}
  | {status: "found"; ticket: TrackedTicket; token: string}
  | {status: "error"; code: ComplaintFailureCode};

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function failureCode(code: unknown): ComplaintFailureCode {
  return code === "RATE_LIMITED" || code === "NOT_FOUND" || code === "VALIDATION_FAILED" || code === "UNAVAILABLE"
    ? code
    : "REQUEST_INVALID";
}

export async function submitComplaintAction(
  _prevState: SubmitState,
  form: FormData,
): Promise<SubmitState> {
  const result = await submitPublicTicket(
    getPrismaClient(),
    {
      category: text(form, "category"),
      subject: text(form, "subject"),
      description: text(form, "description"),
    },
    await clientIp(),
    IP_HMAC_SECRET,
    TRACKING_HMAC_SECRET,
  );

  if (!result.ok) return {status: "error", code: failureCode(result.code)};
  return {
    status: "submitted",
    ticketNumber: result.data.ticketNumber,
    trackingToken: result.data.trackingToken,
  };
}

/* Dates cross to the client as ISO strings so the server never decides how a
   reader's locale should render them. */
function serialise(data: {
  ticketNumber: string; category: string; priority: string; status: string;
  subject: string; description: string | null; resolution: string | null;
  replies: ReadonlyArray<{id: string; body: string | null; createdAt: Date}>;
  createdAt: Date; updatedAt: Date;
}): TrackedTicket {
  return {
    ticketNumber: data.ticketNumber,
    category: data.category,
    priority: data.priority,
    status: data.status,
    subject: data.subject,
    description: data.description ?? "",
    resolution: data.resolution,
    replies: data.replies.map((reply) => ({
      id: reply.id,
      body: reply.body ?? "",
      createdAt: reply.createdAt.toISOString(),
    })),
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  };
}

/**
 * Looking a ticket up and replying to it share one action, and therefore one
 * piece of state. Splitting them left a posted reply saved in the database but
 * missing from the view the reader was looking at, which reads as a failure and
 * invites them to send it twice.
 */
export async function trackComplaintAction(
  _prevState: TrackState,
  form: FormData,
): Promise<TrackState> {
  const token = text(form, "token");
  const ticketNumber = text(form, "ticketNumber");
  const prisma = getPrismaClient();

  const result = text(form, "intent") === "reply"
    ? await addPublicReply(prisma, ticketNumber, token, text(form, "body"), TRACKING_HMAC_SECRET)
    : await getPublicTicket(prisma, ticketNumber, token, TRACKING_HMAC_SECRET);

  if (!result.ok) return {status: "error", code: failureCode(result.code)};
  return {status: "found", ticket: serialise(result.data), token};
}
