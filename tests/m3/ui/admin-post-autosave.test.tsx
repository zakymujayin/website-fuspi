import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AdminPostAutosavePayloadSchema } from "@/contracts/post-admin";
import {
  buildAutosavePayload,
  emptyDraft,
  type PostEditorCarriedFields,
  type PostEditorDraft,
} from "@/components/admin/posts/post-editor-payload";

const carried: PostEditorCarriedFields = { categoryId: "cat-1", tagIds: ["t-1", "t-2"] };

function draftWith(content: string): PostEditorDraft {
  const draft = emptyDraft();
  draft.slug = "sebuah-berita";
  draft.translations.id = { title: "Judul", excerpt: "  ", content };
  return draft;
}

describe("buildAutosavePayload", () => {
  it("emits the frozen AUTOSAVE_DRAFT payload with the passed version and preserved carried fields", () => {
    const parsed = buildAutosavePayload(draftWith("<p>Halo</p>"), "post-1", 7, carried);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.intent).toBe("AUTOSAVE_DRAFT");
    expect(parsed.data.postId).toBe("post-1");
    expect(parsed.data.expectedVersion).toBe(7);
    // Fields the editor cannot edit must ride through untouched, exactly like UPDATE.
    expect(parsed.data.categoryId).toBe("cat-1");
    expect(parsed.data.tagIds).toEqual(["t-1", "t-2"]);
    // An all-whitespace excerpt is normalised to null by the contract.
    expect(parsed.data.translations.id.excerpt).toBeNull();
  });

  it("always uses the version it is given, so the shared owner controls optimistic locking", () => {
    const draft = draftWith("<p>x</p>");
    expect(buildAutosavePayload(draft, "post-1", 3, carried).success).toBe(true);
    const a = buildAutosavePayload(draft, "post-1", 3, carried);
    const b = buildAutosavePayload(draft, "post-1", 99, carried);
    if (a.success && b.success) {
      expect(a.data.expectedVersion).toBe(3);
      expect(b.data.expectedVersion).toBe(99);
    }
  });

  it("produces a body the frozen schema accepts as an AUTOSAVE command payload", () => {
    const parsed = buildAutosavePayload(draftWith("<p>ok</p>"), "post-1", 1, carried);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(AdminPostAutosavePayloadSchema.safeParse(parsed.data).success).toBe(true);
    }
  });

  it("rejects an empty required Indonesian title (autosave never persists an invalid draft)", () => {
    const draft = draftWith("<p>x</p>");
    draft.translations.id.title = "   ";
    expect(buildAutosavePayload(draft, "post-1", 1, carried).success).toBe(false);
  });
});

describe("shared-version wiring (source contracts)", () => {
  const shell = readFileSync(
    path.join(process.cwd(), "src/components/admin/posts/post-editor-shell.tsx"),
    "utf8",
  );
  const form = readFileSync(
    path.join(process.cwd(), "src/components/admin/posts/post-editor-form.tsx"),
    "utf8",
  );
  const page = readFileSync(
    path.join(
      process.cwd(),
      "src/app/[locale]/admin/posts/[postId]/edit/page.tsx",
    ),
    "utf8",
  );

  it("the shell owns one version and feeds it to publication, form, and delete", () => {
    expect(shell).toContain("useState(initialVersion)");
    // The same `version` value reaches all three mutation surfaces.
    expect(shell).toMatch(/PostPublicationActions[\s\S]*expectedVersion=\{version\}/);
    expect(shell).toMatch(/PostEditorForm[\s\S]*expectedVersion=\{version\}/);
    expect(shell).toMatch(/PostDeleteAction[\s\S]*expectedVersion=\{version\}/);
    expect(shell).toContain("onVersionChange={setVersion}");
  });

  it("the shell adopts a newer server version after a refresh", () => {
    // Adoption happens during render (the React-sanctioned pattern), not in an effect, so it does not
    // trip react-hooks/set-state-in-effect: a prevInitialVersion sentinel detects the advance.
    expect(shell).toContain("setVersion(initialVersion)");
    expect(shell).toContain("initialVersion !== prevInitialVersion");
  });

  it("the edit page renders the shell, not the three components directly", () => {
    expect(page).toContain("<PostEditorShell");
    expect(page).not.toContain("<PostPublicationActions");
    expect(page).not.toContain("<PostDeleteAction");
  });

  it("autosave posts the AUTOSAVE action on the contract interval and reports the new version", () => {
    expect(form).toContain('action: "AUTOSAVE"');
    expect(form).toContain("ADMIN_POST_AUTOSAVE_INTERVAL_MS");
    expect(form).toContain("report?.(nextVersion)");
    // A conflict must stop autosaving so a stale local version can't keep firing.
    expect(form).toContain('code === "VERSION_CONFLICT"');
    expect(form).toContain("stoppedRef.current = true");
  });

  it("autosave never runs over an in-flight manual submit", () => {
    expect(form).toContain("if (busy) return;");
  });

  it("defines the autosave strings in id, en, ar with a real Arabic value", () => {
    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = JSON.parse(
        readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8"),
      );
      return raw.AdminPostEditor.autosave;
    });
    const keys = Object.keys(id).sort();
    expect(keys).toEqual(["conflict", "error", "saved", "saving"]);
    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(ar).sort()).toEqual(keys);
    expect(id.saved).toContain("{time}");
    expect(ar.saving).toMatch(/[؀-ۿ]/);
  });
});
