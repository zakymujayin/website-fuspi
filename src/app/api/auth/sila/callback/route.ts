import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";

import {getPrismaClient} from "@/lib/db/client";
import {
  createClearedSilaStateCookie,
  finishSilaSsoCallback,
  getSilaSsoConfig,
  getSilaStateCookieName,
} from "@/lib/auth/runtime/sila-sso";

export async function GET(request: NextRequest) {
  const config = getSilaSsoConfig();
  if (!config) return new Response(null, {status: 404});

  const url = new URL(request.url);
  const stateCookie = request.cookies.get(getSilaStateCookieName())?.value;

  const result = await finishSilaSsoCallback(config, {
    prisma: getPrismaClient(),
    url,
    stateCookie,
    authUrl: process.env.AUTH_URL,
  });

  const response = NextResponse.redirect(new URL(result.redirectTo, request.url), {status: 302});
  response.headers.set("Cache-Control", "no-store");
  const cleared = createClearedSilaStateCookie();
  response.cookies.set(cleared.name, cleared.value, cleared.options);
  if (result.ok) {
    response.cookies.set(result.cookie.name, result.cookie.value, result.cookie.options);
  }
  return response;
}
