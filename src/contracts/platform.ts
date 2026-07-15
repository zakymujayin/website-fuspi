import {z} from "zod";

export const LocaleSchema = z.enum(["id", "en", "ar"]);

export const ActivityActionSchema = z.enum([
  "CREATE",
  "UPDATE",
  "PUBLISH",
  "ARCHIVE",
  "LOGIN",
  "LOGIN_FAILED",
  "VIEW_SENSITIVE",
  "EXPORT",
  "CHANGE_ROLE",
  "CHANGE_PASSWORD",
]);

export const ActivityLogInputSchema = z.object({
  actorId: z.string().min(1).nullable().optional(),
  action: ActivityActionSchema,
  resourceType: z.string().trim().min(1).max(80),
  resourceId: z.string().trim().min(1).max(191).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ContentRevisionInputSchema = z.object({
  resourceType: z.string().trim().min(1).max(80),
  resourceId: z.string().trim().min(1).max(191),
  locale: LocaleSchema.nullable().optional(),
  version: z.number().int().positive(),
  snapshot: z.record(z.string(), z.unknown()),
  changeSummary: z.string().trim().max(500).nullable().optional(),
  actorId: z.string().min(1).nullable().optional(),
});

export const EncryptedPayloadSchema = z.object({
  ciphertext: z.string().min(1),
  nonce: z.string().min(1),
  tag: z.string().min(1),
  keyVersion: z.number().int().positive(),
});

const OutboxBaseSchema = z.object({
  type: z.string().trim().min(1).max(80),
  recipient: z.string().trim().min(1).max(320),
  locale: LocaleSchema.default("id"),
  template: z.string().trim().min(1).max(120),
  idempotencyKey: z.string().trim().min(8).max(191),
  nextAttemptAt: z.date().optional(),
});

export const NotificationOutboxInputSchema = z.discriminatedUnion("sensitive", [
  OutboxBaseSchema.extend({
    sensitive: z.literal(false),
    payload: z.record(z.string(), z.unknown()),
  }),
  OutboxBaseSchema.extend({
    sensitive: z.literal(true),
    encryptedPayload: EncryptedPayloadSchema,
  }),
]);

export const OutboxWorkerConfigSchema = z
  .object({
    workerId: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9_-]+$/),
    batchSize: z.number().int().min(1).max(100).default(25),
    lockTimeoutMs: z.number().int().min(1_000).max(15 * 60_000).default(5 * 60_000),
    maxAttempts: z.literal(5).default(5),
    baseBackoffMs: z.number().int().min(1_000).max(60 * 60_000).default(60_000),
    maxBackoffMs: z.number().int().min(1_000).max(24 * 60 * 60_000).default(60 * 60_000),
  })
  .refine((value) => value.maxBackoffMs >= value.baseBackoffMs, {
    message: "Maximum backoff must not be shorter than base backoff.",
    path: ["maxBackoffMs"],
  });

export type ActivityLogInput = z.infer<typeof ActivityLogInputSchema>;
export type ContentRevisionInput = z.infer<typeof ContentRevisionInputSchema>;
export type NotificationOutboxInput = z.input<typeof NotificationOutboxInputSchema>;
export type OutboxWorkerConfig = z.input<typeof OutboxWorkerConfigSchema>;
