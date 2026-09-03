import {describe, expect, it} from "vitest";

import {splitExpertiseTags} from "./lecturer-profile-utils";

describe("splitExpertiseTags", () => {
  it("splits comma- and semicolon-separated expertise into trimmed tags", () => {
    expect(splitExpertiseTags("Tafsir, Hadis; Ulumul Qur'an")).toEqual([
      "Tafsir",
      "Hadis",
      "Ulumul Qur'an",
    ]);
  });

  it("returns a single-item array when there is no separator", () => {
    expect(splitExpertiseTags("Filsafat Islam")).toEqual(["Filsafat Islam"]);
  });

  it("drops empty segments produced by repeated separators", () => {
    expect(splitExpertiseTags("Akidah,, Tasawuf ;;")).toEqual(["Akidah", "Tasawuf"]);
  });

  it("returns an empty array for null input", () => {
    expect(splitExpertiseTags(null)).toEqual([]);
  });

  it("returns an empty array for blank input", () => {
    expect(splitExpertiseTags("   ")).toEqual([]);
  });
});
