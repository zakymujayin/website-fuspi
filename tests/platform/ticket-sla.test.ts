import {describe, expect, it} from "vitest";

import {
  addJakartaBusinessDays,
  assessTicketSla,
  calculateTicketSla,
  recalculateTicketSla,
  resumeTicketSla,
  toJakartaDateKey,
} from "@/lib/sla/ticket";

describe("ticket SLA and Jakarta business calendar", () => {
  const fridayAtTen = new Date("2026-07-17T03:00:00.000Z");

  it("normalizes instants to Jakarta date keys", () => {
    expect(toJakartaDateKey(new Date("2026-07-17T16:59:59.000Z"))).toBe("2026-07-17");
    expect(toJakartaDateKey(new Date("2026-07-17T17:00:00.000Z"))).toBe("2026-07-18");
  });

  it("preserves Jakarta wall-clock time while skipping weekends and holidays", () => {
    expect(addJakartaBusinessDays(fridayAtTen, 2)).toEqual(
      new Date("2026-07-21T03:00:00.000Z"),
    );
    expect(addJakartaBusinessDays(fridayAtTen, 2, ["2026-07-20"])).toEqual(
      new Date("2026-07-22T03:00:00.000Z"),
    );
  });

  it.each([
    ["URGENT", "2026-07-20T03:00:00.000Z", "2026-07-22T03:00:00.000Z"],
    ["TINGGI", "2026-07-21T03:00:00.000Z", "2026-07-28T03:00:00.000Z"],
    ["SEDANG", "2026-07-22T03:00:00.000Z", "2026-07-31T03:00:00.000Z"],
    ["RENDAH", "2026-07-24T03:00:00.000Z", "2026-08-06T03:00:00.000Z"],
  ] as const)("calculates the frozen %s policy", (priority, response, resolution) => {
    expect(calculateTicketSla({priority, startedAt: fridayAtTen})).toEqual({
      responseDueAt: new Date(response),
      resolutionDueAt: new Date(resolution),
    });
  });

  it("rolls an urgent 24-hour landing over both weekend and an active holiday", () => {
    expect(calculateTicketSla({
      priority: "URGENT",
      startedAt: fridayAtTen,
      holidayDates: ["2026-07-20"],
    }).responseDueAt).toEqual(new Date("2026-07-21T03:00:00.000Z"));
  });

  it("recalculates from the priority-change instant instead of the original start", () => {
    expect(recalculateTicketSla(
      "TINGGI",
      new Date("2026-07-20T08:30:00.000Z"),
      ["2026-07-21"],
    )).toEqual({
      responseDueAt: new Date("2026-07-23T08:30:00.000Z"),
      resolutionDueAt: new Date("2026-07-30T08:30:00.000Z"),
    });
  });

  it("shifts only unfinished legs, accumulates whole seconds, and rolls off weekends", () => {
    const result = resumeTicketSla({
      deadlines: {
        responseDueAt: new Date("2026-07-17T03:00:00.000Z"),
        resolutionDueAt: new Date("2026-07-20T03:00:00.000Z"),
      },
      pausedAt: new Date("2026-07-16T03:00:00.000Z"),
      resumedAt: new Date("2026-07-17T03:00:00.001Z"),
      totalPausedSeconds: 9,
      firstRespondedAt: new Date("2026-07-16T04:00:00.000Z"),
    });

    expect(result.responseDueAt).toEqual(new Date("2026-07-17T03:00:00.000Z"));
    expect(result.resolutionDueAt).toEqual(new Date("2026-07-21T03:00:01.000Z"));
    expect(result.totalPausedSeconds).toBe(86_410);
  });

  it("rejects malformed holidays, reversed pauses, and unbounded day counts", () => {
    expect(() => calculateTicketSla({
      priority: "TINGGI",
      startedAt: fridayAtTen,
      holidayDates: ["2026-02-30"],
    })).toThrow();
    expect(() => resumeTicketSla({
      deadlines: calculateTicketSla({priority: "TINGGI", startedAt: fridayAtTen}),
      pausedAt: new Date("2026-07-18T00:00:00.000Z"),
      resumedAt: new Date("2026-07-17T00:00:00.000Z"),
    })).toThrow();
    expect(() => addJakartaBusinessDays(fridayAtTen, 367)).toThrow();
  });

  it("assesses completed, overdue, pending, and paused SLA legs", () => {
    const deadlines = {
      responseDueAt: new Date("2026-07-20T03:00:00.000Z"),
      resolutionDueAt: new Date("2026-07-24T03:00:00.000Z"),
    };
    expect(assessTicketSla({
      deadlines,
      now: new Date("2026-07-21T03:00:00.000Z"),
      firstRespondedAt: new Date("2026-07-20T03:00:00.000Z"),
    })).toEqual({response: "MET", resolution: "PENDING"});
    expect(assessTicketSla({
      deadlines,
      now: new Date("2026-07-25T03:00:00.000Z"),
      firstRespondedAt: new Date("2026-07-20T03:00:01.000Z"),
      closedAt: new Date("2026-07-24T03:00:01.000Z"),
    })).toEqual({response: "LATE", resolution: "LATE"});
    expect(assessTicketSla({
      deadlines,
      now: new Date("2026-07-25T03:00:00.000Z"),
      pausedAt: new Date("2026-07-19T03:00:00.000Z"),
    })).toEqual({response: "PAUSED", resolution: "PAUSED"});
  });
});
