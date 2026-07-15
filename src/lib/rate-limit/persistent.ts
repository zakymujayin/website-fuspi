import {randomUUID} from "node:crypto";

import {Prisma} from "@/generated/prisma/client";

import {
  SharedRateLimitAllowedSchema,
  SharedRateLimitBlockedSchema,
  SharedRateLimitInputSchema,
  SharedRateLimitPolicySchema,
  type SharedRateLimitInput,
  type SharedRateLimitPolicy,
  type SharedRateLimitResult,
} from "@/contracts/operations";
import {createPrismaClient} from "@/lib/db/client";
import {createDomainSeparatedHmacDigest} from "@/lib/security/hmac";

type SharedRateLimitDatabase = ReturnType<typeof createPrismaClient>;

type RateLimitPolicyDefinition = Readonly<{
  scope: SharedRateLimitPolicy;
  limit: number;
  windowMs: number;
}>;

export const SHARED_RATE_LIMIT_POLICIES = Object.freeze({
  CONTACT_SUBMIT: {scope: "CONTACT_SUBMIT", limit: 5, windowMs: 60 * 60_000},
  SURVEY_SUBMIT: {scope: "SURVEY_SUBMIT", limit: 5, windowMs: 60 * 60_000},
  PPKS_SUBMIT: {scope: "PPKS_SUBMIT", limit: 10, windowMs: 24 * 60 * 60_000},
  AUTOCOMPLETE: {scope: "AUTOCOMPLETE", limit: 60, windowMs: 60_000},
  TICKET_TRACK_IP: {scope: "TICKET_TRACK_IP", limit: 10, windowMs: 15 * 60_000},
  TICKET_TRACK_NUMBER: {scope: "TICKET_TRACK_NUMBER", limit: 5, windowMs: 15 * 60_000},
} satisfies Record<SharedRateLimitPolicy, RateLimitPolicyDefinition>);

export function createSharedRateLimitKey(
  policy: SharedRateLimitPolicy,
  normalizedIdentifier: string,
  secret: string,
) {
  const parsedPolicy = SharedRateLimitPolicySchema.parse(policy);
  if (!normalizedIdentifier || normalizedIdentifier.length > 1_024) {
    throw new Error("Rate-limit identifier is invalid.");
  }
  return createDomainSeparatedHmacDigest(
    normalizedIdentifier,
    secret,
    `RATE_LIMIT_${parsedPolicy}`,
  );
}

export function getSharedRateLimitWindow(policy: SharedRateLimitPolicy, now: Date) {
  const parsed = SharedRateLimitInputSchema.pick({policy: true, now: true}).parse({policy, now});
  const definition = SHARED_RATE_LIMIT_POLICIES[parsed.policy];
  const windowStartMs = Math.floor(parsed.now.getTime() / definition.windowMs)
    * definition.windowMs;
  return {
    windowStart: new Date(windowStartMs),
    windowResetAt: new Date(windowStartMs + definition.windowMs),
  };
}

export async function consumeSharedRateLimit(
  database: SharedRateLimitDatabase,
  input: SharedRateLimitInput,
): Promise<SharedRateLimitResult> {
  const parsed = SharedRateLimitInputSchema.parse(input);
  const definition = SHARED_RATE_LIMIT_POLICIES[parsed.policy];
  const {windowStart, windowResetAt} = getSharedRateLimitWindow(parsed.policy, parsed.now);
  const rows = await database.$queryRaw<Array<{count: number}>>(Prisma.sql`
    INSERT INTO "RateLimitBucket" (
      "id", "keyHash", "scope", "windowStart", "count", "blockedUntil"
    )
    VALUES (
      ${randomUUID()}, ${parsed.keyHash}, ${definition.scope}, ${windowStart}, 1, NULL
    )
    ON CONFLICT ("keyHash", "scope", "windowStart")
    DO UPDATE SET
      "count" = "RateLimitBucket"."count" + 1,
      "blockedUntil" = CASE
        WHEN "RateLimitBucket"."count" + 1 > ${definition.limit}
          THEN ${windowResetAt}
        ELSE "RateLimitBucket"."blockedUntil"
      END
    RETURNING "count"
  `);
  const count = rows[0]?.count;
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("Rate-limit bucket result is invalid.");
  }
  if (count <= definition.limit) {
    return SharedRateLimitAllowedSchema.parse({
      allowed: true,
      remaining: definition.limit - count,
      windowResetAt,
    });
  }
  return SharedRateLimitBlockedSchema.parse({
    allowed: false,
    code: "RATE_LIMITED",
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowResetAt.getTime() - parsed.now.getTime()) / 1_000),
    ),
    windowResetAt,
  });
}
