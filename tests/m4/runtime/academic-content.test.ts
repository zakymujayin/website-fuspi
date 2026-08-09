import {describe, expect, it, vi} from "vitest";

import {
  executeAcademicContentCommand,
  listAcademicContent,
  listPublicAcademicContent,
  normalizeAcademicContentSearchParams,
  type AcademicContentDatabase,
} from "@/features/academic/content";

const now = new Date("2026-08-04T03:00:00.000Z");
const admin = {userId: "admin-1", role: "ADMIN" as const, isActive: true as const, mustChangePassword: false, expiresAt: new Date("2026-08-04T04:00:00.000Z")};

describe("academic content runtime boundaries", () => {
  it("normalizes strict year and relation filters", () => {
    expect(normalizeAcademicContentSearchParams(new URLSearchParams("resource=RESEARCH&year=2026&studyProgramId=program-1"))).toEqual({ok: true, data: {
      resource: "RESEARCH", page: 1, pageSize: 20, search: "", direction: "DESC", active: "ALL", studyProgramId: "program-1", year: 2026,
    }});
    expect(normalizeAcademicContentSearchParams(new URLSearchParams("resource=UNIT&year=2026&year=2027"))).toEqual({ok: false, code: "REQUEST_INVALID"});
  });

  it("rejects invalid sessions before database access", async () => {
    const database = {$transaction: vi.fn()} as unknown as AcademicContentDatabase;
    for (const actor of [{...admin, role: "EDITOR" as const}, {...admin, mustChangePassword: true}, {...admin, expiresAt: now}, null]) {
      expect(await listAcademicContent(database, actor, {resource: "UNIT"}, now)).toEqual({ok: false, code: "SESSION_INVALID"});
    }
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("rejects resources owned by the people endpoint", async () => {
    const database = {$transaction: vi.fn()} as unknown as AcademicContentDatabase;
    expect(await executeAcademicContentCommand(database, admin, {action: "DELETE", resource: "LECTURER", id: "lecturer-1"}, now))
      .toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("revalidates sanitizer expansion before starting a write", async () => {
    const database = {$transaction: vi.fn()} as unknown as AcademicContentDatabase;
    expect(await executeAcademicContentCommand(database, admin, {
      action: "CREATE", resource: "RESEARCH", payload: {
        slug: "synthetic-research", year: 2026, documentUrl: null, lecturerIds: [],
        translations: {id: {title: "Synthetic", abstract: `<p>${"&".repeat(50_000)}</p>`}},
      },
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("keeps public input strict and rejects private external targets", async () => {
    const database = {$transaction: vi.fn()} as unknown as AcademicContentDatabase;
    expect(await listPublicAcademicContent(database, {resource: "UNIT", injected: {phone: {not: null}}}, "id"))
      .toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(await executeAcademicContentCommand(database, admin, {
      action: "CREATE", resource: "UNIT", payload: {
        slug: "unsafe-unit", type: "LABORATORIUM", email: null, phone: null,
        externalUrl: {kind: "EXTERNAL", href: "https://127.0.0.1/admin"}, isActive: true,
        contentOwnerId: null, translations: {id: {name: "Unsafe", description: null}},
      },
    }, now)).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});
