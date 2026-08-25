import { readFileSync, globSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const {
  buildCreatePayload,
  buildUpdatePayload,
  collectFieldErrors,
  emptyDraft,
  hasTranslationContent,
  POST_EDITOR_LOCALES,
} = await import("@/components/admin/posts/post-editor-payload");
const { failureMessageKey, isFailureCode, FIELD_SCOPED_FAILURES, POST_EDITOR_FAILURE_CODES } =
  await import("@/components/admin/posts/post-editor-errors");
const { draftFromEditorView } = await import("@/components/admin/posts/post-editor-view");

function validDraft() {
  const draft = emptyDraft();
  draft.slug = "wisuda-fuspi-2026";
  draft.translations.id = {
    title: "Wisuda FUSPI 2026",
    excerpt: "Ringkasan singkat",
    content: "<p>Isi berita.</p>",
  };
  return draft;
}

const TAXONOMY = {
  categoryId: "11111111-1111-4111-8111-111111111111",
  tagIds: ["33333333-3333-4333-8333-333333333333"],
};
// coverMediaId, categoryId, and tagIds now travel on the editable draft.
const COVER_ID = "22222222-2222-4222-8222-222222222222";

describe("buildCreatePayload", () => {
  it("produces a SAVE_DRAFT payload with empty taxonomy fields by default", () => {
    const result = buildCreatePayload(validDraft());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.publication).toEqual({ intent: "SAVE_DRAFT" });
    expect(result.data.categoryId).toBeNull();
    expect(result.data.coverMediaId).toBeNull();
    expect(result.data.tagIds).toEqual([]);
    expect(result.data.slug).toBe("wisuda-fuspi-2026");
  });

  it("includes selected category and tags on create", () => {
    const draft = validDraft();
    draft.categoryId = TAXONOMY.categoryId;
    draft.tagIds = TAXONOMY.tagIds;
    const result = buildCreatePayload(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.categoryId).toBe(TAXONOMY.categoryId);
    expect(result.data.tagIds).toEqual(TAXONOMY.tagIds);
  });

  it("trims the slug and title", () => {
    const draft = validDraft();
    draft.slug = "  wisuda-fuspi-2026  ";
    draft.translations.id.title = "  Wisuda FUSPI 2026  ";
    const result = buildCreatePayload(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.slug).toBe("wisuda-fuspi-2026");
    expect(result.data.translations.id.title).toBe("Wisuda FUSPI 2026");
  });

  it("converts a blank excerpt to null rather than an empty string", () => {
    const draft = validDraft();
    draft.translations.id.excerpt = "   ";
    const result = buildCreatePayload(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.id.excerpt).toBeNull();
  });

  it("omits EN and AR when the editor typed nothing", () => {
    const result = buildCreatePayload(validDraft());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.en).toBeUndefined();
    expect(result.data.translations.ar).toBeUndefined();
  });

  it("includes AR once any Arabic field is filled", () => {
    const draft = validDraft();
    draft.translations.ar = {
      title: "حفل التخرج",
      excerpt: "",
      content: "<p>المحتوى</p>",
    };
    const result = buildCreatePayload(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.ar?.title).toBe("حفل التخرج");
    expect(result.data.translations.ar?.excerpt).toBeNull();
  });

  it("rejects a missing Indonesian title", () => {
    const draft = validDraft();
    draft.translations.id.title = "";
    expect(buildCreatePayload(draft).success).toBe(false);
  });

  it("rejects an invalid slug shape", () => {
    const draft = validDraft();
    draft.slug = "Not A Valid Slug!";
    expect(buildCreatePayload(draft).success).toBe(false);
  });

  it("rejects empty content", () => {
    const draft = validDraft();
    draft.translations.id.content = "";
    expect(buildCreatePayload(draft).success).toBe(false);
  });
});

