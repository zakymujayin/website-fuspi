import {readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = readFileSync(join(
  process.cwd(),
  "prisma/migrations/20260804194500_public_content_schema_correction/migration.sql",
), "utf8");

function model(name: string) {
  const match = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`, "u"));
  if (!match?.[1]) throw new Error(`Missing ${name} model.`);
  return match[1];
}

describe("B2 public content schema correction", () => {
  it("adds only the durable content fields required by the frozen roadmap", () => {
    expect(model("Service")).toMatch(/\bicon\s+String\?/u);
    expect(model("Partnership")).toMatch(/\bcountry\s+String\?/u);
    expect(model("Partnership")).toMatch(/\border\s+Int\s+@default\(0\)/u);
    expect(model("Partnership")).toMatch(/\bdocument\s+Document\?.*PartnershipDocument/u);
    expect(model("Scholarship")).toMatch(/\bdocument\s+Document\?.*ScholarshipDocument/u);
    expect(model("Achievement")).toMatch(/\bimageMedia\s+Media\?.*AchievementImage/u);
  });

  it("makes testimonials private by default and records explicit consent", () => {
    const testimonial = model("Testimonial");
    expect(testimonial).toMatch(/\bgraduationYear\s+Int\?/u);
    expect(testimonial).toMatch(/\bisVisible\s+Boolean\s+@default\(false\)/u);
    expect(testimonial).toMatch(/\bpublicationConsentAt\s+DateTime\?/u);
    expect(migration).toContain("Testimonial_publication_consent_check");
    expect(migration).toContain('SET "isVisible" = false');
  });

  it("uses restrictive foreign keys for public evidence and media", () => {
    for (const constraint of [
      "Partnership_documentId_fkey",
      "Scholarship_documentId_fkey",
      "Achievement_imageMediaId_fkey",
    ]) expect(migration).toContain(constraint);
    expect(migration.match(/ON DELETE RESTRICT/gu)).toHaveLength(3);
  });
});
