import {readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

describe("ActivityImage caption schema", () => {
  it("keeps a nullable caption in schema and an additive migration", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const model = schema.match(/model ActivityImage \{([\s\S]*?)\n\}/u)?.[1] ?? "";
    expect(model).toMatch(/\bcaption\s+String\?/u);
    const migration = readFileSync(join(process.cwd(), "prisma/migrations/20260804201000_add_activity_image_caption/migration.sql"), "utf8");
    expect(migration).toContain('ADD COLUMN "caption" TEXT');
    expect(migration).not.toMatch(/DROP|DELETE|TRUNCATE/u);
  });
});
