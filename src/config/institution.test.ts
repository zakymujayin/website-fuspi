import {describe, expect, it} from "vitest";

import {institution} from "./institution";

describe("FUSPI identity contract", () => {
  it("uses the official faculty identity", () => {
    expect(institution.shortName).toBe("FUSPI");
    expect(institution.name).toBe("Fakultas Ushuluddin dan Pemikiran Islam");
  });

  it("contains exactly the five approved study programs in order", () => {
    expect(institution.studyPrograms.map(({code}) => code)).toEqual([
      "IAT",
      "IH",
      "AFI",
      "SAA",
      "TASPI",
    ]);
  });
});
