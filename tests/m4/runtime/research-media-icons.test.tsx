import {describe, expect, it} from "vitest";

import {researchMediaLinks} from "@/components/public/research-media-icons";

describe("researchMediaLinks", () => {
  it("returns only the profiles that are set, in a stable order", () => {
    const links = researchMediaLinks({
      googleScholarUrl: "https://scholar.google.co.id/citations?user=abc",
      scopusUrl: "https://www.scopus.com/authid/detail.uri?authorId=1",
      sintaUrl: null,
      orcid: "0000-0002-1825-0097",
      linkedinUrl: null,
      instagramUrl: null,
    });

    expect(links.map((link) => link.key)).toEqual(["scholar", "scopus", "orcid"]);
  });

  it("builds an ORCID profile URL from the bare identifier", () => {
    const links = researchMediaLinks({
      googleScholarUrl: null, scopusUrl: null, sintaUrl: null,
      orcid: "0000-0002-1825-0097", linkedinUrl: null, instagramUrl: null,
    });

    expect(links[0].href).toBe("https://orcid.org/0000-0002-1825-0097");
  });

  it("drops a profile whose stored URL is not https", () => {
    const links = researchMediaLinks({
      googleScholarUrl: "http://scholar.google.co.id/citations?user=abc",
      scopusUrl: null, sintaUrl: null, orcid: null,
      linkedinUrl: null, instagramUrl: null,
    });

    expect(links).toEqual([]);
  });

  it("returns an empty list when no profile is set", () => {
    const links = researchMediaLinks({
      googleScholarUrl: null, scopusUrl: null, sintaUrl: null,
      orcid: null, linkedinUrl: null, instagramUrl: null,
    });

    expect(links).toEqual([]);
  });
});
