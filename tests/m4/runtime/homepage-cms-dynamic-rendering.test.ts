import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";

describe("public homepage CMS rendering", () => {
  it("forces request-time rendering for CMS-controlled sections", () => {
    const source = readFileSync(join(process.cwd(), "src/app/[locale]/(public)/page.tsx"), "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic";');
    expect(source).toContain('import {connection} from "next/server";');
    expect(source).toContain("await connection();");
    // The metadata function (which also touches the database for og:image)
    // awaits connection first, then the page component repeats it before
    // building its Prisma client.
    expect(source.indexOf("await connection();")).toBeGreaterThan(source.indexOf("generateMetadata"));
    expect(source.lastIndexOf("await connection();")).toBeGreaterThan(source.indexOf("setRequestLocale(locale);"));
    expect(source.lastIndexOf("await connection();")).toBeLessThan(source.indexOf("const prisma = getPrismaClient();"));
  });
});
