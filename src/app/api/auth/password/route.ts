import {NextRequest, NextResponse} from "next/server";

import {
  PasswordChangeResultSchema,
  type PasswordChangeResult,
} from "@/contracts/auth";
import {getSessionCookieName} from "@/lib/auth/runtime/cookie";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {changeOwnPassword} from "@/lib/auth/runtime/password";
import {normalizeAuthRedirect, parseAppLocale} from "@/lib/auth/runtime/redirect";
import {createDatabaseSession} from "@/lib/auth/runtime/session";
import {getPrismaClient} from "@/lib/db/client";
import type {SessionCookieDefinition} from "@/lib/auth/runtime/cookie";

async function readInput(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return request.json();
  return Object.fromEntries(await request.formData());
}

function publicFailure(
  code: "SESSION_INVALID" | "INVALID_CREDENTIALS" | "PASSWORD_POLICY" | "AUTH_UNAVAILABLE",
): PasswordChangeResult {
  return {ok: false, code};
}

function createResponse(result: PasswordChangeResult, status: number) {
  const parsed = PasswordChangeResultSchema.parse(result);
  const response = NextResponse.json(parsed, {status});
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request.headers)) {
    return new Response(null, {status: 403});
  }

  const requestUrl = new URL(request.url);
  const locale = parseAppLocale(requestUrl.searchParams.get("locale"));
  const sessionToken = request.cookies.get(getSessionCookieName())?.value;
  if (!sessionToken) {
    return createResponse(publicFailure("SESSION_INVALID"), 401);
  }

  let input: unknown;
  try {
    input = await readInput(request);
  } catch {
    input = null;
  }

  const prisma = getPrismaClient();
  let issuedCookie: SessionCookieDefinition | undefined;
  const result = await changeOwnPassword(prisma, sessionToken, input, {
    async afterSessionRevocation(tx, userId) {
      const issued = await createDatabaseSession(tx, userId);
      issuedCookie = issued.cookie;
    },
  });
  if (result.ok) {
    const response = createResponse(
      {
        ok: true,
        redirectTo: normalizeAuthRedirect(
          requestUrl.searchParams.get("redirectTo"),
          locale,
        ),
      },
      200,
    );
    if (!issuedCookie) return createResponse(publicFailure("AUTH_UNAVAILABLE"), 503);
    response.cookies.set(issuedCookie.name, issuedCookie.value, issuedCookie.options);
    return response;
  }

  if (result.code === "SESSION_INVALID" || result.code === "NOT_AUTHORIZED") {
    const response = createResponse(publicFailure("SESSION_INVALID"), 401);
    clearSessionCookie(response);
    return response;
  }
  if (result.code === "INVALID_CREDENTIALS") {
    return createResponse(publicFailure("INVALID_CREDENTIALS"), 400);
  }
  if (result.code === "PASSWORD_POLICY") {
    return createResponse(publicFailure("PASSWORD_POLICY"), 400);
  }
  return createResponse(publicFailure("AUTH_UNAVAILABLE"), 503);
}
