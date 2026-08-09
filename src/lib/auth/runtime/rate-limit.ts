import type {createPrismaClient} from "@/lib/db/client";
import {
  LOGIN_RATE_LIMIT_BLOCK_MS,
  LOGIN_RATE_LIMIT_MAX_FAILURES,
  LOGIN_RATE_LIMIT_SCOPE,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from "@/lib/auth/runtime/config";
import {createHmacDigest} from "@/lib/security/hmac";

type PrismaClient = ReturnType<typeof createPrismaClient>;

export type LoginRateLimitKey = Readonly<{
  keyHash: string;
  scope: typeof LOGIN_RATE_LIMIT_SCOPE;
}>;

export function createLoginRateLimitKey(
  normalizedEmail: string,
  clientIp: string,
  emailHmacSecret: string,
  ipHmacSecret: string,
): LoginRateLimitKey {
  const emailDigest = createHmacDigest(normalizedEmail, emailHmacSecret);
  const ipDigest = createHmacDigest(clientIp, ipHmacSecret);
  return {keyHash: `${emailDigest}.${ipDigest}`, scope: LOGIN_RATE_LIMIT_SCOPE};
}

export function getLoginWindowStart(now: Date): Date {
  return new Date(
    Math.floor(now.getTime() / LOGIN_RATE_LIMIT_WINDOW_MS) *
      LOGIN_RATE_LIMIT_WINDOW_MS,
  );
}

export function getPublicFailureCodeForAttempt(attempt: number) {
  return attempt > LOGIN_RATE_LIMIT_MAX_FAILURES
    ? ("TRY_AGAIN_LATER" as const)
    : ("INVALID_CREDENTIALS" as const);
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === "P2002",
  );
}

export async function getLoginRateLimitState(
  prisma: PrismaClient,
  key: LoginRateLimitKey,
  now: Date,
) {
  const bucket = await prisma.rateLimitBucket.findUnique({
    where: {
      keyHash_scope_windowStart: {
        keyHash: key.keyHash,
        scope: key.scope,
        windowStart: getLoginWindowStart(now),
      },
    },
    select: {count: true, blockedUntil: true},
  });
  return {
    count: bucket?.count ?? 0,
    blocked: Boolean(bucket?.blockedUntil && bucket.blockedUntil > now),
  };
}

export async function registerFailedLoginAttempt(
  prisma: PrismaClient,
  key: LoginRateLimitKey,
  now: Date,
) {
  const windowStart = getLoginWindowStart(now);
  const where = {
    keyHash_scope_windowStart: {
      keyHash: key.keyHash,
      scope: key.scope,
      windowStart,
    },
  } as const;

  let bucket;
  try {
    bucket = await prisma.rateLimitBucket.upsert({
      where,
      create: {keyHash: key.keyHash, scope: key.scope, windowStart, count: 1},
      update: {count: {increment: 1}},
      select: {id: true, count: true, blockedUntil: true},
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    bucket = await prisma.rateLimitBucket.update({
      where,
      data: {count: {increment: 1}},
      select: {id: true, count: true, blockedUntil: true},
    });
  }

  if (bucket.count > LOGIN_RATE_LIMIT_MAX_FAILURES && !bucket.blockedUntil) {
    const blockedUntil = new Date(now.getTime() + LOGIN_RATE_LIMIT_BLOCK_MS);
    await prisma.rateLimitBucket.update({
      where: {id: bucket.id},
      data: {blockedUntil},
    });
    return {count: bucket.count, blockedUntil};
  }
  return {count: bucket.count, blockedUntil: bucket.blockedUntil};
}

export async function clearLoginRateLimit(prisma: PrismaClient, key: LoginRateLimitKey) {
  await prisma.rateLimitBucket.deleteMany({
    where: {keyHash: key.keyHash, scope: key.scope},
  });
}
