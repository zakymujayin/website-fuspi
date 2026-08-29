import {describe, expect, it} from "vitest";

import {
  parseLecturerCsv,
  slugifyName,
  LECTURER_CSV_COLUMNS,
} from "@/features/academic/lecturer-csv-import";

const PROGRAMS = new Map([
  ["IAT", "program-iat"],
  ["IH", "program-ih"],
  ["AFI", "program-afi"],
]);

const HEADER = LECTURER_CSV_COLUMNS.join(",");

function csv(...lines: string[]) {
  return [HEADER, ...lines].join("\n");
}

/* Column order: nama,slug,nidn,nip,orcid,email,telepon,prodi,jabatan,keahlian,scholar,sinta */
function row(overrides: Partial<Record<string, string>> = {}) {
  const values: Record<string, string> = {
    nama: "Halimah Nur Azizah",
    slug: "",
    nidn: "2014058701",
    nip: "",
    orcid: "",
    email: "halimah@fuspi.uinbanten.ac.id",
    telepon: "",
    prodi: "IAT",
    jabatan: "Dosen",
    keahlian: "",
    scholar: "",
    sinta: "",
    ...overrides,
  };
  return LECTURER_CSV_COLUMNS.map((column) => values[column] ?? "").join(",");
}

describe("lecturer CSV import", () => {
  it("maps a well-formed row onto the shared lecturer input contract", () => {
    const result = parseLecturerCsv(csv(row()), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.issues).toHaveLength(0);
    expect(result.rows[0]?.payload).toMatchObject({
      name: "Halimah Nur Azizah",
      slug: "halimah-nur-azizah",
      nidn: "2014058701",
      email: "halimah@fuspi.uinbanten.ac.id",
      studyProgramId: "program-iat",
      isActive: true,
    });
    expect(result.rows[0]?.payload.translations.id.position).toBe("Dosen");
  });

  it("numbers rows from the spreadsheet line, not the record index", () => {
    const result = parseLecturerCsv(csv(row(), row({nama: "Zulfa Kamila"})), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows.map(({rowNumber}) => rowNumber)).toEqual([2, 3]);
  });

  it("refuses cells that begin with a spreadsheet formula prefix", () => {
    for (const injected of ["=cmd|'/c calc'!A1", "+1+1", "-1+1", "@SUM(A1)"]) {
      const result = parseLecturerCsv(csv(row({jabatan: injected})), PROGRAMS);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.rows).toHaveLength(0);
      expect(result.issues[0]).toMatchObject({rowNumber: 2, column: "jabatan", code: "UNSAFE_CELL"});
    }
  });

  it("keeps an international phone number, which the formula guard would otherwise reject", () => {
    const result = parseLecturerCsv(csv(row({telepon: "+62 254 200111"})), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.issues).toHaveLength(0);
    expect(result.rows[0]?.payload.phone).toBe("+62 254 200111");
  });

  it("still guards the phone column against characters a phone cannot contain", () => {
    const result = parseLecturerCsv(csv(row({telepon: "=SUM(A1)"})), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(0);
    expect(result.issues[0]?.code).toBe("INVALID_VALUE");
  });

  it("reports a missing name against its own row and keeps the other rows", () => {
    const result = parseLecturerCsv(csv(row({nama: ""}), row({nama: "Zulfa Kamila"})), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.payload.name).toBe("Zulfa Kamila");
    expect(result.issues).toEqual([{rowNumber: 2, column: "nama", code: "NAME_REQUIRED"}]);
    expect(result.skipped).toBe(1);
  });

  it("rejects a study program that the faculty does not run", () => {
    const result = parseLecturerCsv(csv(row({prodi: "TEKNIK"})), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.issues).toEqual([{rowNumber: 2, column: "prodi", code: "UNKNOWN_PROGRAM"}]);
  });

  it("accepts a lower-case program code and an empty one", () => {
    const result = parseLecturerCsv(csv(row({prodi: "iat"}), row({nama: "Zulfa Kamila", prodi: ""})), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]?.payload.studyProgramId).toBe("program-iat");
    expect(result.rows[1]?.payload.studyProgramId).toBeNull();
  });

  it("flags a slug repeated inside the same file", () => {
    const result = parseLecturerCsv(csv(row(), row()), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.issues).toEqual([{rowNumber: 3, column: "slug", code: "DUPLICATE_SLUG"}]);
  });

  it("rejects a malformed email and a non-https scholar link", () => {
    const bad = parseLecturerCsv(csv(row({email: "bukan-email"})), PROGRAMS);
    expect(bad.ok && bad.issues[0]?.code).toBe("INVALID_VALUE");

    const insecure = parseLecturerCsv(csv(row({scholar: "http://scholar.example"})), PROGRAMS);
    expect(insecure.ok && insecure.issues[0]?.code).toBe("INVALID_VALUE");
  });

  it("refuses a file with no name column, and an empty file", () => {
    expect(parseLecturerCsv("jabatan,email\nDosen,a@b.test", PROGRAMS)).toEqual({
      ok: false,
      code: "MISSING_NAME_COLUMN",
    });
    expect(parseLecturerCsv(HEADER, PROGRAMS)).toEqual({ok: false, code: "EMPTY"});
    expect(parseLecturerCsv("", PROGRAMS)).toEqual({ok: false, code: "EMPTY"});
  });

  it("refuses a file longer than the contract can number", () => {
    const rows = Array.from({length: 500}, (_, index) => row({nama: `Dosen ${index}`}));
    expect(parseLecturerCsv(csv(...rows), PROGRAMS)).toEqual({ok: false, code: "TOO_MANY_ROWS"});
  });

  it("tolerates header casing and surrounding spaces", () => {
    const result = parseLecturerCsv(` Nama , PRODI \nHalimah Nur Azizah,IAT`, PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]?.payload.name).toBe("Halimah Nur Azizah");
  });
});

describe("slug derivation", () => {
  it("strips titles punctuation and diacritics into a valid slug", () => {
    expect(slugifyName("Dr. Halimah Nur Azizah, M.Ag.")).toBe("dr-halimah-nur-azizah-m-ag");
    expect(slugifyName("Muhammad Fa'iz Abdullah")).toBe("muhammad-fa-iz-abdullah");
    expect(slugifyName("  Zulfa   Kamila  ")).toBe("zulfa-kamila");
  });
});
