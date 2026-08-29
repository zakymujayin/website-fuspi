import {describe, expect, it} from "vitest";
import {strToU8, zipSync} from "fflate";

import {
  parseLecturerCsv,
  parseLecturerImportFile,
  slugifyName,
  LECTURER_CSV_COLUMNS,
} from "@/features/academic/lecturer-csv-import";

const PROGRAMS = new Map([
  ["IAT", "program-iat"],
  ["IH", "program-ih"],
  ["AFI", "program-afi"],
  ["SAA", "program-saa"],
  ["TASPI", "program-taspi"],
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

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function columnName(index: number) {
  let value = "";
  let remaining = index + 1;
  while (remaining > 0) {
    const modulo = (remaining - 1) % 26;
    value = String.fromCharCode(65 + modulo) + value;
    remaining = Math.floor((remaining - modulo) / 26);
  }
  return value;
}

function worksheet(rows: string[][]) {
  const sheetRows = rows.map((cells, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const sheetCells = cells.map((value, cellIndex) => {
      const ref = `${columnName(cellIndex)}${rowNumber}`;
      return `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowNumber}">${sheetCells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function xlsx(rows: string[][]) {
  return zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Dosen" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`),
    "xl/worksheets/sheet1.xml": strToU8(worksheet(rows)),
  });
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

  it("accepts all five v1 FUSPI study program codes", () => {
    const result = parseLecturerCsv(csv(
      row({nama: "Dosen IAT", prodi: "IAT"}),
      row({nama: "Dosen IH", prodi: "IH"}),
      row({nama: "Dosen AFI", prodi: "AFI"}),
      row({nama: "Dosen SAA", prodi: "SAA"}),
      row({nama: "Dosen TASPI", prodi: "TASPI"}),
    ), PROGRAMS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows.map(({payload}) => payload.studyProgramId)).toEqual([
      "program-iat", "program-ih", "program-afi", "program-saa", "program-taspi",
    ]);
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

  it("parses an XLSX upload through the same row contract", async () => {
    const result = await parseLecturerImportFile({
      bytes: xlsx([
        [" Nama ", "PRODI", "Email", "Jabatan"],
        ["Zulfa Kamila", "SAA", "zulfa@fuspi.uinbanten.ac.id", "Lektor"],
      ]),
      filename: "dosen.xlsx",
      declaredMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }, PROGRAMS, 12);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.rowNumber).toBe(2);
    expect(result.rows[0]?.payload).toMatchObject({
      name: "Zulfa Kamila",
      email: "zulfa@fuspi.uinbanten.ac.id",
      studyProgramId: "program-saa",
      order: 12,
    });
  });
});

describe("slug derivation", () => {
  it("strips titles punctuation and diacritics into a valid slug", () => {
    expect(slugifyName("Dr. Halimah Nur Azizah, M.Ag.")).toBe("dr-halimah-nur-azizah-m-ag");
    expect(slugifyName("Muhammad Fa'iz Abdullah")).toBe("muhammad-fa-iz-abdullah");
    expect(slugifyName("  Zulfa   Kamila  ")).toBe("zulfa-kamila");
  });
});
