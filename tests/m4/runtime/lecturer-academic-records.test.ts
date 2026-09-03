import {describe, expect, it, vi} from "vitest";

import {
  executeAdminLecturerAcademicCommand,
  parseTeachingScheduleCsv,
  previewTeachingScheduleImport,
} from "@/features/academic/lecturer-academic-records";

const admin = {
  userId: "admin-1", role: "ADMIN" as const, isActive: true as const,
  mustChangePassword: false as const, expiresAt: new Date("2099-01-01T00:00:00.000Z"),
};

describe("lecturer academic records", () => {
  it("parses Indonesian schedule headers, quoted values, and term labels", () => {
    const parsed = parseTeachingScheduleCsv([
      "NIDN,Kode Mata Kuliah,Nama Mata Kuliah,Prodi,SKS,Tahun Awal,Tahun Akhir,Periode,Semester",
      '0012345678,IAT101,"Ulumul Qur\'an, Hadis",IAT,3,2026,2026,Ganjil,1',
    ].join("\n"));

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([expect.objectContaining({
      nidn: "0012345678", courseCode: "IAT101", courseName: "Ulumul Qur'an, Hadis",
      programCode: "IAT", credits: 3, term: "GANJIL", semester: 1,
    })]);
  });

  it("reports malformed rows without exposing parser details", () => {
    const parsed = parseTeachingScheduleCsv("lecturerId,courseCode,courseName,programCode,credits,academicYearStart,academicYearEnd,term,semester\nlecturer-1,,,,,,,,");
    expect(parsed.rows).toEqual([]);
    expect(parsed.issues).toEqual([{row: 2, message: expect.any(String)}]);
  });

  it("rejects non-admin actors before opening a write transaction", async () => {
    const database = {$transaction: vi.fn()};
    const result = await executeAdminLecturerAcademicCommand(database as never, {...admin, role: "DOSEN"}, {
      action: "TEACHING_DELETE", lecturerId: "lecturer-1", id: "teaching-1",
    });
    expect(result).toEqual({ok: false, code: "SESSION_INVALID"});
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("counts only unique, resolvable rows during import preview", async () => {
    const findUnique = vi.fn().mockResolvedValue({id: "lecturer-1", nidn: "0012345678"});
    const database = {lecturer: {findUnique}};
    const row = {
      lecturerId: null, nidn: "0012345678", courseCode: "IAT101", courseName: "Ulumul Qur'an", programCode: "IAT",
      credits: 3, academicYearStart: 2026, academicYearEnd: 2026, term: "GANJIL" as const, semester: 1,
    };
    const result = await previewTeachingScheduleImport(database as never, admin, [row, row]);
    expect(result).toEqual({ok: true, data: {validRows: 1, totalRows: 2, issues: [{row: 3, message: "Duplicate assignment in the uploaded file."}]}});
    expect(findUnique).toHaveBeenCalledTimes(2);
  });
});
