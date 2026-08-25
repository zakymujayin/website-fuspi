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
    const helper = readFileSync(
      path.join(process.cwd(), "src/components/admin/media/media-picker-pagination.ts"),
      "utf8",
    );
    expect(source).toContain("buildAdminImagePickerHref");
    expect(helper).toContain('kind: "IMAGE"');
    expect(helper).toContain('pageSize: String(ADMIN_IMAGE_PICKER_PAGE_SIZE)');
    expect(source).toContain('credentials: "same-origin"');
  });

  it("post create/edit pages pass the stable uploads fallback to the picker", () => {
    const pages = [
      "src/app/[locale]/admin/posts/new/page.tsx",
      "src/app/[locale]/admin/posts/[postId]/edit/page.tsx",
    ].map((relativePath) => readFileSync(path.join(process.cwd(), relativePath), "utf8"));
    for (const page of pages) {
      expect(page).toContain('process.env.UPLOAD_PUBLIC_URL ?? "/uploads"');
      expect(page).not.toContain('process.env.UPLOAD_PUBLIC_URL ?? ""');
    }
  });

  it("admin media API falls back to the public uploads route when listing picker images", () => {
    const route = readFileSync(
      path.join(process.cwd(), "src/app/api/admin/media/route.ts"),
      "utf8",
    );
    expect(route).toContain('process.env.UPLOAD_PUBLIC_URL ?? "/uploads"');
    expect(route).not.toContain('process.env.UPLOAD_PUBLIC_URL ?? ""');
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
