import {describe, expect, it, vi} from "vitest";

import {
  executeAcademicPeopleImport,
  getAcademicEditorDetail,
  normalizeAcademicEditorSearchParams,
  type AcademicEditorImportDatabase,
} from "@/features/academic/editor-import";

const now = new Date("2026-08-04T03:00:00.000Z");
const admin = {userId: "admin-1", role: "ADMIN" as const, isActive: true as const, mustChangePassword: false, expiresAt: new Date("2026-08-04T04:00:00.000Z")};

function staffPayload(name = "Tendik Sintetis") {
  return {name, slug: "tendik-sintetis", nip: null, email: null, phone: null, photoMediaId: null, order: 0, isActive: true,
    translations: {id: {position: "Pranata", unit: "Akademik"}}};
}

function previewDatabase() {
  return {
    media: {findMany: vi.fn().mockResolvedValue([])},
    studyProgram: {findMany: vi.fn().mockResolvedValue([])},
    lecturer: {findMany: vi.fn().mockResolvedValue([])},
    staff: {findMany: vi.fn().mockResolvedValue([])},
    $transaction: vi.fn(),
  } as unknown as AcademicEditorImportDatabase;
}

describe("academic editor/import runtime boundaries", () => {
  it("normalizes a strict, duplicate-aware editor lookup", () => {
    expect(normalizeAcademicEditorSearchParams(new URLSearchParams("resource=LECTURER&id=lecturer-1")))
      .toEqual({ok: true, data: {resource: "LECTURER", id: "lecturer-1"}});
    expect(normalizeAcademicEditorSearchParams(new URLSearchParams("resource=LECTURER&id=one&id=two")))
      .toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(normalizeAcademicEditorSearchParams(new URLSearchParams("resource=LECTURER&id=one&include=password")))
      .toEqual({ok: false, code: "REQUEST_INVALID"});
  });

  it("rejects invalid sessions before lookup or import database access", async () => {
    const database = {lecturer: {findUnique: vi.fn()}, $transaction: vi.fn()} as unknown as AcademicEditorImportDatabase;
    for (const actor of [{...admin, role: "EDITOR" as const}, {...admin, expiresAt: now}, {...admin, mustChangePassword: true}, null]) {
      expect(await getAcademicEditorDetail(database, actor, {resource: "LECTURER", id: "lecturer-1"}, "/uploads", now))
        .toEqual({ok: false, code: "SESSION_INVALID"});
      expect(await executeAcademicPeopleImport(database, actor, {intent: "PREVIEW", atomic: true, rows: []}, now))
        .toEqual({ok: false, code: "SESSION_INVALID"});
    }
    expect(database.lecturer.findUnique).not.toHaveBeenCalled();
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("previews without writes and escapes spreadsheet-formula labels", async () => {
    const database = previewDatabase();
    const result = await executeAcademicPeopleImport(database, admin, {
      intent: "PREVIEW", atomic: true,
      rows: [{rowNumber: 1, resource: "STAFF", payload: staffPayload("=SUM(A:A)")}],
    }, now);
    expect(result).toMatchObject({ok: true, intent: "PREVIEW", committed: false, rows: [{status: "VALID", safeLabel: "'=SUM(A:A)"}]});
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("post-validates sanitized bios before any query or write", async () => {
    const database = previewDatabase();
    const result = await executeAcademicPeopleImport(database, admin, {
      intent: "COMMIT", atomic: true,
      rows: [{rowNumber: 1, resource: "LECTURER", payload: {
        name: "Dosen", slug: "dosen", nidn: null, nip: null, orcid: null,
        googleScholarUrl: null, sintaUrl: null, email: null, phone: null, photoMediaId: null,
        studyProgramId: null, order: 0, isActive: true,
        translations: {id: {position: null, expertise: null, bio: `<p>${"&".repeat(50_000)}</p>`, officeHours: null}},
      }}],
    }, now);
    expect(result).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.lecturer.findMany).not.toHaveBeenCalled();
  });

  it("maps thrown editor/import database details to UNAVAILABLE", async () => {
    const editorDb = {unit: {findUnique: () => Promise.reject(new Error("postgresql://secret@host/db"))}} as unknown as AcademicEditorImportDatabase;
    expect(await getAcademicEditorDetail(editorDb, admin, {resource: "UNIT", id: "unit-1"}, "/uploads", now))
      .toEqual({ok: false, code: "UNAVAILABLE"});
    const importDb = previewDatabase();
    vi.mocked(importDb.staff.findMany).mockRejectedValueOnce(new Error("postgresql://secret@host/db"));
    const result = await executeAcademicPeopleImport(importDb, admin, {intent: "PREVIEW", atomic: true, rows: [{rowNumber: 1, resource: "STAFF", payload: staffPayload()}]}, now);
    expect(result).toEqual({ok: false, code: "UNAVAILABLE"});
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });
});
