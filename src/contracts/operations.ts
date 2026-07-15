import {z} from "zod";

import {TicketPriority as PrismaTicketPriority} from "@/generated/prisma/enums";

export const AnnualSequenceKindSchema = z.enum(["TICKET", "BOOKING"]);

export const AnnualSequenceInputSchema = z.object({
  kind: AnnualSequenceKindSchema,
  occurredAt: z.date(),
});

export const AnnualSequenceAllocationSchema = z.object({
  kind: AnnualSequenceKindSchema,
  year: z.number().int().min(1).max(9_999),
  value: z.number().int().positive().max(2_147_483_647),
  reference: z.string().regex(/^(?:FUSPI|PJM)-\d{4}-\d{4,}$/),
});

export const HolidayDateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => {
    const [year, month, day] = value.split("-").map(Number);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    return candidate.getUTCFullYear() === year
      && candidate.getUTCMonth() === month - 1
      && candidate.getUTCDate() === day;
  },
  {message: "Holiday date must be a real ISO calendar date."},
);

export const HolidayDateKeysSchema = z.array(HolidayDateKeySchema).max(3_660);

export const TicketPrioritySchema = z.enum(PrismaTicketPriority);

export const TicketSlaCalculationInputSchema = z.object({
  priority: TicketPrioritySchema,
  startedAt: z.date(),
  holidayDates: HolidayDateKeysSchema.default([]),
});

export const TicketSlaDeadlinesSchema = z.object({
  responseDueAt: z.date(),
  resolutionDueAt: z.date(),
});

export const TicketSlaResumeInputSchema = z
  .object({
    deadlines: TicketSlaDeadlinesSchema,
    pausedAt: z.date(),
    resumedAt: z.date(),
    totalPausedSeconds: z.number().int().min(0).max(2_147_483_647).default(0),
    firstRespondedAt: z.date().nullable().optional(),
    closedAt: z.date().nullable().optional(),
    holidayDates: HolidayDateKeysSchema.default([]),
  })
  .refine((value) => value.resumedAt >= value.pausedAt, {
    message: "SLA resume time must not precede pause time.",
    path: ["resumedAt"],
  });

export const HolidayRangeSchema = z
  .object({
    from: HolidayDateKeySchema,
    through: HolidayDateKeySchema,
  })
  .refine((value) => value.through >= value.from, {
    message: "Holiday range end must not precede its start.",
    path: ["through"],
  });

export const OptimisticResourceSchema = z.enum(["Post", "Page", "Booking"]);

export const OptimisticLockInputSchema = z.object({
  resource: OptimisticResourceSchema,
  id: z.string().trim().min(1).max(191),
  expectedVersion: z.number().int().positive().max(2_147_483_646),
});

export const OptimisticConflictSchema = z.object({
  ok: z.literal(false),
  code: z.literal("VERSION_CONFLICT"),
});

export const OptimisticClaimSchema = z.object({
  ok: z.literal(true),
  previousVersion: z.number().int().positive().max(2_147_483_646),
  nextVersion: z.number().int().min(2).max(2_147_483_647),
});

export type AnnualSequenceKind = z.infer<typeof AnnualSequenceKindSchema>;
export type AnnualSequenceInput = z.input<typeof AnnualSequenceInputSchema>;
export type AnnualSequenceAllocation = z.infer<typeof AnnualSequenceAllocationSchema>;
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;
export type TicketSlaCalculationInput = z.input<typeof TicketSlaCalculationInputSchema>;
export type TicketSlaDeadlines = z.infer<typeof TicketSlaDeadlinesSchema>;
export type TicketSlaResumeInput = z.input<typeof TicketSlaResumeInputSchema>;
export type OptimisticLockInput = z.input<typeof OptimisticLockInputSchema>;
export type OptimisticClaim = z.infer<typeof OptimisticClaimSchema>;
export type OptimisticConflict = z.infer<typeof OptimisticConflictSchema>;
