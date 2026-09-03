import {describe, expect, it} from "vitest";

import {StudyProgramInputSchema} from "@/contracts/academic";
import {PublicStudyProgramDetailSchema} from "@/contracts/academic-public";

describe("study-program accreditation contract", () => {
  it("accepts editable agency, decree, expiry, and certificate fields", () => {
    const result = StudyProgramInputSchema.safeParse({
      code: "IAT",
      slug: "ilmu-al-quran-dan-tafsir",
      degree: "S1",
      accreditation: "Unggul",
      accreditationAgency: "BAN-PT",
      accreditationDecreeNumber: "SK-001",
      accreditationExpiry: "2031-08-09T00:00:00.000Z",
      accreditationCertificateMediaId: "media-certificate",
      externalUrl: null,
      email: null,
      phone: null,
      logoMediaId: null,
      curriculumDocumentId: null,
      brochureDocumentId: null,
      isActive: true,
      order: 0,
      contentOwnerId: null,
      translations: {id: {
        name: "Ilmu Al-Qur’an dan Tafsir", description: null, vision: null, mission: null,
        objectives: null, graduateProfile: null, careerProspects: null, learningOutcomes: null,
      }},
    });
    expect(result.success).toBe(true);
  });

  it("exposes accreditation details and a public certificate view", () => {
    expect(PublicStudyProgramDetailSchema.safeParse({
      id: "program-iat", resource: "STUDY_PROGRAM", slug: "ilmu-al-quran-dan-tafsir", code: "IAT", degree: "S1",
      accreditation: "Unggul", accreditationAgency: "BAN-PT", accreditationDecreeNumber: "SK-001",
      accreditationExpiry: "2031-08-09T00:00:00.000Z", institutionalEmail: null, logo: null,
      accreditationCertificate: {
        id: "media-certificate", url: "/uploads/2026/09/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf", mimeType: "application/pdf", size: 100,
        alt: "", isDecorative: false, width: null, height: null, focalX: null, focalY: null,
      },
      curriculumDocument: null, brochureDocument: null,
      translation: {
        requestedLocale: "id", resolvedLocale: "id", isFallback: false, name: "Ilmu Al-Qur’an dan Tafsir",
        description: null, vision: null, mission: null, objectives: null, graduateProfile: null,
        careerProspects: null, learningOutcomes: null,
      },
    }).success).toBe(true);
  });
});
