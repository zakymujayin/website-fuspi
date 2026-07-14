import {NextResponse} from "next/server";

import {authenticateCredentials} from "@/lib/auth/runtime/credentials";
import {isSameOriginRequest} from "@/lib/auth/runtime/csrf";
import {
  createDatabaseSession,
} from "@/lib/auth/runtime/session";
import type {SessionCookieDefinition} from "@/lib/auth/runtime/cookie";
import {getPrismaClient} from "@/lib/db/client";

function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const value = headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  return value.slice(0, 128);
}

async function readCredentials(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return request.json();
  return Object.fromEntries(await request.formData());
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request.headers)) {
    return new Response(null, {status: 403});
  }

  let rawCredentials: unknown;
  try {
    rawCredentials = await readCredentials(request);
  } catch {
    rawCredentials = null;
  }

  const prisma = getPrismaClient();
  let issuedCookie: SessionCookieDefinition | undefined;
  const result = await authenticateCredentials({
    prisma,
    rawCredentials,
    clientIp: getClientIp(request.headers),
    redirectTo: new URL(request.url).searchParams.get("redirectTo") ?? undefined,
    async issueSession(userId) {
      const issued = await createDatabaseSession(prisma, userId);
      issuedCookie = issued.cookie;
    },
  });

  const status = result.ok
    ? 200
    : result.code === "INVALID_CREDENTIALS"
      ? 401
      : result.code === "TRY_AGAIN_LATER"
        ? 429
        : 503;
  const response = NextResponse.json(result, {status});
  response.headers.set("Cache-Control", "no-store");
  if (!result.ok && result.code === "TRY_AGAIN_LATER") {
    response.headers.set("Retry-After", "1800");
  }
  if (result.ok && issuedCookie) {
    response.cookies.set(issuedCookie.name, issuedCookie.value, issuedCookie.options);
  }
  return response;
}
