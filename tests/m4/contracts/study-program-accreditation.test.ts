import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("study-program accreditation seed", () => {
  it("persists the owner-confirmed v1 accreditation values", () => {
    const source = readFileSync(path.join(process.cwd(), "prisma/seed.ts"), "utf8");
    expect(source).toContain('const accreditation = code === "IAT" ? "Unggul" : "B";');
    expect(source).toContain("update: { slug, accreditation, externalUrl: null");
    expect(source).toContain('degree: "S1",\n        accreditation,');
  });
});
