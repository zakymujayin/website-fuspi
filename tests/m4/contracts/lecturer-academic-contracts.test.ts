import {describe, expect, it} from "vitest";

import {
  AdminLecturerAcademicCommandSchema,
  LecturerTeachingImportRequestSchema,
  LecturerTeachingInputSchema,
} from "@/contracts/lecturer-academic";

describe("lecturer academic contracts", () => {
  it("keeps teaching assignments inside the supported academic range", () => {
    expect(LecturerTeachingInputSchema.safeParse({
      courseCode: "IAT101", courseName: "Ulumul Qur'an", programCode: "IAT", credits: 3,
      academicYearStart: 2026, academicYearEnd: 2025, term: "GANJIL", semester: 1,
    }).success).toBe(false);
    expect(LecturerTeachingInputSchema.safeParse({
      courseCode: "IAT101", courseName: "Ulumul Qur'an", programCode: "IAT", credits: 3,
      academicYearStart: 2026, academicYearEnd: 2026, term: "GANJIL", semester: 1,
    }).success).toBe(true);
  });

  it("requires a stable lecturer identifier for imports", () => {
    const row = {
      lecturerId: null, nidn: null, courseCode: "IAT101", courseName: "Ulumul Qur'an", programCode: "IAT",
      credits: 3, academicYearStart: 2026, academicYearEnd: 2026, term: "GANJIL", semester: 1,
    };
    expect(LecturerTeachingImportRequestSchema.safeParse({rows: [row], commit: false}).success).toBe(false);
    expect(LecturerTeachingImportRequestSchema.safeParse({rows: [{...row, lecturerId: "lecturer-1"}], commit: false}).success).toBe(true);
  });

  it("keeps admin commands scoped to one lecturer and one relation", () => {
    expect(AdminLecturerAcademicCommandSchema.safeParse({
      action: "HKI_UPDATE", lecturerId: "lecturer-1", id: "hki-1",
      payload: {title: "Metode Pembelajaran Tafsir", type: "HAK_CIPTA", registrationNumber: null, year: 2026, url: null},
    }).success).toBe(true);
    expect(AdminLecturerAcademicCommandSchema.safeParse({
      action: "TEACHING_DELETE", lecturerId: "lecturer-1", id: "teaching-1", unexpected: true,
    }).success).toBe(false);
  });
});
