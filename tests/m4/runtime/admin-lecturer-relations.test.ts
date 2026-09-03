import {describe, expect, it, vi} from "vitest";

import {executeAdminLecturerRelationCommand} from "@/features/academic/lecturer-relations";

const admin = {
  userId: "admin-1",
  role: "ADMIN" as const,
  isActive: true as const,
  mustChangePassword: false as const,
  expiresAt: new Date("2099-01-01T00:00:00.000Z"),
};

function fakeDatabase() {
  const educationUpdate = vi.fn().mockResolvedValue({count: 1});
  const tx = {
    lecturer: {findUnique: vi.fn().mockResolvedValue({id: "lecturer-1"})},
    lecturerEducation: {
      aggregate: vi.fn().mockResolvedValue({_max: {order: 2}}),
      updateMany: educationUpdate,
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    lecturerPublication: {
      aggregate: vi.fn().mockResolvedValue({_max: {order: 2}}),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    activityLog: {create: vi.fn()},
  };
  const database = {
    $transaction: vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return {database, tx, educationUpdate};
}

describe("admin lecturer relation commands", () => {
  it("rejects a lecturer actor before touching the database", async () => {
    const database = {$transaction: vi.fn()};
    const result = await executeAdminLecturerRelationCommand(database as never, {
      ...admin,
      role: "DOSEN",
    }, {
      action: "EDUCATION_DELETE",
      lecturerId: "lecturer-1",
      id: "education-1",
    });

    expect(result).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("scopes updates by the lecturer selected by the ADMIN", async () => {
    const {database, educationUpdate} = fakeDatabase();
    const result = await executeAdminLecturerRelationCommand(database as never, admin, {
      action: "EDUCATION_UPDATE",
      lecturerId: "lecturer-1",
      id: "education-1",
      payload: {
        degree: "Ph.D.",
        field: "Islamic Studies",
        institution: "Synthetic University",
        city: "Serang",
        year: 2024,
      },
    });

    expect(result).toEqual({ok: true, action: "EDUCATION_UPDATE"});
    expect(educationUpdate).toHaveBeenCalledWith(expect.objectContaining({where: {id: "education-1", lecturerId: "lecturer-1"}}));
  });

  it("rejects malformed relation payloads without opening a transaction", async () => {
    const {database} = fakeDatabase();
    const result = await executeAdminLecturerRelationCommand(database as never, admin, {
      action: "PUBLICATION_CREATE",
      lecturerId: "lecturer-1",
      payload: {title: "", type: "NOT_A_PUBLICATION_TYPE"},
    });

    expect(result).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});
