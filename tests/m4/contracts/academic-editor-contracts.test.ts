import {describe, expect, it} from "vitest";

import {
  AcademicEditorDetailSchema,
  AcademicImportSafeCellSchema,
  AcademicPeopleImportRequestSchema,
  AcademicPeopleImportResultSchema,
} from "@/contracts/academic-editor";

const workflow = [{locale: "id", status: "DRAFT", sourceVersion: 1, translatorId: "admin-1", reviewerId: null, reviewedAt: null}] as const;

function lecturerPayload(slug = "dosen-sintetis", nip: string | null = "nip-1") {
  return {
    name: "Dosen Sintetis", slug, nidn: "nidn-1", nip, orcid: null,
    googleScholarUrl: null, sintaUrl: null, email: "dosen@example.test", phone: null,
    photoMediaId: null, studyProgramId: null, order: 0, isActive: true,
    translations: {id: {position: "Lektor", expertise: null, bio: null, officeHours: null}},
  };
}

function staffPayload(slug = "tendik-sintetis") {
  return {
    name: "Tendik Sintetis", slug, nip: "staff-nip-1", email: "staff@example.test",
    phone: null, photoMediaId: null, order: 0, isActive: true,
    translations: {id: {position: "Pranata", unit: "Akademik"}},
  };
}

describe("academic editor and import contracts", () => {
  it("accepts a complete editable Lecturer detail without inventing a version", () => {
    expect(AcademicEditorDetailSchema.parse({
      id: "lecturer-1", resource: "LECTURER", version: null, governance: null,
      input: lecturerPayload(), translationWorkflow: workflow, assets: [],
    })).toMatchObject({id: "lecturer-1", resource: "LECTURER", version: null});
  });

  it("requires Unit concurrency/governance and rejects storage metadata", () => {
    const detail = {
      id: "unit-1", resource: "UNIT", version: 2,
      governance: {status: "CURRENT", contentOwnerId: null, lastReviewedAt: null, reviewDueAt: null, expiresAt: null},
      input: {slug: "pusat-studi", type: "PUSAT_STUDI", email: null, phone: null, externalUrl: null, isActive: true, contentOwnerId: null,
        translations: {id: {name: "Pusat Studi", description: null}}},
      translationWorkflow: workflow, assets: [],
    };
    expect(AcademicEditorDetailSchema.safeParse(detail).success).toBe(true);
    expect(AcademicEditorDetailSchema.safeParse({...detail, storageKey: "2026/08/secret.pdf"}).success).toBe(false);
    expect(AcademicEditorDetailSchema.safeParse({...detail, version: null}).success).toBe(false);
  });

  it("accepts one bounded resource batch and rejects mixed or duplicate identities", () => {
    const lecturer = {rowNumber: 1, resource: "LECTURER" as const, payload: lecturerPayload()};
    expect(AcademicPeopleImportRequestSchema.safeParse({intent: "PREVIEW", atomic: true, rows: [lecturer]}).success).toBe(true);
    expect(AcademicPeopleImportRequestSchema.safeParse({intent: "PREVIEW", atomic: true, rows: [
      lecturer,
      {rowNumber: 2, resource: "STAFF", payload: staffPayload()},
    ]}).success).toBe(false);
    expect(AcademicPeopleImportRequestSchema.safeParse({intent: "COMMIT", atomic: true, rows: [
      lecturer,
      {rowNumber: 2, resource: "LECTURER", payload: lecturerPayload("dosen-sintetis")},
    ]}).success).toBe(false);
    expect(AcademicPeopleImportRequestSchema.safeParse({intent: "PREVIEW", atomic: false, rows: [lecturer]}).success).toBe(false);
  });

  it("requires spreadsheet-formula-safe result labels", () => {
    for (const unsafe of ["=2+2", "+SUM(A:A)", "-1+2", "@cmd", "\tformula", "\rformula"]) {
      expect(AcademicImportSafeCellSchema.safeParse(unsafe).success).toBe(false);
    }
    expect(AcademicImportSafeCellSchema.parse("'=2+2")).toBe("'=2+2");
  });

  it("keeps preview and atomic commit summaries internally consistent", () => {
    const preview = {
      ok: true, intent: "PREVIEW", resource: "LECTURER", atomic: true, committed: false,
      rows: [{rowNumber: 1, status: "VALID", code: null, id: null, safeLabel: "Dosen Sintetis"}],
      summary: {total: 1, valid: 1, invalid: 0, created: 0},
    };
    expect(AcademicPeopleImportResultSchema.safeParse(preview).success).toBe(true);
    expect(AcademicPeopleImportResultSchema.safeParse({...preview, committed: true}).success).toBe(false);
    const commit = {
      ...preview, intent: "COMMIT", committed: true,
      rows: [{rowNumber: 1, status: "CREATED", code: null, id: "lecturer-1", safeLabel: "Dosen Sintetis"}],
      summary: {total: 1, valid: 0, invalid: 0, created: 1},
    };
    expect(AcademicPeopleImportResultSchema.safeParse(commit).success).toBe(true);
    expect(AcademicPeopleImportResultSchema.safeParse({...commit, summary: {...commit.summary, created: 0}}).success).toBe(false);
  });
});