describe("buildUpdatePayload", () => {
  it("round-trips editable categoryId, tagIds, and coverMediaId from the draft", () => {
    const draft = { ...validDraft(), ...TAXONOMY, coverMediaId: COVER_ID };
    const result = buildUpdatePayload(
      draft,
      "44444444-4444-4444-8444-444444444444",
      7,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.categoryId).toBe(TAXONOMY.categoryId);
    expect(result.data.tagIds).toEqual(TAXONOMY.tagIds);
    expect(result.data.coverMediaId).toBe(COVER_ID);
  });

  it("keeps the draft category when updating", () => {
    const draft = {...validDraft(), categoryId: TAXONOMY.categoryId};
    const result = buildUpdatePayload(
      draft,
      "44444444-4444-4444-8444-444444444444",
      1,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.categoryId).not.toBeNull();
  });

  it("carries the expected version for optimistic locking", () => {
    const result = buildUpdatePayload(
      validDraft(),
      "44444444-4444-4444-8444-444444444444",
      12,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.expectedVersion).toBe(12);
  });

  it("rejects a non-positive expected version", () => {
    const result = buildUpdatePayload(
      validDraft(),
      "44444444-4444-4444-8444-444444444444",
      0,
    );
    expect(result.success).toBe(false);
  });

  it("preserves intentionally empty taxonomy fields", () => {
    const result = buildUpdatePayload(
      validDraft(),
      "44444444-4444-4444-8444-444444444444",
      3,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.categoryId).toBeNull();
    expect(result.data.tagIds).toEqual([]);
  });
});

describe("hasTranslationContent", () => {
  it("treats whitespace-only fields as empty", () => {
    expect(hasTranslationContent({ title: "  ", excerpt: "\n", content: " " })).toBe(false);
  });

  it("detects content in any single field", () => {
    expect(hasTranslationContent({ title: "", excerpt: "x", content: "" })).toBe(true);
  });
});

describe("collectFieldErrors", () => {
  it("flattens Zod paths to dotted keys the form can match", () => {
    const errors = collectFieldErrors([
      { path: ["translations", "id", "title"], message: "required" },
      { path: ["slug"], message: "bad slug" },
    ]);
    expect(errors["translations.id.title"]).toBe("required");
    expect(errors.slug).toBe("bad slug");
  });

  it("keeps the first message per path", () => {
    const errors = collectFieldErrors([
      { path: ["slug"], message: "first" },
      { path: ["slug"], message: "second" },
    ]);
    expect(errors.slug).toBe("first");
  });
});

describe("failure code mapping — no raw code may reach the UI", () => {
  it.each(POST_EDITOR_FAILURE_CODES)("maps %s to its own message key", (code) => {
    expect(failureMessageKey(code)).toBe(`error.${code}`);
  });

  it("collapses an unknown or future code to the generic key", () => {
    expect(failureMessageKey("SOME_NEW_CODE")).toBe("error.UNAVAILABLE");
    expect(failureMessageKey("")).toBe("error.UNAVAILABLE");
  });

  it("recognises only real contract codes", () => {
    expect(isFailureCode("VERSION_CONFLICT")).toBe(true);
    expect(isFailureCode("NOPE")).toBe(false);
    expect(isFailureCode(undefined)).toBe(false);
  });

  it("scopes SLUG_CONFLICT to the slug field and leaves others form-level", () => {
    expect(FIELD_SCOPED_FAILURES.SLUG_CONFLICT).toBe("slug");
    expect(FIELD_SCOPED_FAILURES.VERSION_CONFLICT).toBeUndefined();
  });
});

describe("draftFromEditorView", () => {
  const baseView = {
    id: "44444444-4444-4444-8444-444444444444",
    slug: "berita-lama",
    isFeatured: true,
    version: 4,
    categoryId: TAXONOMY.categoryId,
    coverMediaId: null,
    tagIds: TAXONOMY.tagIds,
    images: [],
    translations: {
      id: { title: "Judul", excerpt: null, content: "<p>isi</p>" },
    },
  };

  it("maps a null excerpt to an empty controlled input", () => {
    const draft = draftFromEditorView(baseView as never);
    expect(draft.translations.id.excerpt).toBe("");
    expect(draft.translations.id.title).toBe("Judul");
    expect(draft.slug).toBe("berita-lama");
    expect(draft.isFeatured).toBe(true);
    expect(draft.categoryId).toBe(TAXONOMY.categoryId);
    expect(draft.tagIds).toEqual(TAXONOMY.tagIds);
  });

  it("gives absent EN and AR blank drafts", () => {
    const draft = draftFromEditorView(baseView as never);
    expect(draft.translations.en).toEqual({ title: "", excerpt: "", content: "" });
    expect(draft.translations.ar).toEqual({ title: "", excerpt: "", content: "" });
  });

  it("preserves an existing AR translation", () => {
    const view = {
      ...baseView,
      translations: {
        ...baseView.translations,
        ar: { title: "عنوان", excerpt: "مقتطف", content: "<p>م</p>" },
      },
    };
    const draft = draftFromEditorView(view as never);
    expect(draft.translations.ar.title).toBe("عنوان");
  });

  it("survives a full round trip back into an update payload", () => {
    const draft = draftFromEditorView(baseView as never);
    const result = buildUpdatePayload(draft, baseView.id, baseView.version);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.id.excerpt).toBeNull();
    expect(result.data.categoryId).toBe(TAXONOMY.categoryId);
    // draftFromEditorView carries the view's cover onto the editable draft.
    expect(result.data.coverMediaId).toBe(baseView.coverMediaId);
  });
});

