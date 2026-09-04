import {describe, expect, it, vi} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {LecturerInputSchema} from "@/contracts/academic";
import {
  academicPeopleHttpStatus,
  executeAcademicPeopleCommand,
  listAcademicPeople,
  listPublicAcademicPeople,
  normalizeAcademicPeopleSearchParams,
  type AcademicPeopleDatabase,
} from "@/features/academic/people";

const now = new Date("2026-08-04T03:00:00.000Z");
const admin: ActiveDatabaseSession = {
  userId: "admin-1",
  role: "ADMIN",
  isActive: true,
  mustChangePassword: false,
  expiresAt: new Date("2026-08-04T04:00:00.000Z"),
};

function programPayload(description: string | null = null) {
  return {
    code: "IAT" as const,
    slug: "ilmu-al-quran-dan-tafsir",
    degree: "S1" as const,
    accreditation: null,
    accreditationExpiry: null,
    externalUrl: null,
    email: "iat@example.test",
    phone: null,
    logoMediaId: null,
    curriculumDocumentId: null,
    brochureDocumentId: null,
    isActive: true,
    order: 0,
    contentOwnerId: null,
    translations: {
      id: {
        name: "Ilmu Al-Qur’an dan Tafsir",
        description,
        vision: null,
        mission: null,
        objectives: null,
        graduateProfile: null,
        careerProspects: null,
        learningOutcomes: null,
      },
    },
  };
}

describe("academic people runtime boundaries", () => {
  it("normalizes a strict, duplicate-aware admin query", () => {
    expect(normalizeAcademicPeopleSearchParams(new URLSearchParams(
      "resource=LECTURER&page=2&pageSize=50&active=ACTIVE&direction=DESC&studyProgramId=program-1",
    ))).toEqual({
      ok: true,
      data: {
        resource: "LECTURER",
        page: 2,
        pageSize: 50,
        search: "",
        direction: "DESC",
        active: "ACTIVE",
        studyProgramId: "program-1",
        year: null,
      },
    });
    expect(normalizeAcademicPeopleSearchParams(
      new URLSearchParams("resource=LECTURER&page=1&page=2"),
    )).toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(normalizeAcademicPeopleSearchParams(
      new URLSearchParams("resource=LECTURER&contentOwnerId=attacker"),
    )).toEqual({ok: false, code: "REQUEST_INVALID"});
  });

  it("rejects non-ADMIN, expired, and password-change sessions before database access", async () => {
    const database = {$transaction: vi.fn()} as unknown as AcademicPeopleDatabase;
    const query = {resource: "LECTURER", page: 1, pageSize: 20};
    for (const actor of [
      {...admin, role: "EDITOR" as const},
      {...admin, expiresAt: now},
      {...admin, mustChangePassword: true},
      null,
    ]) {
      await expect(listAcademicPeople(database, actor, query, "/uploads", now))
        .resolves.toEqual({ok: false, code: "SESSION_INVALID"});
    }
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unsupported academic resources without starting a transaction", async () => {
    const database = {$transaction: vi.fn()} as unknown as AcademicPeopleDatabase;
    const result = await executeAcademicPeopleCommand(database, admin, {
      action: "CREATE",
      resource: "RESEARCH",
      payload: {
        slug: "synthetic-research",
        year: 2026,
        documentUrl: null,
        lecturerIds: [],
        translations: {id: {title: "Synthetic research", abstract: null}},
      },
    }, now);
    expect(result).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("revalidates DOMPurify-expanded program content before any write", async () => {
    const database = {$transaction: vi.fn()} as unknown as AcademicPeopleDatabase;
    const result = await executeAcademicPeopleCommand(database, admin, {
      action: "CREATE",
      resource: "STUDY_PROGRAM",
      payload: programPayload(`<p>${"&".repeat(50_000)}</p>`),
    }, now);
    expect(result).toEqual({ok: false, code: "VALIDATION_FAILED"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("keeps public queries strict and maps non-technical HTTP statuses", async () => {
    const database = {$transaction: vi.fn()} as unknown as AcademicPeopleDatabase;
    await expect(listPublicAcademicPeople(database, {
      resource: "LECTURER",
      page: 1,
      pageSize: 20,
      injectedSelector: {nip: {not: null}},
    }, "id")).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(academicPeopleHttpStatus({ok: false, code: "SESSION_INVALID"})).toBe(401);
    expect(academicPeopleHttpStatus({ok: false, code: "CSRF_INVALID"})).toBe(403);
    expect(academicPeopleHttpStatus({ok: false, code: "IDENTITY_CONFLICT"})).toBe(409);
    expect(academicPeopleHttpStatus({ok: false, code: "UNAVAILABLE"})).toBe(503);
  });
});

describe("lecturer contract parity", () => {
  it("accepts the extended research-media and CV fields", () => {
    const parsed = LecturerInputSchema.safeParse({
      name: "Dr. Uji Coba, M.Hum.",
      slug: "uji-coba",
      nidn: null, nip: null, orcid: null,
      googleScholarUrl: null, sintaUrl: null,
      scopusUrl: {kind: "EXTERNAL", href: "https://www.scopus.com/authid/detail.uri?authorId=1"},
      linkedinUrl: null, instagramUrl: null, twitterUrl: null,
      email: null, phone: null,
      photoMediaId: null, cvMediaId: "cmtlyc9sc0000ap7nvy6bm0iv",
      studyProgramId: null, order: 0, isActive: true,
      translations: {id: {
        position: "Dekan", expertise: null, bio: null, officeHours: null,
        officeLocation: "Gedung FUSPI Lt. 2", quote: "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ",
      }},
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.scopusUrl?.href).toBe("https://www.scopus.com/authid/detail.uri?authorId=1");
    expect(parsed.data?.cvMediaId).toBe("cmtlyc9sc0000ap7nvy6bm0iv");
    expect(parsed.data?.translations.id.officeLocation).toBe("Gedung FUSPI Lt. 2");
  });

  it("accepts explicit nulls for every new field", () => {
    const parsed = LecturerInputSchema.safeParse({
      name: "Dr. Uji Coba, M.Hum.",
      slug: "uji-coba",
      nidn: null, nip: null, orcid: null,
      googleScholarUrl: null, sintaUrl: null,
      scopusUrl: null, linkedinUrl: null, instagramUrl: null, twitterUrl: null,
      email: null, phone: null,
      photoMediaId: null, cvMediaId: null,
      studyProgramId: null, order: 0, isActive: true,
      translations: {id: {
        position: null, expertise: null, bio: null, officeHours: null,
        officeLocation: null, quote: null,
      }},
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects a non-https research-media link", () => {
    const parsed = LecturerInputSchema.safeParse({
      name: "Dr. Uji Coba, M.Hum.",
      slug: "uji-coba",
      nidn: null, nip: null, orcid: null,
      googleScholarUrl: null, sintaUrl: null,
      scopusUrl: {kind: "EXTERNAL", href: "http://insecure.example/profile"},
      linkedinUrl: null, instagramUrl: null, twitterUrl: null,
      email: null, phone: null,
      photoMediaId: null, cvMediaId: null,
      studyProgramId: null, order: 0, isActive: true,
      translations: {id: {
        position: null, expertise: null, bio: null, officeHours: null,
        officeLocation: null, quote: null,
      }},
    });

    expect(parsed.success).toBe(false);
  });
});
