import {describe, expect, it} from "vitest";

import {
  AcademicCommandSchema,
  AcademicFailureCodeSchema,
  AcademicListQuerySchema,
  AcademicMutationResultSchema,
  CommunityServiceInputSchema,
  LecturerInputSchema,
  PublicAcademicDirectoryItemSchema,
  ResearchInputSchema,
  StudyProgramInputSchema,
  UnitInputSchema,
} from "@/contracts/academic";

const emptyProgramTranslation = {
  name: "Ilmu Al-Qur’an dan Tafsir",
  description: null,
  vision: null,
  mission: null,
  objectives: null,
  graduateProfile: null,
  careerProspects: null,
  learningOutcomes: null,
};

describe("academic directory contracts", () => {
  it("accepts only the exact three FUSPI study-program identities and order", () => {
    const base = {code: "IAT", slug: "ilmu-al-quran-dan-tafsir", degree: "S1", accreditation: null, accreditationExpiry: null, externalUrl: null, email: null, phone: null, logoMediaId: null, curriculumDocumentId: null, brochureDocumentId: null, isActive: true, order: 0, contentOwnerId: null, translations: {id: emptyProgramTranslation}};
    expect(StudyProgramInputSchema.safeParse(base).success).toBe(true);
    expect(StudyProgramInputSchema.safeParse({...base, code: "PAI"}).success).toBe(false);
    expect(StudyProgramInputSchema.safeParse({...base, slug: "wrong-program"}).success).toBe(false);
    expect(StudyProgramInputSchema.safeParse({...base, order: 1}).success).toBe(false);
    expect(StudyProgramInputSchema.safeParse({...base, degree: "S2"}).success).toBe(false);
    expect(StudyProgramInputSchema.safeParse({...base, externalUrl: "https://example.com"}).success).toBe(false);
  });

  it("requires Indonesian StudyProgram content and rejects empty locale rows", () => {
    const valid = {code: "IH", slug: "ilmu-hadis", degree: "S1", accreditation: null, accreditationExpiry: null, externalUrl: null, email: null, phone: null, logoMediaId: null, curriculumDocumentId: null, brochureDocumentId: null, isActive: true, order: 1, contentOwnerId: null, translations: {id: {...emptyProgramTranslation, name: "Ilmu Hadis"}}};
    expect(StudyProgramInputSchema.safeParse(valid).success).toBe(true);
    expect(StudyProgramInputSchema.safeParse({...valid, translations: {en: {...emptyProgramTranslation, name: "Hadith Studies"}}}).success).toBe(false);
    expect(StudyProgramInputSchema.safeParse({...valid, translations: {...valid.translations, en: {...emptyProgramTranslation, name: " "}}}).success).toBe(false);
  });

  it("bounds Lecturer identifiers, media, links, and translations", () => {
    const lecturer = {name: "Dosen Sintetis", slug: "dosen-sintetis", nidn: null, nip: null, orcid: "0000-0002-1825-0097", googleScholarUrl: {kind: "EXTERNAL", href: "https://scholar.google.com/example"}, sintaUrl: null, scopusUrl: null, linkedinUrl: null, instagramUrl: null, twitterUrl: null, email: "dosen@example.com", phone: null, photoMediaId: "media-1", cvMediaId: null, studyProgramId: "program-1", order: 1, isActive: true, translations: {id: {position: "Dosen", expertise: null, bio: null, officeHours: null, officeLocation: null, quote: null}}};
    expect(LecturerInputSchema.safeParse(lecturer).success).toBe(true);
    expect(LecturerInputSchema.safeParse({...lecturer, orcid: "invalid"}).success).toBe(false);
    expect(LecturerInputSchema.safeParse({...lecturer, googleScholarUrl: {kind: "EXTERNAL", href: "http://localhost/private"}}).success).toBe(false);
    expect(LecturerInputSchema.safeParse({...lecturer, passwordHash: "secret"}).success).toBe(false);
  });

  it("rejects duplicate relation IDs and phase-2 bibliographic input", () => {
    const research = {slug: "riset-sintetis", year: 2026, documentUrl: null, lecturerIds: ["lecturer-1"], translations: {id: {title: "Riset Sintetis", abstract: null}}};
    expect(ResearchInputSchema.safeParse(research).success).toBe(true);
    expect(ResearchInputSchema.safeParse({...research, lecturerIds: ["lecturer-1", "lecturer-1"]}).success).toBe(false);
    expect(ResearchInputSchema.safeParse({...research, doi: "10.0000/example"}).success).toBe(false);
  });

  it("validates CommunityService and Unit external boundaries", () => {
    expect(CommunityServiceInputSchema.safeParse({slug: "pengabdian-sintetis", year: 2026, location: null, documentUrl: null, lecturerIds: [], translations: {id: {title: "Pengabdian", description: null}}}).success).toBe(true);
    expect(UnitInputSchema.safeParse({slug: "laboratorium-sintetis", type: "LABORATORIUM", email: "lab@example.com", phone: "+62 21 1234", externalUrl: null, isActive: true, contentOwnerId: null, translations: {id: {name: "Laboratorium", description: null}}}).success).toBe(true);
    expect(UnitInputSchema.safeParse({slug: "unit", type: "UNKNOWN", email: null, phone: null, externalUrl: null, isActive: true, contentOwnerId: null, translations: {id: {name: "Unit", description: null}}}).success).toBe(false);
  });

  it("uses bounded resource-specific list filters without Prisma selectors", () => {
    const query = {page: 1, pageSize: 20, search: "", direction: "ASC", resource: "LECTURER", active: "ACTIVE", studyProgramId: "program-1", year: null};
    expect(AcademicListQuerySchema.safeParse(query).success).toBe(true);
    expect(AcademicListQuerySchema.safeParse({...query, include: {phone: true}}).success).toBe(false);
  });

  it("strictly separates resource commands and rejects forced deletion", () => {
    const unit = {slug: "pusat-studi", type: "PUSAT_STUDI", email: null, phone: null, externalUrl: null, isActive: true, contentOwnerId: null, translations: {id: {name: "Pusat Studi", description: null}}};
    expect(AcademicCommandSchema.safeParse({action: "CREATE", resource: "UNIT", payload: unit}).success).toBe(true);
    expect(AcademicCommandSchema.safeParse({action: "CREATE", resource: "LECTURER", payload: unit}).success).toBe(false);
    expect(AcademicCommandSchema.safeParse({action: "DELETE", resource: "UNIT", id: "unit-1", force: true}).success).toBe(false);
  });

  it("public projections cannot expose phone, storage keys, or inactive state", () => {
    const publicItem = {id: "lecturer-1", resource: "LECTURER", slug: "dosen-sintetis", name: "Dosen Sintetis", secondaryText: "Dosen", institutionalEmail: "dosen@example.com", photo: null, studyProgram: null};
    expect(PublicAcademicDirectoryItemSchema.safeParse(publicItem).success).toBe(true);
    expect(PublicAcademicDirectoryItemSchema.safeParse({...publicItem, phone: "+62123"}).success).toBe(false);
    expect(PublicAcademicDirectoryItemSchema.safeParse({...publicItem, storageKey: "private/key"}).success).toBe(false);
    expect(PublicAcademicDirectoryItemSchema.safeParse({...publicItem, isActive: false}).success).toBe(false);
  });

  it("exposes only deterministic mutation failures", () => {
    expect(AcademicMutationResultSchema.safeParse({ok: false, code: "RELATION_INVALID"}).success).toBe(true);
    expect(AcademicFailureCodeSchema.safeParse("P2002").success).toBe(false);
    expect(AcademicMutationResultSchema.safeParse({ok: false, code: "UNAVAILABLE", error: "database secret"}).success).toBe(false);
  });
});
