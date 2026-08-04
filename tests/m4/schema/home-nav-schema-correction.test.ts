import {readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

describe("Home/Nav additive schema correction", () => {
  const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
  const migration = readFileSync(join(process.cwd(), "prisma/migrations/20260804214500_home_nav_schema_correction/migration.sql"), "utf8");

  it("adds the two missing section keys and content fields", () => {
    const sectionEnum = schema.match(/enum HomeSectionKey \{([\s\S]*?)\n\}/u)?.[1] ?? "";
    expect(sectionEnum).toMatch(/\bINTRO\b/u);
    expect(sectionEnum).toMatch(/\bSERVICE\b/u);
    expect(schema.match(/model Statistic \{([\s\S]*?)\n\}/u)?.[1]).toMatch(/\bsuffix\s+String\?/u);
    expect(schema.match(/model SiteSetting \{([\s\S]*?)\n\}/u)?.[1]).toMatch(/\bvideoPosterMediaId\s+String\?/u);
  });

  it("uses restrictive page and poster media relations", () => {
    const menu = schema.match(/model MenuItem \{([\s\S]*?)\n\}/u)?.[1] ?? "";
    const setting = schema.match(/model SiteSetting \{([\s\S]*?)\n\}/u)?.[1] ?? "";
    expect(menu).toMatch(/page\s+Page\?\s+@relation\("MenuPage"[^\n]+onDelete: Restrict\)/u);
    expect(menu).toMatch(/@@index\(\[pageId\]\)/u);
    expect(setting).toMatch(/videoPoster\s+Media\?\s+@relation\("SiteVideoPoster"[^\n]+onDelete: Restrict\)/u);
    expect(setting).toMatch(/@@index\(\[videoPosterMediaId\]\)/u);
  });

  it("keeps the corrective migration additive", () => {
    expect(migration).toContain("ALTER TYPE \"HomeSectionKey\"");
    expect(migration).toContain('ADD COLUMN "suffix" TEXT');
    expect(migration).toContain('ADD COLUMN "videoPosterMediaId" TEXT');
    expect(migration).toContain('ADD CONSTRAINT "MenuItem_pageId_fkey"');
    expect(migration).toContain('ADD CONSTRAINT "SiteSetting_videoPosterMediaId_fkey"');
    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE)\b|\bDELETE\s+FROM\b/u);
  });
});
