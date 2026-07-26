import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/components/admin/posts/post-delete-action.tsx"),
  "utf8",
);

describe("PostDeleteAction — command wiring", () => {
  it("submits the frozen DELETE command shape same-origin", () => {
    expect(source).toContain('action: "DELETE"');
    expect(source).toContain("payload: { postId, expectedVersion }");
    expect(source).toContain('credentials: "same-origin"');
    expect(source).toContain('"/api/admin/posts"');
  });

  it("gates the whole affordance on capabilities: renders nothing when the actor cannot delete", () => {
    expect(source).toContain("if (!canDelete) return null;");
  });

  it("requires an explicit confirmation dialog with an accessible title before deleting", () => {
    expect(source).toContain("AlertDialog");
    expect(source).toContain("AlertDialogTitle");
    // The delete request is only issued from the confirm action, not the trigger.
    expect(source).toMatch(/onClick=\{\(\) => void confirmDelete\(\)\}/);
  });

  it("navigates to the list only on a successful delete", () => {
    expect(source).toMatch(/router\.push\(listHref\)/);
  });

  it("reuses the editor's failure mapping so no raw code reaches the UI", () => {
    expect(source).toContain("failureMessageKey");
    expect(source).toContain("isFailureCode");
    // VERSION_CONFLICT (a stale delete) flows through the same mapping, not a silent success.
    expect(source).toContain('t(failureMessageKey(isFailureCode(code) ? code : "UNAVAILABLE"))');
  });

  it("uses no physical-direction utility", () => {
    expect(source).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(source).not.toMatch(/\btext-(left|right)\b/);
  });
});

describe("AdminPostDelete i18n", () => {
  it("defines the same keys in id, en, and ar, with genuine Arabic", () => {
    const flatten = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([k, v]) => flatten(v, prefix ? `${prefix}.${k}` : k))
        : [prefix];
    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      return flatten(JSON.parse(raw).AdminPostDelete).sort();
    });
    expect(id.length).toBeGreaterThan(10);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);

    const ar_ = JSON.parse(readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8"))
      .AdminPostDelete;
    expect(ar_.confirmTitle).toMatch(/[؀-ۿ]/);
    expect(ar_.confirmAction).toMatch(/[؀-ۿ]/);
  });

  it("carries the same failure copy as the editor", () => {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), "messages/id.json"), "utf8"));
    expect(raw.AdminPostDelete.error.VERSION_CONFLICT).toBe(raw.AdminPostEditor.error.VERSION_CONFLICT);
  });
});
