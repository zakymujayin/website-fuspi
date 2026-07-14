import {compare, hash} from "bcryptjs";

import {
  ActiveDatabaseSessionSchema,
  AuthRoleSchema,
  PasswordChangeInputSchema,
  type ActiveDatabaseSession,
  type AuthRole,
} from "@/contracts/auth";
import type {Prisma} from "@/generated/prisma/client";
import {authorize} from "@/lib/auth/runtime/authorization";
import type {createPrismaClient} from "@/lib/db/client";

type PrismaClient = ReturnType<typeof createPrismaClient>;

const COMMON_PASSWORDS = new Set([
  "password1234",
  "password12345",
  "admin12345678",
  "administrator123",
  "qwerty123456",
  "qwertyuiop123",
  "123456789012",
  "1234567890123456",
  "indonesia123",
  "sayang123456",
  "bismillah123",
  "fuspi12345678",
]);

export type SecurityMutationResult =
  | Readonly<{ok: true}>
  | Readonly<{
      ok: false;
      code:
        | "SESSION_INVALID"
        | "NOT_AUTHORIZED"
        | "INVALID_CREDENTIALS"
        | "PASSWORD_POLICY"
        | "AUTH_UNAVAILABLE";
    }>;

function canChangePassword(actor: ActiveDatabaseSession, userId: string) {
  return authorize(
    {actor, resourceOwnerId: userId},
    "CHANGE_PASSWORD",
    "USER",
  ).allowed;
}

function passesAdditionalPasswordPolicy(password: string, email: string) {
  const normalized = password.toLowerCase();
  return normalized !== email.toLowerCase() && !COMMON_PASSWORDS.has(normalized);
}

async function getActiveActor(
  tx: Prisma.TransactionClient,
  sessionToken: string,
  now = new Date(),
) {
  const record = await tx.session.findUnique({
    where: {sessionToken},
    select: {
      expires: true,
      user: {
        select: {id: true, role: true, isActive: true, mustChangePassword: true},
      },
    },
  });
  if (!record || record.expires <= now || !record.user.isActive) {
    await tx.session.deleteMany({where: {sessionToken}});
    return null;
  }
  const parsed = ActiveDatabaseSessionSchema.safeParse({
    userId: record.user.id,
    role: record.user.role,
    isActive: record.user.isActive,
    mustChangePassword: record.user.mustChangePassword,
    expiresAt: record.expires,
  });
  return parsed.success ? parsed.data : null;
}

export async function changeOwnPassword(
  prisma: PrismaClient,
  actorSessionToken: string,
  rawInput: unknown,
): Promise<SecurityMutationResult> {
  const parsed = PasswordChangeInputSchema.safeParse(rawInput);
  if (!parsed.success) return {ok: false, code: "PASSWORD_POLICY"};
  try {
    return await prisma.$transaction(async (tx) => {
      const actor = await getActiveActor(tx, actorSessionToken);
      if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
      if (!canChangePassword(actor, actor.userId)) {
        return {ok: false, code: "NOT_AUTHORIZED"} as const;
      }
      const user = await tx.user.findUnique({
        where: {id: actor.userId},
        select: {email: true, passwordHash: true, isActive: true},
      });
      if (!user?.isActive || !user.passwordHash) {
        return {ok: false, code: "SESSION_INVALID"} as const;
      }
      if (!(await compare(parsed.data.currentPassword, user.passwordHash))) {
        return {ok: false, code: "INVALID_CREDENTIALS"} as const;
      }
      if (!passesAdditionalPasswordPolicy(parsed.data.newPassword, user.email)) {
        return {ok: false, code: "PASSWORD_POLICY"} as const;
      }

      const passwordHash = await hash(parsed.data.newPassword, 12);
      await tx.user.update({
        where: {id: actor.userId},
        data: {passwordHash, mustChangePassword: false},
      });
      await tx.session.deleteMany({where: {userId: actor.userId}});
      return {ok: true} as const;
    });
  } catch {
    return {ok: false, code: "AUTH_UNAVAILABLE"};
  }
}

export async function changeUserRole(
  prisma: PrismaClient,
  actorSessionToken: string,
  userId: string,
  nextRole: AuthRole | unknown,
): Promise<SecurityMutationResult> {
  const role = AuthRoleSchema.safeParse(nextRole);
  if (!role.success) return {ok: false, code: "NOT_AUTHORIZED"};
  try {
    return await prisma.$transaction(async (tx) => {
      const actor = await getActiveActor(tx, actorSessionToken);
      if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
      if (!authorize({actor, resourceOwnerId: userId}, "CHANGE_ROLE", "USER").allowed) {
        return {ok: false, code: "NOT_AUTHORIZED"} as const;
      }
      await tx.user.update({where: {id: userId}, data: {role: role.data}});
      await tx.session.deleteMany({where: {userId}});
      return {ok: true} as const;
    });
  } catch {
    return {ok: false, code: "AUTH_UNAVAILABLE"};
  }
}

export async function setUserActiveState(
  prisma: PrismaClient,
  actorSessionToken: string,
  userId: string,
  isActive: boolean,
): Promise<SecurityMutationResult> {
  if (typeof isActive !== "boolean") return {ok: false, code: "NOT_AUTHORIZED"};
  try {
    return await prisma.$transaction(async (tx) => {
      const actor = await getActiveActor(tx, actorSessionToken);
      if (!actor) return {ok: false, code: "SESSION_INVALID"} as const;
      if (!authorize({actor, resourceOwnerId: userId}, "UPDATE", "USER").allowed) {
        return {ok: false, code: "NOT_AUTHORIZED"} as const;
      }
      await tx.user.update({where: {id: userId}, data: {isActive}});
      if (!isActive) await tx.session.deleteMany({where: {userId}});
      return {ok: true} as const;
    });
  } catch {
    return {ok: false, code: "AUTH_UNAVAILABLE"};
  }
}
