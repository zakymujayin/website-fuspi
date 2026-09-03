export const LECTURER_LOCALES = ["id", "en", "ar"] as const;
export type LecturerLocale = (typeof LECTURER_LOCALES)[number];

export type LecturerTranslationDraft = {
  position: string;
  expertise: string;
  bio: string;
  officeHours: string;
};

export type LecturerDraft = {
  id?: string;
  name: string;
  slug: string;
  nidn: string;
  nip: string;
  orcid: string;
  googleScholarUrl: string;
  sintaUrl: string;
  email: string;
  phone: string;
  photoMediaId: string | null;
  studyProgramId: string | null;
  order: number;
  isActive: boolean;
  translations: Record<LecturerLocale, LecturerTranslationDraft>;
};

export type LecturerProgramOption = {
  id: string;
  code: "IAT" | "IH" | "AFI";
  name: string;
};

export type LecturerListItem = {
  id: string;
  name: string;
  slug: string;
  studyProgramId: string | null;
  studyProgramCode: "IAT" | "IH" | "AFI" | null;
  studyProgramName: string | null;
  position: string | null;
  expertise: string | null;
  email: string | null;
  order: number;
  isActive: boolean;
  photoUrl: string | null;
  photoAlt: string | null;
};

export const EMPTY_LECTURER_TRANSLATION: LecturerTranslationDraft = {
  position: "",
  expertise: "",
  bio: "",
  officeHours: "",
};

export function emptyLecturerDraft(): LecturerDraft {
  return {
    name: "",
    slug: "",
    nidn: "",
    nip: "",
    orcid: "",
    googleScholarUrl: "",
    sintaUrl: "",
    email: "",
    phone: "",
    photoMediaId: null,
    studyProgramId: null,
    order: 0,
    isActive: true,
    translations: {
      id: { ...EMPTY_LECTURER_TRANSLATION },
      en: { ...EMPTY_LECTURER_TRANSLATION },
      ar: { ...EMPTY_LECTURER_TRANSLATION },
    },
  };
}
