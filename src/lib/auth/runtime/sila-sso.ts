import {createHash, createHmac, randomBytes, timingSafeEqual} from "node:crypto";

import {z} from "zod";

import {
  AuthRoleSchema,
  SafeInternalPathSchema,
  type SilaSsoCallbackFailureCode,
} from "@/contracts/auth";
import type {AppLocale} from "@/i18n/routing";
import {type SessionCookieDefinition} from "@/lib/auth/runtime/cookie";
import {normalizeAuthRedirect, parseAppLocale, resolvePostLoginDestination} from "@/lib/auth/runtime/redirect";
import {createDatabaseSession} from "@/lib/auth/runtime/session";
import type {createPrismaClient} from "@/lib/db/client";

type PrismaClient = ReturnType<typeof createPrismaClient>;

const SILA_STATE_COOKIE = "fuspi.sila-sso";
const STATE_MAX_AGE_SECONDS = 10 * 60;
const DEFAULT_SCOPES = "openid profile email";
const DEFAULT_EMAIL_CLAIM = "email";
const DEFAULT_IDENTIFIER_CLAIM = "sub";
const DEFAULT_TIMEOUT_MS = 5_000;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;

const UrlSchema = z.string().trim().url().max(2_048).refine((value) => {
  const parsed = new URL(value);
  return parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
}, "SILA SSO URLs must use HTTPS outside localhost.").transform((value) => new URL(value).toString());

const EnabledConfigSchema = z.object({
  enabled: z.literal(true),
  authorizationUrl: UrlSchema,
  tokenUrl: UrlSchema,
  userinfoUrl: UrlSchema,
  clientId: z.string().trim().min(1).max(256),
  clientSecret: z.string().min(1).max(1_024),
  scopes: z.string().trim().min(1).max(512).default(DEFAULT_SCOPES),
  emailClaim: z.string().trim().min(1).max(128).default(DEFAULT_EMAIL_CLAIM),
  identifierClaim: z.string().trim().min(1).max(128).default(DEFAULT_IDENTIFIER_CLAIM),
  timeoutMs: z.coerce.number().int().min(500).max(15_000).default(DEFAULT_TIMEOUT_MS),
});

const UserinfoSchema = z.record(z.string(), z.unknown());

export type SilaSsoConfig = z.infer<typeof EnabledConfigSchema>;

export type SilaSsoStatePayload = Readonly<{
  state: string;
  verifier: string;
  locale: AppLocale;
  redirectTo: string;
  issuedAt: number;
}>;

export type SilaSsoStart = Readonly<{
  authorizationUrl: string;
  cookie: SessionCookieDefinition;
}>;

export type SilaSsoCallbackResult =
  | Readonly<{
      ok: true;
      redirectTo: string;
      cookie: SessionCookieDefinition;
    }>
  | Readonly<{
      ok: false;
      code: SilaSsoCallbackFailureCode;
      redirectTo: string;
    }>;

export function getSilaSsoConfig(env: Readonly<Record<string, string | undefined>> = process.env): SilaSsoConfig | null {
  if (env.SILA_SSO_ENABLED !== "true") return null;
  const parsed = EnabledConfigSchema.safeParse({
    enabled: true,
    authorizationUrl: env.SILA_SSO_AUTHORIZATION_URL,
    tokenUrl: env.SILA_SSO_TOKEN_URL,
    userinfoUrl: env.SILA_SSO_USERINFO_URL,
    clientId: env.SILA_SSO_CLIENT_ID,
    clientSecret: env.SILA_SSO_CLIENT_SECRET,
    scopes: env.SILA_SSO_SCOPES || DEFAULT_SCOPES,
    emailClaim: env.SILA_SSO_EMAIL_CLAIM || DEFAULT_EMAIL_CLAIM,
    identifierClaim: env.SILA_SSO_IDENTIFIER_CLAIM || DEFAULT_IDENTIFIER_CLAIM,
    timeoutMs: env.SILA_SSO_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  });
  return parsed.success ? parsed.data : null;
}

export function isSilaSsoAvailable(env: NodeJS.ProcessEnv = process.env) {
  return getSilaSsoConfig(env) !== null;
}

export function getSilaStateCookieName(production = process.env.NODE_ENV === "production") {
  return `${production ? "__Host-" : ""}${SILA_STATE_COOKIE}`;
}

export function createSilaCallbackUrl(authUrl = process.env.AUTH_URL) {
  if (!authUrl) return null;
  try {
    return new URL("/api/auth/sila/callback", authUrl).toString();
  } catch {
    return null;
  }
}

function toBase64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signStateBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function sealSilaState(payload: SilaSsoStatePayload, secret = process.env.AUTH_SECRET) {
  if (!secret) throw new Error("AUTH_SECRET is required for SILA SSO state.");
  const body = toBase64Url(JSON.stringify(payload));
  const signature = signStateBody(body, secret);
  return `${body}.${signature}`;
}

