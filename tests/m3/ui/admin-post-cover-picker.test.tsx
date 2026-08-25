import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const { buildCreatePayload, buildUpdatePayload, emptyDraft } = await import(
  "@/components/admin/posts/post-editor-payload"
);
const { draftFromEditorView } = await import("@/components/admin/posts/post-editor-view");

const COVER_ID = "22222222-2222-4222-8222-222222222222";

function validDraft() {
  const d = emptyDraft();
  d.slug = "berita-sampul";
  d.translations.id = { title: "Berita Sampul", excerpt: "", content: "<p>x</p>" };
  return d;
}

describe("coverMediaId flows through the editable draft", () => {
  it("create sends the draft's coverMediaId (null by default)", () => {
    const r = buildCreatePayload(validDraft());
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.coverMediaId).toBeNull();
  });

  it("create sends a chosen coverMediaId", () => {
    const r = buildCreatePayload({ ...validDraft(), coverMediaId: COVER_ID });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.coverMediaId).toBe(COVER_ID);
  });

  it("update takes coverMediaId from the draft, not the carried set", () => {
    const r = buildUpdatePayload(
      { ...validDraft(), coverMediaId: COVER_ID },
      "44444444-4444-4444-8444-444444444444",
      3,
    );
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.coverMediaId).toBe(COVER_ID);
  });

  it("clearing the cover sends null on update", () => {
    const r = buildUpdatePayload(
      { ...validDraft(), coverMediaId: null },
      "44444444-4444-4444-8444-444444444444",
      3,
    );
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.coverMediaId).toBeNull();
  });

  it("draftFromEditorView seeds coverMediaId from the loaded view", () => {
    const view = {
      id: "p1",
      slug: "s",
      isFeatured: false,
      version: 1,
      categoryId: null,
      coverMediaId: COVER_ID,
      tagIds: [],
      images: [],
      translations: { id: { title: "T", excerpt: null, content: "<p>x</p>" } },
    };
    expect(draftFromEditorView(view as never).coverMediaId).toBe(COVER_ID);
  });
});

describe("PostCoverPicker component wiring", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/components/admin/posts/post-cover-picker.tsx"),
    "utf8",
  );

  it("reads images from the Media Library API, same-origin, images only", () => {
    expect(source).toContain('"/api/admin/media?kind=IMAGE"');
    expect(source).toContain('credentials: "same-origin"');
  });

  it("select sets the id and clear sets null via onChange", () => {
    expect(source).toContain("onChange(item.id)");
    expect(source).toContain("onChange(null)");
  });

  it("renders the current cover via the shared media thumbnail resolver", () => {
    expect(source).toContain("resolveAdminMediaThumbnail");
    expect(source).toContain("AdminMediaThumbnail");
  });

  it("uses no physical-direction utility", () => {
    expect(source).not.toMatch(/\b(ml|mr|pl|pr|left|right)-\d/);
    expect(source).not.toMatch(/\btext-(left|right)\b/);
  });
});

describe("AdminPostCoverPicker i18n", () => {
  it("defines the same keys in id, en, ar with genuine Arabic", () => {
    const [id, en, ar] = ["id", "en", "ar"].map((locale) => {
      const raw = readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8");
      return Object.keys(JSON.parse(raw).AdminPostCoverPicker).sort();
    });
    expect(id.length).toBeGreaterThan(8);
    expect(en).toEqual(id);
    expect(ar).toEqual(id);
    const arBlock = JSON.parse(
      readFileSync(path.join(process.cwd(), "messages/ar.json"), "utf8"),
    ).AdminPostCoverPicker;
    expect(arBlock.label).toMatch(/[؀-ۿ]/);
  });
});
