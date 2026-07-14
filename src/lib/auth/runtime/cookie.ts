import {SESSION_MAX_AGE_SECONDS} from "@/lib/auth/runtime/config";

export type SessionCookieDefinition = Readonly<{
  name: string;
  value: string;
  options: Readonly<{
    httpOnly: true;
    secure: boolean;
    sameSite: "lax";
    path: "/";
    maxAge: number;
    expires: Date;
  }>;
}>;

export function getSessionCookieName(production = process.env.NODE_ENV === "production") {
  return `${production ? "__Secure-" : ""}authjs.session-token`;
}

export function createSessionCookieDefinition(
  sessionToken: string,
  expires: Date,
  production = process.env.NODE_ENV === "production",
): SessionCookieDefinition {
  return {
    name: getSessionCookieName(production),
    value: sessionToken,
    options: {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      expires,
    },
  };
}
