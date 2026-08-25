import {readFileSync} from "node:fs";
import path from "node:path";

import {describe, expect, it} from "vitest";

describe("FUSPI seed content", () => {
  it("does not reseed removed academic spotlight demo writings", () => {
    const source = readFileSync(path.join(process.cwd(), "prisma/seed.ts"), "utf8");

    expect(source).not.toContain("Menumbuhkan Nalar Kritis Mahasiswa Keislaman");
    expect(source).not.toContain("Tafsir Kontekstual di Era Digital");
    expect(source).toContain("menumbuhkan-nalar-kritis-mahasiswa");
    expect(source).toContain("tafsir-kontekstual-di-era-digital");
    expect(source).toContain("deleteMany");
  });
});
