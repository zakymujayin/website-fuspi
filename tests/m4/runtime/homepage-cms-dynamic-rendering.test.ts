import {describe, expect, it} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";

describe("public homepage CMS rendering", () => {
  it("forces request-time rendering for CMS-controlled sections", () => {
    const source = readFileSync(join(process.cwd(), "src/app/[locale]/(public)/page.tsx"), "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic";');
  });
});