export function openSilaState(
  value: string | null | undefined,
  secret = process.env.AUTH_SECRET,
  now = Date.now(),
): SilaSsoStatePayload | null {
  if (!value || !secret) return null;
  const [body, signature, extra] = value.split(".");
  if (!body || !signature || extra || !BASE64URL_PATTERN.test(body) || !BASE64URL_PATTERN.test(signature)) return null;
  const expected = signStateBody(body, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
    const parsed = z.object({
      state: z.string().min(32).max(128),
      verifier: z.string().min(43).max(128),
      locale: z.enum(["id", "en", "ar"]),
      redirectTo: SafeInternalPathSchema,
      issuedAt: z.number().int().positive(),
    }).strict().safeParse(decoded);
    if (!parsed.success) return null;
    if (now - parsed.data.issuedAt > STATE_MAX_AGE_SECONDS * 1_000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function createEphemeralCookieDefinition(
  value: string,
  maxAge: number,
  production = process.env.NODE_ENV === "production",
): SessionCookieDefinition {
  const expires = new Date(Date.now() + maxAge * 1_000);
  return {
    name: getSilaStateCookieName(production),
    value,
    options: {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      path: "/",
      maxAge,
      expires,
    },
  };
}

export function createClearedSilaStateCookie(production = process.env.NODE_ENV === "production") {
  return createEphemeralCookieDefinition("", 0, production);
}

async function createPkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function createSilaSsoStart(
  config: SilaSsoConfig,
  options: Readonly<{
    authUrl?: string;
    locale: unknown;
    redirectTo: unknown;
    secret?: string;
    production?: boolean;
    now?: number;
  }>,
): Promise<SilaSsoStart | null> {
  const callbackUrl = createSilaCallbackUrl(options.authUrl);
  if (!callbackUrl) return null;
  const locale = parseAppLocale(options.locale);
  const redirectTo = normalizeAuthRedirect(options.redirectTo, locale);
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = await createPkceChallenge(verifier);
  const payload = sealSilaState({
    state,
    verifier,
    locale,
    redirectTo,
    issuedAt: options.now ?? Date.now(),
  }, options.secret);

  const authorizationUrl = new URL(config.authorizationUrl);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", config.clientId);
  authorizationUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizationUrl.searchParams.set("scope", config.scopes);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("code_challenge", challenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");

  return {
    authorizationUrl: authorizationUrl.toString(),
    cookie: createEphemeralCookieDefinition(payload, STATE_MAX_AGE_SECONDS, options.production),
  };
}

function failureRedirect(code: SilaSsoCallbackFailureCode, locale: AppLocale, redirectTo?: string): SilaSsoCallbackResult {
  const safe = redirectTo ?? `/${locale}/admin`;
  const url = new URL(`/${locale}/login`, "https://fuspi.invalid");
  url.searchParams.set("sso", code);
  url.searchParams.set("next", safe);
  return {
    ok: false,
    code,
    redirectTo: `${url.pathname}${url.search}`,
  };
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetcher: typeof fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {...init, signal: controller.signal, cache: "no-store"});
    if (!response.ok) return null;
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

const TokenResponseSchema = z.object({
  access_token: z.string().min(1).max(8_192),
  token_type: z.string().max(64).optional(),
}).passthrough();

function readClaim(userinfo: Record<string, unknown>, claim: string) {
  const value = userinfo[claim];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function finishSilaSsoCallback(
  config: SilaSsoConfig,
  options: Readonly<{
    prisma: PrismaClient;
    url: URL;
    stateCookie: string | null | undefined;
    authUrl?: string;
    secret?: string;
    production?: boolean;
    now?: number;
    fetcher?: typeof fetch;
  }>,
): Promise<SilaSsoCallbackResult> {
  const state = openSilaState(options.stateCookie, options.secret, options.now);
  const locale = state?.locale ?? "id";
  const redirectTo = state?.redirectTo ?? `/${locale}/admin`;
  const publicError = options.url.searchParams.get("error");
  const code = options.url.searchParams.get("code");
  const returnedState = options.url.searchParams.get("state");

  if (publicError) return failureRedirect("PROVIDER_REJECTED", locale, redirectTo);
  if (!state || !code || !returnedState || returnedState !== state.state) {
    return failureRedirect("STATE_INVALID", locale, redirectTo);
  }

  const callbackUrl = createSilaCallbackUrl(options.authUrl);
  if (!callbackUrl) return failureRedirect("AUTH_UNAVAILABLE", locale, redirectTo);

  try {
    const tokenJson = await fetchJson(
      config.tokenUrl,
      {
        method: "POST",
        headers: {"content-type": "application/x-www-form-urlencoded", accept: "application/json"},
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUrl,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code_verifier: state.verifier,
        }),
      },
      config.timeoutMs,
      options.fetcher ?? fetch,
    );
    const token = TokenResponseSchema.safeParse(tokenJson);
    if (!token.success) return failureRedirect("AUTH_UNAVAILABLE", locale, redirectTo);

    const userinfoJson = await fetchJson(
      config.userinfoUrl,
      {headers: {authorization: `Bearer ${token.data.access_token}`, accept: "application/json"}},
      config.timeoutMs,
      options.fetcher ?? fetch,
    );
    const userinfo = UserinfoSchema.safeParse(userinfoJson);
    if (!userinfo.success) return failureRedirect("AUTH_UNAVAILABLE", locale, redirectTo);

    const email = readClaim(userinfo.data, config.emailClaim)?.toLowerCase() ?? null;
    const subject = readClaim(userinfo.data, config.identifierClaim);
    if (!email || !subject) return failureRedirect("UNPROVISIONED", locale, redirectTo);

    const user = await options.prisma.user.findUnique({
      where: {email},
      select: {id: true, role: true, isActive: true, mustChangePassword: true},
    });
    if (!user || !user.isActive || !AuthRoleSchema.safeParse(user.role).success) {
      return failureRedirect("UNPROVISIONED", locale, redirectTo);
    }

    const issued = await createDatabaseSession(options.prisma, user.id, {production: options.production});
    const finalDestination = user.mustChangePassword
      ? `/${locale}/change-password?next=${encodeURIComponent(redirectTo)}`
      : resolvePostLoginDestination(user.role, redirectTo, locale);
    return {ok: true, redirectTo: finalDestination, cookie: issued.cookie};
  } catch {
    return failureRedirect("AUTH_UNAVAILABLE", locale, redirectTo);
  }
}
