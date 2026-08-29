import {cookies} from "next/headers";

import {readSessionToken} from "@/lib/auth/runtime/request-session";
import {getPrismaClient} from "@/lib/db/client";
import {createPpksKeyResolver} from "@/lib/tickets/ppks-encryption";
import {createTicketQueryBoundary} from "@/features/tickets/query-isolation";

const TRACKING_HMAC_SECRET = process.env.TRACKING_HMAC_SECRET
  ?? "dev-tracking-hmac-secret-min-32-chars!!";

/**
 * The single construction point for the ticket query boundary.
 *
 * Every PPKS read has to pass through this boundary: it is where the category
 * filter, the role check, and the access log live. Building it ad hoc in each
 * route would make it possible to forget one of the three, which `docs/14` D1
 * requires to be enforced centrally rather than per screen.
 */
export function getTicketQueryBoundary() {
  return createTicketQueryBoundary({
    database: getPrismaClient(),
    resolveKey: createPpksKeyResolver(),
    trackingHmacSecret: TRACKING_HMAC_SECRET,
  });
}

/** The caller's raw session token, which the boundary revalidates itself. */
export async function currentSessionToken(): Promise<string | undefined> {
  return readSessionToken(await cookies());
}
