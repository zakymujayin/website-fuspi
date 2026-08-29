import { describe, expect, it } from "vitest";
import { institution } from "@/config/institution";

function isStringValue(v: unknown): v is string {
  return typeof v === "string";
}

describe("FUSPI identity contract", () => {
  it("uses FUSPI as short name", () => {
    expect(institution.shortName).toBe("FUSPI");
  });

  it("has the correct full faculty name", () => {
    expect(institution.name).toBe("Fakultas Ushuluddin dan Pemikiran Islam");
  });

  it("is affiliated with UIN Sultan Maulana Hasanuddin Banten", () => {
    expect(institution.university).toBe("UIN Sultan Maulana Hasanuddin Banten");
  });

  it("never contains FUDA in any identity field", () => {
    const allValues = Object.values(institution).filter(isStringValue);
    for (const value of allValues) {
      expect(value).not.toMatch(/FUDA/i);
    }
  });

  it("has exactly five active study programs", () => {
    expect(institution.studyPrograms).toHaveLength(5);
  });

  it("has study programs in the correct order", () => {
    expect(institution.studyPrograms.map((p) => p.code)).toEqual([
      "IAT",
      "IH",
      "AFI",
      "SAA",
      "TASPI",
    ]);
  });

  it("each study program has code, slug, and name", () => {
    for (const prog of institution.studyPrograms) {
      expect(prog.code).toBeTruthy();
      expect(prog.slug).toBeTruthy();
      expect(prog.name).toBeTruthy();
      expect(typeof prog.code).toBe("string");
      expect(typeof prog.slug).toBe("string");
      expect(typeof prog.name).toBe("string");
    }
  });

  it("each study program code is exactly 2-5 uppercase letters", () => {
    for (const prog of institution.studyPrograms) {
      expect(prog.code).toMatch(/^[A-Z]{2,5}$/);
    }
  });

  it("each study program slug is kebab-case", () => {
    for (const prog of institution.studyPrograms) {
      expect(prog.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("no duplicate codes", () => {
    const codes = institution.studyPrograms.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("no duplicate slugs", () => {
    const slugs = institution.studyPrograms.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
