import {describe, expect, it} from "vitest";

import {
  AcademicPublicDetailQuerySchema,
  AcademicPublicDetailSchema,
  AcademicPublicDetailResultSchema,
} from "@/contracts/academic-public";

const resolution = {requestedLocale: "en", resolvedLocale: "id", isFallback: true};
const photo = {
  id: "media-1", url: `/uploads/2026/08/${"a".repeat(64)}.webp`, mimeType: "image/webp",
  size: 512, alt: "Synthetic portrait", isDecorative: false, width: 320, height: 320,
  focalX: null, focalY: null,
};

describe("academic public detail contracts", () => {
  it("accepts only strict slug+locale resource queries", () => {
    expect(AcademicPublicDetailQuerySchema.parse({resource: "LECTURER", slug: "dosen-sintetis", locale: "ar"}))
      .toEqual({resource: "LECTURER", slug: "dosen-sintetis", locale: "ar"});
    expect(AcademicPublicDetailQuerySchema.safeParse({resource: "LECTURER", slug: "dosen-sintetis", locale: "id", where: {nidn: {not: null}}}).success)
      .toBe(false);
  });

  it("accepts a safe Lecturer profile and structurally rejects private fields", () => {
    const detail = {
      id: "lecturer-1", resource: "LECTURER", slug: "dosen-sintetis", name: "Dosen Sintetis",
      institutionalEmail: "dosen@example.test", photo, studyProgram: {
        id: "program-1", slug: "ilmu-hadis", code: "IH",
        translation: {...resolution, name: "Ilmu Hadis"},
      }, googleScholarUrl: "https://scholar.google.com/example", sintaUrl: null,
      translation: {...resolution, position: "Lektor", expertise: "Hadis", bio: "<p>Bio.</p>", officeHours: "Senin"},
    };
    expect(AcademicPublicDetailSchema.safeParse(detail).success).toBe(true);
    for (const injected of [{nip: "secret"}, {nidn: "secret"}, {phone: "+62000"}, {contentOwnerId: "owner"}, {storageKey: "secret"}]) {
      expect(AcademicPublicDetailSchema.safeParse({...detail, ...injected}).success).toBe(false);
    }
  });

  it("supports complete StudyProgram public content and public documents", () => {
    const document = {
      id: "document-1", slug: "kurikulum-iat",
      translation: {...resolution, title: "Kurikulum", category: "Akademik"},
      url: `/uploads/2026/08/${"b".repeat(64)}.pdf`, mimeType: "application/pdf",
      size: 1024, version: 1,
    };
    expect(AcademicPublicDetailSchema.safeParse({
      id: "program-1", resource: "STUDY_PROGRAM", slug: "ilmu-al-quran-dan-tafsir",
      code: "IAT", degree: "S1", accreditation: "Unggul", accreditationExpiry: null,
      institutionalEmail: "iat@example.test", logo: photo, curriculumDocument: document, brochureDocument: null,
      translation: {...resolution, name: "Ilmu Al-Qur’an dan Tafsir", description: null,
        vision: null, mission: null, objectives: null, graduateProfile: null,
        careerProspects: null, learningOutcomes: null},
    }).success).toBe(true);
  });

  it("enforces locale fallback and safe public HTTPS links", () => {
    const unit = {
      id: "unit-1", resource: "UNIT", slug: "pusat-studi", type: "PUSAT_STUDI",
      institutionalEmail: null, externalUrl: "https://unit.example.test/home",
      translation: {...resolution, name: "Pusat Studi", description: null},
    };
    expect(AcademicPublicDetailSchema.safeParse(unit).success).toBe(true);
    expect(AcademicPublicDetailSchema.safeParse({...unit, externalUrl: "https://127.0.0.1/admin"}).success).toBe(false);
    expect(AcademicPublicDetailSchema.safeParse({...unit, translation: {...unit.translation, isFallback: false}}).success).toBe(false);
  });

  it("uses a closed non-technical result union", () => {
    expect(AcademicPublicDetailResultSchema.parse({ok: false, code: "NOT_FOUND"})).toEqual({ok: false, code: "NOT_FOUND"});
    expect(AcademicPublicDetailResultSchema.safeParse({ok: false, code: "DATABASE_ERROR", detail: "postgresql://secret"}).success).toBe(false);
  });
});
