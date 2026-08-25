import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const { availableIntents } = await import(
  "@/components/admin/posts/post-publication-transitions"
);
const { failureMessageKey } = await import("@/components/admin/posts/post-editor-errors");

describe("availableIntents — mirrors the frozen ALLOWED_TRANSITIONS", () => {
  it("offers publish/schedule/archive from DRAFT", () => {
    expect(availableIntents("DRAFT", true)).toEqual(["PUBLISH_NOW", "SCHEDULE", "ARCHIVE"]);
  });

  it("offers schedule/return/archive from PUBLISHED", () => {
    expect(availableIntents("PUBLISHED", true)).toEqual([
      "SCHEDULE",
      "RETURN_TO_DRAFT",
      "ARCHIVE",
    ]);
  });

  it("treats SCHEDULED as the PUBLISHED status (same transitions)", () => {
    expect(availableIntents("SCHEDULED", true)).toEqual(availableIntents("PUBLISHED", true));
  });

  it("offers only return-to-draft from ARCHIVED", () => {
    expect(availableIntents("ARCHIVED", true)).toEqual(["RETURN_TO_DRAFT"]);
  });

  it("offers nothing when the actor cannot publish, regardless of state", () => {
    for (const state of ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const) {
      expect(availableIntents(state, false)).toEqual([]);
    }
  });

  it("never offers PUBLISH_NOW on an already-published post", () => {
    expect(availableIntents("PUBLISHED", true)).not.toContain("PUBLISH_NOW");
    expect(availableIntents("SCHEDULED", true)).not.toContain("PUBLISH_NOW");
  });
});

describe("failure mapping is reused from the editor (no raw code reaches the UI)", () => {
  it("maps every known code to its own key and unknown to UNAVAILABLE", () => {
    expect(failureMessageKey("VERSION_CONFLICT")).toBe("error.VERSION_CONFLICT");
    expect(failureMessageKey("INVALID_STATE")).toBe("error.INVALID_STATE");
    expect(failureMessageKey("WHAT_IS_THIS")).toBe("error.UNAVAILABLE");
  });
});

describe("component wiring and i18n", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/components/admin/posts/post-publication-actions.tsx"),
    "utf8",
  );

  it("submits the frozen PUBLICATION command shape same-origin", () => {
    expect(source).toContain('postType === "KOLOM" ? "PUBLICATION_COLUMN" : "PUBLICATION"');
    expect(source).toContain('credentials: "same-origin"');
    expect(source).toContain('"/api/admin/posts"');
  });

  it("sends SCHEDULE with an ISO publishedAt and rejects a non-future time client-side", () => {
    expect(source).toContain("when.toISOString()");
    expect(source).toMatch(/when\.getTime\(\)\s*<=\s*Date\.now\(\)/);
  });

  it("gates the whole panel on capabilities and renders nothing without intents", () => {
    expect(source).toContain("if (intents.length === 0) return null;");
  });

  it("defines the same AdminPostPublication keys in id, en, and ar, with real Arabic", () => {
    const flatten = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
        : [prefix];
    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      return flatten(JSON.parse(raw).AdminPostPublication).sort();
    });
    expect(id.length).toBeGreaterThan(15);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);

    const arBlock = JSON.parse(
      readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8"),
    ).AdminPostPublication;
    expect(arBlock.title).toMatch(/[؀-ۿ]/);
    expect(arBlock.action.ARCHIVE).toMatch(/[؀-ۿ]/);
  });

  it("uses no physical-direction utility", () => {
    expect(source).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(source).not.toMatch(/\btext-(left|right)\b/);
  });
});
