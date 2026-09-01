import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";

describe("public homepage CMS rendering", () => {
  it("forces request-time rendering for CMS-controlled sections", () => {
    const source = readFileSync(join(process.cwd(), "src/app/[locale]/(public)/page.tsx"), "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic";');
    expect(source).toContain('import {connection} from "next/server";');
    expect(source).toContain("await connection();");
    expect(source.indexOf("await connection();")).toBeGreaterThan(source.indexOf("setRequestLocale(locale);"));
    expect(source.indexOf("await connection();")).toBeLessThan(source.indexOf("const prisma = getPrismaClient();"));
  });
});
