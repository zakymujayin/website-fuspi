import {createHmac, randomBytes, timingSafeEqual} from "node:crypto";

import {z} from "zod";

import {AuthRoleSchema, SafeInternalPathSchema, type AuthRole} from "@/contracts/auth";

const DEFAULT_HANDOFF_TTL_SECONDS = 60;
const DEFAULT_HANDOFF_ISSUER = "fuspi-web";
const DEFAULT_HANDOFF_AUDIENCE = "sila";
const DEFAULT_ALLOWED_ROLES: readonly AuthRole[] = [
  "ADMIN",
  "PETUGAS",
  "STAF_UMUM",
  "DEKAN",
  "WADEK",
  "KABAG",
  "DOSEN",
];

const HttpsOrLocalUrlSchema = z.string().trim().url().max(2_048).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
}, "SILA handoff URLs must use HTTPS outside localhost.").transform((value) => new URL(value).toString());

const ConfigSchema = z.object({
  enabled: z.literal(true),
  endpointUrl: HttpsOrLocalUrlSchema,
  fallbackUrl: HttpsOrLocalUrlSchema,
  sharedSecret: z.string().min(32).max(1_024),
  issuer: z.string().trim().min(1).max(128).default(DEFAULT_HANDOFF_ISSUER),
  audience: z.string().trim().min(1).max(128).default(DEFAULT_HANDOFF_AUDIENCE),
  ttlSeconds: z.coerce.number().int().min(15).max(300).default(DEFAULT_HANDOFF_TTL_SECONDS),
  allowedRoles: z.array(AuthRoleSchema).min(1).default([...DEFAULT_ALLOWED_ROLES]),
});

const HandoffPayloadSchema = z.object({
  iss: z.string().min(1).max(128),
  aud: z.string().min(1).max(128),
  sub: z.string().min(1).max(191),
  email: z.string().email().max(320),
  name: z.string().min(1).max(191),
  role: AuthRoleSchema,
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  jti: z.string().min(32).max(128),
}).strict();

export type SilaHandoffConfig = z.infer<typeof ConfigSchema>;
export type SilaHandoffPayload = z.infer<typeof HandoffPayloadSchema>;

export type SilaHandoffUser = Readonly<{
  id: string;
  email: string;
  name: string;
  role: AuthRole;
  isActive: boolean;
}>;

function parseAllowedRoles(value: string | undefined) {
  if (!value?.trim()) return [...DEFAULT_ALLOWED_ROLES];
  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

export function getSilaHandoffConfig(env: Readonly<Record<string, string | undefined>> = process.env): SilaHandoffConfig | null {
  if (env.SILA_HANDOFF_ENABLED !== "true") return null;
  const parsed = ConfigSchema.safeParse({
    enabled: true,
    endpointUrl: env.SILA_HANDOFF_URL,
    fallbackUrl: env.NEXT_PUBLIC_SILA_URL,
    sharedSecret: env.SILA_HANDOFF_SHARED_SECRET,
    issuer: env.SILA_HANDOFF_ISSUER || DEFAULT_HANDOFF_ISSUER,
    audience: env.SILA_HANDOFF_AUDIENCE || DEFAULT_HANDOFF_AUDIENCE,
    ttlSeconds: env.SILA_HANDOFF_TTL_SECONDS || DEFAULT_HANDOFF_TTL_SECONDS,
    allowedRoles: parseAllowedRoles(env.SILA_HANDOFF_ALLOWED_ROLES),
  });
  return parsed.success ? parsed.data : null;
}

export function isSilaHandoffAvailable(env: Readonly<Record<string, string | undefined>> = process.env) {
  return getSilaHandoffConfig(env) !== null;
}

function encodeBase64UrlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(unsignedToken: string, secret: string) {
  return createHmac("sha256", secret).update(unsignedToken).digest("base64url");
}

function createSignedToken(payload: SilaHandoffPayload, secret: string) {
  const header = encodeBase64UrlJson({alg: "HS256", typ: "JWT"});
  const body = encodeBase64UrlJson(payload);
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function verifySilaHandoffToken(
  token: string,
  config: Pick<SilaHandoffConfig, "sharedSecret" | "issuer" | "audience">,
  nowSeconds = Math.floor(Date.now() / 1_000),
): SilaHandoffPayload | null {
  const [header, body, signature, extra] = token.split(".");
  if (!header || !body || !signature || extra) return null;
  const unsigned = `${header}.${body}`;
  const expected = sign(unsigned, config.sharedSecret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const parsedHeader = z.object({alg: z.literal("HS256"), typ: z.literal("JWT")}).strict().safeParse(
      JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as unknown,
    );
    if (!parsedHeader.success) return null;
    const parsedPayload = HandoffPayloadSchema.safeParse(
      JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown,
    );
    if (!parsedPayload.success) return null;
    if (parsedPayload.data.iss !== config.issuer || parsedPayload.data.aud !== config.audience) return null;
    if (parsedPayload.data.exp <= nowSeconds) return null;
    return parsedPayload.data;
  } catch {
    return null;
  }
}

export function createSilaHandoffToken(
  config: SilaHandoffConfig,
  user: SilaHandoffUser,
  nowSeconds = Math.floor(Date.now() / 1_000),
) {
  if (!user.isActive || !config.allowedRoles.includes(user.role)) return null;
  return createSignedToken({
    iss: config.issuer,
    aud: config.audience,
    sub: user.id,
    email: user.email.toLowerCase(),
    name: user.name,
    role: user.role,
    iat: nowSeconds,
    exp: nowSeconds + config.ttlSeconds,
    jti: randomBytes(32).toString("base64url"),
  }, config.sharedSecret);
}

export function normalizeSilaNextPath(candidate: unknown) {
  const parsed = SafeInternalPathSchema.safeParse(candidate);
  if (!parsed.success) return "/dashboard";
  try {
    const decoded = decodeURIComponent(parsed.data);
    if (!SafeInternalPathSchema.safeParse(decoded).success) return "/dashboard";
  } catch {
    return "/dashboard";
  }
  return parsed.data.startsWith("/api/") || parsed.data.startsWith("/api?")
    ? "/dashboard"
    : parsed.data;
}

export function createSilaHandoffUrl(
  config: SilaHandoffConfig,
  token: string,
  next: unknown,
) {
  const destination = normalizeSilaNextPath(next);
  const url = new URL(config.endpointUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("next", destination);
  return url.toString();
}

export function resolveSilaFallbackUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
) {
  const parsed = HttpsOrLocalUrlSchema.safeParse(env.NEXT_PUBLIC_SILA_URL);
  return parsed.success ? parsed.data : null;
}
