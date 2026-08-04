import { describe, expect, it } from "vitest";

const {
  buildCreatePayload,
  buildUpdatePayload,
  collectFieldErrors,
  emptyDraft,


} = await import("@/components/admin/pages/page-editor-payload");
const { failureMessageKey, isFailureCode, FIELD_SCOPED_FAILURES } =
  await import("@/components/admin/pages/page-editor-errors");
const { draftFromEditorView } = await import("@/components/admin/pages/page-editor-view");

function validDraft() {
  const draft = emptyDraft();
  draft.slug = "profil-fuspi";
  draft.translations.id = {
    title: "Profil FUSPI",
    content: "<p>Isi halaman.</p>",
    metaTitle: "Profil",
    metaDesc: "Deskripsi",
  };
  return draft;
}

const HERO_ID = "22222222-2222-4222-8222-222222222222";

describe("buildCreatePayload", () => {
  it("produces a SAVE_DRAFT payload", () => {
    const result = buildCreatePayload(validDraft());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.publication).toEqual({ intent: "SAVE_DRAFT" });
    expect(result.data.slug).toBe("profil-fuspi");
    expect(result.data.parentId).toBeNull();
    expect(result.data.heroMediaId).toBeNull();
    expect(result.data.order).toBe(0);
  });

  it("trims the slug and title", () => {
    const draft = validDraft();
    draft.slug = "  profil-fuspi  ";
    draft.translations.id.title = "  Profil FUSPI  ";
    const result = buildCreatePayload(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.slug).toBe("profil-fuspi");
    expect(result.data.translations.id.title).toBe("Profil FUSPI");
  });

  it("converts blank meta fields to null", () => {
    const draft = validDraft();
    draft.translations.id.metaTitle = "   ";
    draft.translations.id.metaDesc = "   ";
    const result = buildCreatePayload(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.id.metaTitle).toBeNull();
    expect(result.data.translations.id.metaDesc).toBeNull();
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
      title: "الملف الشخصي",
      content: "<p>المحتوى</p>",
      metaTitle: "",
      metaDesc: "",
    };
    const result = buildCreatePayload(draft);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.ar?.title).toBe("الملف الشخصي");
    expect(result.data.translations.ar?.metaTitle).toBeNull();
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

  it("rejects self-parent", () => {
    const draft = validDraft();
    draft.parentId = "page-1";
    const result = buildUpdatePayload(draft, "page-1", 1);
    expect(result.success).toBe(false);
  });
});

describe("buildUpdatePayload", () => {
  it("round-trips heroMediaId and order", () => {
    const draft = { ...validDraft(), heroMediaId: HERO_ID, order: 5 };
    const result = buildUpdatePayload(draft, "page-1", 3);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.heroMediaId).toBe(HERO_ID);
    expect(result.data.order).toBe(5);
    expect(result.data.expectedVersion).toBe(3);
  });
});

describe("collectFieldErrors", () => {
  it("maps dotted Zod paths", () => {
    const errors = collectFieldErrors([
      { path: ["translations", "id", "title"], message: "Required" },
      { path: ["slug"], message: "Invalid" },
    ]);
    expect(errors["translations.id.title"]).toBe("Required");
    expect(errors["slug"]).toBe("Invalid");
  });
});

describe("draftFromEditorView", () => {
  it("converts nullable meta fields to empty strings", () => {
    const view = {
      id: "page-1",
      slug: "profil",
      status: "DRAFT" as const,
      order: 0,
      version: 1,
      parentId: null,
      heroMediaId: null,
      translations: {
        id: {
          title: "Profil",
          content: "<p>Isi</p>",
          metaTitle: null,
          metaDesc: null,
        },
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const draft = draftFromEditorView(view as never);
    expect(draft.translations.id.metaTitle).toBe("");
    expect(draft.translations.id.metaDesc).toBe("");
    expect(draft.translations.en.title).toBe("");
    expect(draft.translations.ar.title).toBe("");
  });
});

describe("failure mapping", () => {
  it("maps known codes to translation keys", () => {
    expect(failureMessageKey("VERSION_CONFLICT")).toBe("error.VERSION_CONFLICT");
  });

  it("collapses unknown codes to UNAVAILABLE", () => {
    expect(failureMessageKey("FUTURE_CODE")).toBe("error.UNAVAILABLE");
  });

  it("identifies known failure codes", () => {
    expect(isFailureCode("SLUG_CONFLICT")).toBe(true);
    expect(isFailureCode("NOT_A_CODE")).toBe(false);
  });

  it("scopes hierarchy and parent errors to parentId", () => {
    expect(FIELD_SCOPED_FAILURES.HIERARCHY_CYCLE).toBe("parentId");
    expect(FIELD_SCOPED_FAILURES.PARENT_INVALID).toBe("parentId");
  });
});
