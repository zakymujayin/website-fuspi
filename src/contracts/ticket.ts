import {z} from "zod";

import {
  ComplaintCategory,
  TicketPriority,
  TicketStatus,
} from "@/generated/prisma/enums";
import {
  ActiveDatabaseSessionSchema,
  SessionInvalidResultSchema,
} from "@/contracts/auth";

const TICKET_NUMBER_PATTERN = /^FUSPI-\d{4}-\d{4,}$/u;
const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

export const TicketQuerySessionSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      session: ActiveDatabaseSessionSchema,
    })
    .strict(),
  SessionInvalidResultSchema,
]);

export const TicketIdQuerySchema = z
  .object({
    id: z.string().trim().min(1).max(191),
  })
  .strict();

export const TicketCollectionQuerySchema = z
  .object({
    page: z.number().int().min(1).max(10_000).default(1),
    pageSize: z.number().int().min(1).max(100).default(25),
    priority: z.enum(TicketPriority).optional(),
    status: z.enum(TicketStatus).optional(),
    assigneeId: z.string().trim().min(1).max(191).optional(),
  })
  .strict();

export const TicketSearchQuerySchema = z
  .object({
    term: z.string().trim().min(3).max(64),
    page: z.number().int().min(1).max(10_000).default(1),
    pageSize: z.number().int().min(1).max(100).default(25),
  })
  .strict();

export const TicketExportQuerySchema = z
  .object({
    priority: z.enum(TicketPriority).optional(),
    status: z.enum(TicketStatus).optional(),
    limit: z.number().int().min(1).max(1_000).default(1_000),
  })
  .strict();

export const TicketTrackingProbeSchema = z
  .object({
    ticketNumber: z.string().regex(TICKET_NUMBER_PATTERN),
    token: z.string().regex(TRACKING_TOKEN_PATTERN),
  })
  .strict();

export const TicketSafeFailureCodeSchema = z.enum([
  "INVALID_REQUEST",
  "NOT_FOUND",
  "UNAVAILABLE",
]);

export const TicketSummarySchema = z
  .object({
    id: z.string().min(1).max(191),
    ticketNumber: z.string().regex(TICKET_NUMBER_PATTERN),
    category: z.enum(ComplaintCategory),
    priority: z.enum(TicketPriority),
    status: z.enum(TicketStatus),
    assigneeId: z.string().min(1).max(191).nullable(),
    responseDueAt: z.date().nullable(),
    resolutionDueAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .strict();

export const GeneralTicketDetailSchema = TicketSummarySchema.extend({
  subject: z.string().max(500).nullable(),
  description: z.string().min(1).max(100_000),
  reporterIdentity: z.string().max(16_000).nullable(),
  resolution: z.string().max(100_000).nullable(),
}).strict();

export const PpksReplyViewSchema = z
  .object({
    id: z.string().min(1).max(191),
    authorId: z.string().min(1).max(191).nullable(),
    body: z.string().min(1).max(100_000),
    createdAt: z.date(),
  })
  .strict();

export const PpksAttachmentViewSchema = z
  .object({
    id: z.string().min(1).max(191),
    originalName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(191),
    size: z.number().int().min(1).max(5_242_880),
    createdAt: z.date(),
  })
  .strict();

export const PpksTicketDetailSchema = TicketSummarySchema.extend({
  category: z.literal("PELECEHAN_SEKSUAL"),
  subject: z.string().max(500).nullable(),
  description: z.string().min(1).max(100_000),
  reporterIdentity: z.string().max(16_000).nullable(),
  resolution: z.string().max(100_000).nullable(),
  replies: z.array(PpksReplyViewSchema).max(10_000),
  attachments: z.array(PpksAttachmentViewSchema).max(3),
}).strict();

export const TicketListResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: z
        .object({
          items: z.array(TicketSummarySchema),
          page: z.number().int().positive(),
          pageSize: z.number().int().positive(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: TicketSafeFailureCodeSchema,
    })
    .strict(),
]);

export const TicketDetailResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: z.union([GeneralTicketDetailSchema, PpksTicketDetailSchema]),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: TicketSafeFailureCodeSchema,
    })
    .strict(),
]);

export const TicketCountResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: z
        .object({
          count: z.number().int().min(0),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: TicketSafeFailureCodeSchema,
    })
    .strict(),
]);

const PpksStatusCountsSchema = z
  .object({
    BARU: z.number().int().min(0),
    DIVERIFIKASI: z.number().int().min(0),
    DIPROSES: z.number().int().min(0),
    MENUNGGU_PELAPOR: z.number().int().min(0),
    SELESAI: z.number().int().min(0),
    DITOLAK: z.number().int().min(0),
  })
  .strict();

export const PpksAggregateResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: z
        .object({
          total: z.number().int().min(0),
          active: z.number().int().min(0),
          byStatus: PpksStatusCountsSchema,
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: TicketSafeFailureCodeSchema,
    })
    .strict(),
]);

export const TicketExportResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: z
        .object({
          items: z.array(z.union([
            GeneralTicketDetailSchema,
            PpksTicketDetailSchema,
          ])).max(1_000),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: TicketSafeFailureCodeSchema,
    })
    .strict(),
]);

export const TicketTrackingResultSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      data: z
        .object({
          ticketNumber: z.string().regex(TICKET_NUMBER_PATTERN),
          priority: z.enum(TicketPriority),
          status: z.enum(TicketStatus),
          updatedAt: z.date(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: z.literal("NOT_FOUND"),
    })
    .strict(),
]);

export type TicketQuerySession = z.infer<typeof TicketQuerySessionSchema>;
export type TicketCollectionQuery = z.input<typeof TicketCollectionQuerySchema>;
export type TicketSearchQuery = z.input<typeof TicketSearchQuerySchema>;
export type TicketExportQuery = z.input<typeof TicketExportQuerySchema>;
export type TicketSummary = z.infer<typeof TicketSummarySchema>;
export type GeneralTicketDetail = z.infer<typeof GeneralTicketDetailSchema>;
export type PpksTicketDetail = z.infer<typeof PpksTicketDetailSchema>;
export type TicketListResult = z.infer<typeof TicketListResultSchema>;
export type TicketDetailResult = z.infer<typeof TicketDetailResultSchema>;
export type TicketCountResult = z.infer<typeof TicketCountResultSchema>;
export type PpksAggregateResult = z.infer<typeof PpksAggregateResultSchema>;
export type TicketExportResult = z.infer<typeof TicketExportResultSchema>;
export type TicketTrackingResult = z.infer<typeof TicketTrackingResultSchema>;
