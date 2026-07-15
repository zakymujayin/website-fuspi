import {
  HolidayDateKeysSchema,
  HolidayRangeSchema,
  TicketSlaCalculationInputSchema,
  TicketSlaDeadlinesSchema,
  TicketSlaResumeInputSchema,
  type TicketPriority,
  type TicketSlaCalculationInput,
  type TicketSlaDeadlines,
  type TicketSlaResumeInput,
} from "@/contracts/operations";
import {createPrismaClient} from "@/lib/db/client";

const JAKARTA_OFFSET_MS = 7 * 60 * 60_000;
const MAX_PAUSED_SECONDS = 2_147_483_647;

const SLA_POLICY: Record<TicketPriority, {response: number; resolution: number}> = {
  URGENT: {response: 1, resolution: 3},
  TINGGI: {response: 2, resolution: 7},
  SEDANG: {response: 3, resolution: 10},
  RENDAH: {response: 5, resolution: 14},
};

export type TicketSlaDatabase = ReturnType<typeof createPrismaClient>;
export type TicketSlaState = "PENDING" | "PAUSED" | "MET" | "LATE";

function jakartaLocalDate(instant: Date) {
  return new Date(instant.getTime() + JAKARTA_OFFSET_MS);
}

function fromJakartaLocalDate(local: Date) {
  return new Date(local.getTime() - JAKARTA_OFFSET_MS);
}

export function toJakartaDateKey(instant: Date) {
  const local = jakartaLocalDate(instant);
  const year = String(local.getUTCFullYear()).padStart(4, "0");
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addJakartaDays(instant: Date, days: number) {
  const local = jakartaLocalDate(instant);
  local.setUTCDate(local.getUTCDate() + days);
  return fromJakartaLocalDate(local);
}

function holidaySet(holidayDates: string[]) {
  return new Set(HolidayDateKeysSchema.parse(holidayDates));
}

function isBusinessDay(instant: Date, holidays: ReadonlySet<string>) {
  const local = jakartaLocalDate(instant);
  const weekday = local.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays.has(toJakartaDateKey(instant));
}

function rollForwardToBusinessDay(instant: Date, holidays: ReadonlySet<string>) {
  let candidate = new Date(instant);
  while (!isBusinessDay(candidate, holidays)) candidate = addJakartaDays(candidate, 1);
  return candidate;
}

export function addJakartaBusinessDays(
  instant: Date,
  days: number,
  holidayDates: string[] = [],
) {
  const start = TicketSlaCalculationInputSchema.shape.startedAt.parse(instant);
  if (!Number.isInteger(days) || days < 0 || days > 366) {
    throw new Error("Business-day count must be an integer between zero and 366.");
  }
  const holidays = holidaySet(holidayDates);
  let candidate = new Date(start);
  let included = 0;
  while (included < days) {
    candidate = addJakartaDays(candidate, 1);
    if (isBusinessDay(candidate, holidays)) included += 1;
  }
  return candidate;
}

export function calculateTicketSla(
  input: TicketSlaCalculationInput,
): TicketSlaDeadlines {
  const parsed = TicketSlaCalculationInputSchema.parse(input);
  const holidays = holidaySet(parsed.holidayDates);
  const policy = SLA_POLICY[parsed.priority];
  const responseDueAt = parsed.priority === "URGENT"
    ? rollForwardToBusinessDay(
        new Date(parsed.startedAt.getTime() + 24 * 60 * 60_000),
        holidays,
      )
    : addJakartaBusinessDays(parsed.startedAt, policy.response, parsed.holidayDates);
  const resolutionDueAt = addJakartaBusinessDays(
    parsed.startedAt,
    policy.resolution,
    parsed.holidayDates,
  );
  return TicketSlaDeadlinesSchema.parse({responseDueAt, resolutionDueAt});
}

export function recalculateTicketSla(
  priority: TicketPriority,
  changedAt: Date,
  holidayDates: string[] = [],
) {
  return calculateTicketSla({priority, startedAt: changedAt, holidayDates});
}

export function resumeTicketSla(input: TicketSlaResumeInput) {
  const parsed = TicketSlaResumeInputSchema.parse(input);
  const elapsedSeconds = Math.ceil(
    (parsed.resumedAt.getTime() - parsed.pausedAt.getTime()) / 1_000,
  );
  const totalPausedSeconds = parsed.totalPausedSeconds + elapsedSeconds;
  if (totalPausedSeconds > MAX_PAUSED_SECONDS) {
    throw new Error("Cumulative SLA pause exceeds the database boundary.");
  }
  const holidays = holidaySet(parsed.holidayDates);
  const shift = (deadline: Date) => rollForwardToBusinessDay(
    new Date(deadline.getTime() + elapsedSeconds * 1_000),
    holidays,
  );
  return {
    responseDueAt: parsed.firstRespondedAt
      ? parsed.deadlines.responseDueAt
      : shift(parsed.deadlines.responseDueAt),
    resolutionDueAt: parsed.closedAt
      ? parsed.deadlines.resolutionDueAt
      : shift(parsed.deadlines.resolutionDueAt),
    totalPausedSeconds,
  };
}

function assessSlaLeg(input: {
  dueAt: Date;
  completedAt?: Date | null;
  now: Date;
  pausedAt?: Date | null;
}): TicketSlaState {
  if (input.completedAt) return input.completedAt <= input.dueAt ? "MET" : "LATE";
  const effectiveNow = input.pausedAt && input.pausedAt < input.now
    ? input.pausedAt
    : input.now;
  if (effectiveNow > input.dueAt) return "LATE";
  return input.pausedAt ? "PAUSED" : "PENDING";
}

export function assessTicketSla(input: {
  deadlines: TicketSlaDeadlines;
  now: Date;
  firstRespondedAt?: Date | null;
  closedAt?: Date | null;
  pausedAt?: Date | null;
}) {
  const deadlines = TicketSlaDeadlinesSchema.parse(input.deadlines);
  const now = TicketSlaCalculationInputSchema.shape.startedAt.parse(input.now);
  return {
    response: assessSlaLeg({
      dueAt: deadlines.responseDueAt,
      completedAt: input.firstRespondedAt,
      now,
      pausedAt: input.pausedAt,
    }),
    resolution: assessSlaLeg({
      dueAt: deadlines.resolutionDueAt,
      completedAt: input.closedAt,
      now,
      pausedAt: input.pausedAt,
    }),
  } as const;
}

export async function loadActiveHolidayDateKeys(
  database: TicketSlaDatabase,
  range: {from: string; through: string},
) {
  const parsed = HolidayRangeSchema.parse(range);
  const rows = await database.holiday.findMany({
    where: {
      isActive: true,
      date: {
        gte: new Date(`${parsed.from}T00:00:00.000Z`),
        lte: new Date(`${parsed.through}T00:00:00.000Z`),
      },
    },
    select: {date: true},
    orderBy: {date: "asc"},
  });
  return rows.map((row) => row.date.toISOString().slice(0, 10));
}