describe("direction safety and message parity", () => {
  it("uses no physical direction utility in the editor surface", () => {
    const forbidden = [
      /\bml-\d/, /\bmr-\d/, /\bpl-\d/, /\bpr-\d/,
      /\btext-left\b/, /\btext-right\b/, /\bleft-\d/, /\bright-\d/,
      /\bborder-l\b/, /\bborder-r\b/, /\brounded-l-/, /\bfloat-left\b/,
    ];
    const files = [
      ...globSync("src/components/admin/posts/post-editor*.{ts,tsx}", { cwd: process.cwd() }),
      ...globSync("src/app/[locale]/admin/posts/new/*.tsx", { cwd: process.cwd() }),
      ...globSync("src/app/[locale]/admin/posts/[postId]/edit/*.tsx", { cwd: process.cwd() }),
    ];
    expect(files.length).toBeGreaterThan(3);
    for (const relativePath of files) {
      const contents = readFileSync(path.join(process.cwd(), relativePath), "utf8");
      for (const pattern of forbidden) {
        expect(contents, `${relativePath} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("never authors English or Arabic by hand — both are produced by the translate action", () => {
    const form = readFileSync(
      path.join(process.cwd(), "src/components/admin/posts/post-editor-form.tsx"),
      "utf8",
    );
    // The editor only takes manual Indonesian input; en/ar come from handleTranslate,
    // which the public site then renders with the correct lang/dir per docs/12.
    expect(form).not.toMatch(/name="en\.title"|name="ar\.title"/);
    expect(form).toContain('(["en", "ar"] as const).map((locale) =>');
    expect(form).toContain("handleTranslate(locale)");
  });

  it("submits same-origin so the server CSRF check can succeed", () => {
    const form = readFileSync(
      path.join(process.cwd(), "src/components/admin/posts/post-editor-form.tsx"),
      "utf8",
    );
    expect(form).toContain('credentials: "same-origin"');
    expect(form).toContain('"/api/admin/posts"');
  });

  it("defines the same AdminPostEditor keys in id, en, and ar", () => {
    const flatten = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null
        ? Object.entries(value).flatMap(([key, child]) =>
            flatten(child, prefix ? `${prefix}.${key}` : key))
        : [prefix];

    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      return flatten(JSON.parse(raw).AdminPostEditor).sort();
    });
    expect(id.length).toBeGreaterThan(25);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);
  });

  it("provides translated copy for every contract failure code in every locale", () => {
    for (const locale of ["id", "en", "ar"]) {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      const errors = JSON.parse(raw).AdminPostEditor.error;
      for (const code of POST_EDITOR_FAILURE_CODES) {
        expect(errors[code], `${locale} missing ${code}`).toBeTruthy();
      }
    }
  });

  it("keeps genuine Arabic copy, not untranslated Latin text", () => {
    const raw = readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8");
    const block = JSON.parse(raw).AdminPostEditor;
    expect(block.createTitle).toMatch(/[؀-ۿ]/);
    expect(block.error.VERSION_CONFLICT).toMatch(/[؀-ۿ]/);
  });

  it("covers all three content locales in the form", () => {
    expect(POST_EDITOR_LOCALES).toEqual(["id", "en", "ar"]);
  });
});
