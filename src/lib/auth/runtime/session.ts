import {randomBytes} from "node:crypto";

import type {Prisma} from "@/generated/prisma/client";
import type {ActiveDatabaseSession, SessionInvalidResult} from "@/contracts/auth";
import {ActiveDatabaseSessionSchema} from "@/contracts/auth";
import {SESSION_MAX_AGE_SECONDS} from "@/lib/auth/runtime/config";
import {createSessionCookieDefinition} from "@/lib/auth/runtime/cookie";
import type {createPrismaClient} from "@/lib/db/client";

type PrismaClient = ReturnType<typeof createPrismaClient>;
type PrismaSessionClient = PrismaClient | Prisma.TransactionClient;
const SESSION_INVALID: SessionInvalidResult = Object.freeze({
  ok: false,
  code: "SESSION_INVALID",
});

export type SessionValidationResult =
  | Readonly<{ok: true; session: ActiveDatabaseSession}>
  | SessionInvalidResult;

export async function createDatabaseSession(
  prisma: PrismaSessionClient,
  userId: string,
  options: Readonly<{
    now?: Date;
    production?: boolean;
    tokenFactory?: () => string;
  }> = {},
) {
  const now = options.now ?? new Date();
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1_000);
  const sessionToken = options.tokenFactory?.() ?? randomBytes(32).toString("base64url");
  await prisma.session.create({data: {sessionToken, userId, expires}});
  return {
    expires,
    cookie: createSessionCookieDefinition(sessionToken, expires, options.production),
  };
}

export async function validateDatabaseSession(
  prisma: PrismaClient,
  sessionToken: string | null | undefined,
  now = new Date(),
): Promise<SessionValidationResult> {
  if (!sessionToken) return SESSION_INVALID;
  const record = await prisma.session.findUnique({
    where: {sessionToken},
    select: {
      expires: true,
      user: {
        select: {id: true, role: true, isActive: true, mustChangePassword: true},
      },
    },
  });
  if (!record || record.expires <= now || !record.user.isActive) {
    await prisma.session.deleteMany({where: {sessionToken}});
    return SESSION_INVALID;
  }
  const parsed = ActiveDatabaseSessionSchema.safeParse({
    userId: record.user.id,
    role: record.user.role,
    isActive: record.user.isActive,
    mustChangePassword: record.user.mustChangePassword,
    expiresAt: record.expires,
  });
  return parsed.success ? {ok: true, session: parsed.data} : SESSION_INVALID;
}

export async function revokeAllUserSessions(prisma: PrismaClient, userId: string) {
  return prisma.session.deleteMany({where: {userId}});
}
