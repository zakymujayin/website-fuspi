import NextAuth, {type NextAuthConfig} from "next-auth";

import type {AuthRole} from "@/contracts/auth";
import {createActiveSessionAdapter} from "@/lib/auth/runtime/adapter";
import {getSessionCookieName} from "@/lib/auth/runtime/cookie";
import {SESSION_MAX_AGE_SECONDS} from "@/lib/auth/runtime/config";
import {getPrismaClient} from "@/lib/db/client";

const prisma = getPrismaClient();
const production = process.env.NODE_ENV === "production";

export const AUTH_CREDENTIALS_DATABASE_SESSION_LIMITATION =
  "Auth.js 5.0.0-beta.31 rejects Credentials-only database strategy; " +
  "FUSPI uses its reviewed server-owned Credentials endpoint to issue opaque adapter sessions.";

export const authConfig = {
  adapter: createActiveSessionAdapter(prisma),
  providers: [],
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_MAX_AGE_SECONDS,
  },
  trustHost: true,
  useSecureCookies: production,
  cookies: {
    sessionToken: {
      name: getSessionCookieName(production),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: production,
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    },
  },
  callbacks: {
    session({session, user}) {
      const currentUser = user as typeof user & {
        role: AuthRole;
        isActive: boolean;
        mustChangePassword: boolean;
      };
      return {
        expires: session.expires,
        user: {
          id: currentUser.id,
          role: currentUser.role,
          isActive: true as const,
          mustChangePassword: currentUser.mustChangePassword,
        },
      };
    },
  },
  logger: {
    error() {},
    warn() {},
    debug() {},
  },
} satisfies NextAuthConfig;

export const {handlers, auth, signOut} = NextAuth(authConfig);
