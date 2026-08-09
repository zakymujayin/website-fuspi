import {beforeEach, describe, expect, it, vi} from "vitest";

const {authorizeMock} = vi.hoisted(() => ({
  authorizeMock: vi.fn(),
}));

vi.mock("@/lib/auth/runtime/authorization", () => ({
  authorize: authorizeMock,
}));

import {
  createTicketQueryBoundary,
  type TicketQueryDatabase,
} from "@/features/tickets/query-isolation";

describe("M4 ticket query authorization actions", () => {
  beforeEach(() => {
    authorizeMock.mockReset();
  });

  it("does not reuse VIEW authorization for an export", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const database = {
      session: {
        findUnique: vi.fn().mockResolvedValue({
          expires: new Date("2026-08-03T00:00:00.000Z"),
          user: {
            id: "admin-1",
            role: "ADMIN",
            isActive: true,
            mustChangePassword: false,
          },
        }),
      },
      ticket: {findMany},
    } as unknown as TicketQueryDatabase;
    const session = {
      sessionToken: "unit-admin-session",
    };
    authorizeMock.mockImplementation((_context, action, resource) => ({
      allowed: action === "VIEW" && resource === "TICKET",
      dataScope: action === "VIEW" && resource === "TICKET"
        ? "NON_PPKS"
        : "NONE",
    }));
    const boundary = createTicketQueryBoundary({
      database,
      resolveKey: () => undefined,
      trackingHmacSecret: "unit-test-secret",
      clock: () => new Date("2026-08-02T00:00:00.000Z"),
    });

    expect(await boundary.list(session, {})).toEqual({
      ok: true,
      data: {items: [], page: 1, pageSize: 25},
    });
    expect(findMany).toHaveBeenCalledTimes(1);

    expect(await boundary.export(session, {})).toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(authorizeMock).toHaveBeenCalledWith(
      expect.anything(),
      "EXPORT",
      "PPKS_TICKET",
    );
    expect(authorizeMock).toHaveBeenCalledWith(
      expect.anything(),
      "EXPORT",
      "TICKET",
    );
  });
});
