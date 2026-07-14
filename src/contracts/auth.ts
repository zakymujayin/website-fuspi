import {z} from "zod";

export const AuthRoleSchema = z.enum([
  "ADMIN",
  "EDITOR",
  "PETUGAS",
  "SATGAS_PPKS",
]);

export const LoginCredentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(320),
    password: z.string().min(1).max(128),
  })
  .strict();

export const PublicLoginFailureCodeSchema = z.enum([
  "INVALID_CREDENTIALS",
  "TRY_AGAIN_LATER",
  "AUTH_UNAVAILABLE",
]);

export const SafeInternalPathSchema = z
  .string()
  .min(1)
  .max(2_048)
  .refine(
    (value) =>
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\") &&
      !/[\u0000-\u001f\u007f-\u009f]/u.test(value),
    "Redirect path must be an internal application path.",
  );

export const LoginResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    redirectTo: SafeInternalPathSchema,
    requiresPasswordChange: z.boolean(),
  }),
  z.object({
    ok: z.literal(false),
    code: PublicLoginFailureCodeSchema,
  }),
]);

export const SessionInvalidResultSchema = z
  .object({
    ok: z.literal(false),
    code: z.literal("SESSION_INVALID"),
  })
  .strict();

export const PasswordChangeFailureCodeSchema = z.enum([
  "SESSION_INVALID",
  "INVALID_CREDENTIALS",
  "PASSWORD_POLICY",
  "AUTH_UNAVAILABLE",
]);

export const PasswordChangeResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      redirectTo: SafeInternalPathSchema,
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: PasswordChangeFailureCodeSchema,
    })
    .strict(),
]);

export const ProtectedRouteDecisionSchema = z.discriminatedUnion("allow", [
  z.object({allow: z.literal(true)}).strict(),
  z
    .object({
      allow: z.literal(false),
      redirectTo: SafeInternalPathSchema,
    })
    .strict(),
]);

export const PasswordChangeInputSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
    confirmPassword: z.string().min(12).max(128),
  })
  .strict()
  .superRefine(({currentPassword, newPassword, confirmPassword}, context) => {
    if (newPassword !== confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Password confirmation does not match.",
      });
    }
    if (newPassword === currentPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must differ from the current password.",
      });
    }
  });

export const ActiveDatabaseSessionSchema = z
  .object({
    userId: z.string().min(1).max(191),
    role: AuthRoleSchema,
    isActive: z.literal(true),
    mustChangePassword: z.boolean(),
    expiresAt: z.date(),
  })
  .strict();

export const TicketDataScopeSchema = z.enum([
  "NON_PPKS",
  "PPKS_AGGREGATE",
  "PPKS_DETAIL",
]);

export const AuthorizationContextSchema = z
  .object({
    actor: ActiveDatabaseSessionSchema,
    resourceOwnerId: z.string().min(1).max(191).nullable().optional(),
    ticketScope: TicketDataScopeSchema.optional(),
  })
  .strict();

export type AuthRole = z.infer<typeof AuthRoleSchema>;
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;
export type LoginResult = z.infer<typeof LoginResultSchema>;
export type SessionInvalidResult = z.infer<typeof SessionInvalidResultSchema>;
export type PasswordChangeResult = z.infer<typeof PasswordChangeResultSchema>;
export type ProtectedRouteDecision = z.infer<typeof ProtectedRouteDecisionSchema>;
export type PasswordChangeInput = z.infer<typeof PasswordChangeInputSchema>;
export type ActiveDatabaseSession = z.infer<typeof ActiveDatabaseSessionSchema>;
export type AuthorizationContext = z.infer<typeof AuthorizationContextSchema>;
