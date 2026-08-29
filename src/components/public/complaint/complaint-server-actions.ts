"use server";

import {headers} from "next/headers";

import {createTicketQueryBoundary} from "@/features/tickets/query-isolation";
import {addPublicReply, getPublicTicket, submitPublicTicket} from "@/features/tickets/workflow";
import {getPrismaClient} from "@/lib/db/client";
import {createPpksKeyResolver} from "@/lib/tickets/ppks-encryption";
import {getTicketTrackingSecret} from "@/lib/tickets/tracking-secret";

/* Mirrors the public ticket route: the same secrets and the same client-address
   derivation, so the rate limit counts a submitter identically whichever entry
   point they arrive through. */
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

/* A PPKS report resolves to this reduced shape. docs/14 D1 keeps its content
   away from every public surface, but B and D2 still entitle an anonymous
   reporter to know their report is moving. Status, priority, and a timestamp
   are all that cross. */
export type TrackedStatusOnly = {
  ticketNumber: string;
  status: string;
  priority: string;
  updatedAt: string;
};

export type TrackState =
  | {status: "idle"}
  | {status: "found"; ticket: TrackedTicket; token: string}
  | {status: "status-only"; ticket: TrackedStatusOnly}
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
    getTicketTrackingSecret(),
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
/* Tracking never decrypts, so an absent key must not deny a reporter their
   status. The resolver is supplied when configured and left inert otherwise. */
function ppksResolver() {
  try {
    return createPpksKeyResolver();
  } catch {
    return () => undefined;
  }
}

async function trackStatusOnly(
  ticketNumber: string,
  token: string,
): Promise<TrackedStatusOnly | null> {
  try {
    const boundary = createTicketQueryBoundary({
      database: getPrismaClient(),
      resolveKey: ppksResolver(),
      trackingHmacSecret: getTicketTrackingSecret(),
    });
    const tracked = await boundary.tracking({ticketNumber, token});
    if (!tracked.ok) return null;
    return {
      ticketNumber: tracked.data.ticketNumber,
      status: tracked.data.status,
      priority: tracked.data.priority,
      updatedAt: tracked.data.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function trackComplaintAction(
  _prevState: TrackState,
  form: FormData,
): Promise<TrackState> {
  const token = text(form, "token");
  const ticketNumber = text(form, "ticketNumber");
  const prisma = getPrismaClient();

  const result = text(form, "intent") === "reply"
    ? await addPublicReply(prisma, ticketNumber, token, text(form, "body"), getTicketTrackingSecret())
    : await getPublicTicket(prisma, ticketNumber, token, getTicketTrackingSecret());

  if (result.ok) return {status: "found", ticket: serialise(result.data), token};

  /* The content view refuses PPKS by category, so a genuine PPKS reporter lands
     here holding a valid token. Fall through to the contentless status view
     before deciding the lookup failed. */
  if (result.code === "NOT_FOUND") {
    const tracked = await trackStatusOnly(ticketNumber, token);
    if (tracked) return {status: "status-only", ticket: tracked};
  }
  return {status: "error", code: failureCode(result.code)};
}
