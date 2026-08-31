import {NextResponse} from "next/server";

import {getRequestSession} from "@/lib/auth/runtime/request-session";
import {
  createSilaHandoffToken,
  createSilaHandoffUrl,
  getSilaHandoffConfig,
  resolveSilaFallbackUrl,
} from "@/lib/auth/runtime/sila-handoff";
import {parseAppLocale} from "@/lib/auth/runtime/redirect";
import {getPrismaClient} from "@/lib/db/client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = parseAppLocale(url.searchParams.get("locale"));
  const fallback = resolveSilaFallbackUrl();
  const config = getSilaHandoffConfig();

  if (!config) {
    if (fallback) return NextResponse.redirect(fallback, {status: 302});
    return NextResponse.redirect(new URL(`/${locale}/layanan`, request.url), {status: 302});
  }

  const session = await getRequestSession();
  if (!session.ok) {
    return NextResponse.redirect(config.fallbackUrl, {status: 302});
  }

  const user = await getPrismaClient().user.findUnique({
    where: {id: session.session.userId},
    select: {id: true, email: true, name: true, role: true, isActive: true},
  });
  if (!user) return NextResponse.redirect(config.fallbackUrl, {status: 302});

  const token = createSilaHandoffToken(config, user);
  if (!token) return NextResponse.redirect(config.fallbackUrl, {status: 302});

  const response = NextResponse.redirect(
    createSilaHandoffUrl(config, token, url.searchParams.get("next")),
    {status: 302},
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
