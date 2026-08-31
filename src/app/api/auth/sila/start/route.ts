import {NextResponse} from "next/server";

import {createSilaSsoStart, getSilaSsoConfig} from "@/lib/auth/runtime/sila-sso";

export async function GET(request: Request) {
  const config = getSilaSsoConfig();
  if (!config) return new Response(null, {status: 404});

  const url = new URL(request.url);
  const start = await createSilaSsoStart(config, {
    authUrl: process.env.AUTH_URL,
    locale: url.searchParams.get("locale"),
    redirectTo: url.searchParams.get("next"),
  });
  if (!start) return new Response(null, {status: 404});

  const response = NextResponse.redirect(start.authorizationUrl, {status: 302});
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(start.cookie.name, start.cookie.value, start.cookie.options);
  return response;
}
