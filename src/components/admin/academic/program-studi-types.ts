export const PROGRAM_STUDIO_LOCALES = ["id", "en", "ar"] as const;
export type ProgramStudioLocale = (typeof PROGRAM_STUDIO_LOCALES)[number];

export type ProgramStudioTranslationDraft = {
  name: string;
  description: string;
  vision: string;
  mission: string;
  objectives: string;
  learningOutcomes: string;
  graduateProfile: string;
  careerProspects: string;
};

export type ProgramStudioDraft = {
  id: string;
  version: number;
  code: "IAT" | "IH" | "AFI";
  slug: string;
  degree: "S1";
  accreditation: string;
  accreditationExpiry: string;
  email: string;
  phone: string;
  logoMediaId: string | null;
  curriculumDocumentId: string | null;
  brochureDocumentId: string | null;
  isActive: boolean;
  order: number;
  contentOwnerId: string | null;
  translations: Partial<Record<ProgramStudioLocale, ProgramStudioTranslationDraft>> & {
    id: ProgramStudioTranslationDraft;
  };
};

export const EMPTY_PROGRAM_STUDIO_TRANSLATION: ProgramStudioTranslationDraft = {
  name: "",
  description: "",
  vision: "",
  mission: "",
  objectives: "",
  learningOutcomes: "",
  graduateProfile: "",
  careerProspects: "",
};
