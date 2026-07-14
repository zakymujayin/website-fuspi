import {cookies} from "next/headers";

import type {
  ProtectedRouteDecision,
  SessionInvalidResult,
} from "@/contracts/auth";
import type {AppLocale} from "@/i18n/routing";
import {getSessionCookieName} from "@/lib/auth/runtime/cookie";
import {normalizeAuthRedirect} from "@/lib/auth/runtime/redirect";
import {
  validateDatabaseSession,
  type SessionValidationResult,
} from "@/lib/auth/runtime/session";
import {
  getPrismaClient,
  type createPrismaClient,
} from "@/lib/db/client";

type PrismaClient = ReturnType<typeof createPrismaClient>;
type CookieReader = Readonly<{
  get(name: string): {value: string} | undefined;
}>;

const SESSION_INVALID: SessionInvalidResult = Object.freeze({
  ok: false,
  code: "SESSION_INVALID",
});

export function readSessionToken(
  cookieStore: CookieReader,
  production = process.env.NODE_ENV === "production",
) {
  return cookieStore.get(getSessionCookieName(production))?.value;
}

export async function validateRequestSession(
  prisma: PrismaClient,
  cookieStore: CookieReader,
  production = process.env.NODE_ENV === "production",
): Promise<SessionValidationResult> {
  const token = readSessionToken(cookieStore, production);
  return token ? validateDatabaseSession(prisma, token) : SESSION_INVALID;
}

export async function getRequestSession(): Promise<SessionValidationResult> {
  return validateRequestSession(getPrismaClient(), await cookies());
}

export function decideProtectedRoute(
  session: SessionValidationResult,
  locale: AppLocale,
  requestedPath: unknown,
): ProtectedRouteDecision {
  const destination = normalizeAuthRedirect(requestedPath, locale);
  if (!session.ok) {
    return {
      allow: false,
      redirectTo: `/${locale}/login?next=${encodeURIComponent(destination)}`,
    };
  }
  if (session.session.mustChangePassword) {
    return {
      allow: false,
      redirectTo: `/${locale}/change-password?next=${encodeURIComponent(destination)}`,
    };
  }
  return {allow: true};
}
