import createMiddleware from "next-intl/middleware";
import type {NextRequest} from "next/server";

import {routing} from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  request.headers.set("x-fuspi-pathname", request.nextUrl.pathname);
  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
