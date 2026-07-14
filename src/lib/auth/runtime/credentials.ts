import {compare} from "bcryptjs";

import {
  LoginCredentialsSchema,
  SafeInternalPathSchema,
  type LoginResult,
} from "@/contracts/auth";
import {DUMMY_BCRYPT_HASH, getAuthSecrets} from "@/lib/auth/runtime/config";
import {
  clearLoginRateLimit,
  createLoginRateLimitKey,
  getLoginRateLimitState,
  getPublicFailureCodeForAttempt,
  registerFailedLoginAttempt,
} from "@/lib/auth/runtime/rate-limit";
import type {createPrismaClient} from "@/lib/db/client";

type PrismaClient = ReturnType<typeof createPrismaClient>;
type CredentialUser = Readonly<{
  id: string;
  passwordHash: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}>;

export type CredentialComparison = Readonly<{
  hash: string;
  eligible: boolean;
}>;

export function selectCredentialComparison(
  user: CredentialUser | null,
): CredentialComparison {
  return {
    hash: user?.passwordHash ?? DUMMY_BCRYPT_HASH,
    eligible: Boolean(user?.passwordHash && user.isActive),
  };
}

export type AuthenticateCredentialsOptions = Readonly<{
  prisma: PrismaClient;
  rawCredentials: unknown;
  clientIp: string;
  redirectTo?: string;
  now?: Date;
  emailHmacSecret?: string;
  ipHmacSecret?: string;
  comparePassword?: typeof compare;
  issueSession: (userId: string) => Promise<void>;
}>;

export async function authenticateCredentials(
  options: AuthenticateCredentialsOptions,
): Promise<LoginResult> {
  const parsed = LoginCredentialsSchema.safeParse(options.rawCredentials);
  if (!parsed.success) return {ok: false, code: "INVALID_CREDENTIALS"};

  const redirect = SafeInternalPathSchema.safeParse(options.redirectTo ?? "/id/admin");
  const redirectTo = redirect.success ? redirect.data : "/id/admin";
  const now = options.now ?? new Date();

  try {
    const configuredSecrets =
      options.emailHmacSecret && options.ipHmacSecret
        ? {
            emailHmacSecret: options.emailHmacSecret,
            ipHmacSecret: options.ipHmacSecret,
          }
        : getAuthSecrets();
    const rateLimitKey = createLoginRateLimitKey(
      parsed.data.email,
      options.clientIp,
      configuredSecrets.emailHmacSecret,
      configuredSecrets.ipHmacSecret,
    );

    const user = await options.prisma.user.findUnique({
      where: {email: parsed.data.email},
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        mustChangePassword: true,
      },
    });
    const comparison = selectCredentialComparison(user);
    const passwordMatches = await (options.comparePassword ?? compare)(
      parsed.data.password,
      comparison.hash,
    );
    const state = await getLoginRateLimitState(options.prisma, rateLimitKey, now);

    if (state.blocked) return {ok: false, code: "TRY_AGAIN_LATER"};

    if (!comparison.eligible || !passwordMatches || !user) {
      const attempt = await registerFailedLoginAttempt(
        options.prisma,
        rateLimitKey,
        now,
      );
      return {ok: false, code: getPublicFailureCodeForAttempt(attempt.count)};
    }

    await clearLoginRateLimit(options.prisma, rateLimitKey);
    await options.issueSession(user.id);
    return {
      ok: true,
      redirectTo,
      requiresPasswordChange: user.mustChangePassword,
    };
  } catch {
    return {ok: false, code: "AUTH_UNAVAILABLE"};
  }
}
