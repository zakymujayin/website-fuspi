import { institution } from "@/config/institution";

let studyProgramIdCounter = 0;

const programs = institution.studyPrograms;

export interface FixtureStudyProgram {
  id: string;
  code: string;
  slug: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations: FixtureStudyProgramTranslation[];
}

export interface FixtureStudyProgramTranslation {
  id: string;
  studyProgramId: string;
  locale: "id" | "en" | "ar";
  name: string;
  description: string | null;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  sourceVersion: number;
}

export function createStudyProgram(
  overrides: Partial<FixtureStudyProgram> = {},
): FixtureStudyProgram {
  studyProgramIdCounter += 1;
  const prog = programs[(studyProgramIdCounter - 1) % programs.length]!;
  const id = overrides.id ?? `test-prodi-${prog.code.toLowerCase()}`;
  return {
    id,
    code: prog.code,
    slug: prog.slug,
    order: studyProgramIdCounter,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    translations: [],
    ...overrides,
  };
}

export function createStudyProgramTranslation(
  studyProgramId: string,
  overrides: Partial<FixtureStudyProgramTranslation> = {},
): FixtureStudyProgramTranslation {
  const locale = overrides.locale ?? "id";
  return {
    id: `${studyProgramId}-${locale}`,
    studyProgramId,
    locale,
    name: `Prodi ${locale}`,
    description: `Deskripsi prodi dalam ${locale}`,
    status: "PUBLISHED",
    sourceVersion: 1,
    ...overrides,
  };
}

export function createStudyProgramWithTranslations(
  overrides: Partial<FixtureStudyProgram> = {},
): FixtureStudyProgram {
  const prodi = createStudyProgram(overrides);
  prodi.translations = [
    createStudyProgramTranslation(prodi.id, { locale: "id" }),
    createStudyProgramTranslation(prodi.id, { locale: "en" }),
    createStudyProgramTranslation(prodi.id, { locale: "ar" }),
  ];
  return prodi;
}

export function createAllFiveStudyPrograms(): FixtureStudyProgram[] {
  resetStudyProgramIdCounter();
  return programs.map(() => createStudyProgramWithTranslations());
}

export function resetStudyProgramIdCounter(): void {
  studyProgramIdCounter = 0;
}
