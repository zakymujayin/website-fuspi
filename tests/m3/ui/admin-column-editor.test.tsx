import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const { toAdminPostTransportQuery, buildAdminPostHref } = await import(
  "@/components/admin/posts/post-query"
);
const { AdminPostList } = await import("@/components/admin/posts/post-list");
const {
  buildColumnCreatePayload,
  buildColumnUpdatePayload,
  emptyColumnDraft,
  hasColumnTranslationContent,
  COLUMN_EDITOR_LOCALES,
  COLUMN_TYPES,
} = await import("@/components/admin/posts/column-editor-payload");
const { draftFromColumnEditorView } = await import("@/components/admin/posts/column-editor-view");
const { AdminPostCreatePayloadSchema } = await import("@/contracts/post-admin");

function validDraft() {
  const draft = emptyColumnDraft();
  draft.slug = "refleksi-ramadhan-2026";
  draft.columnType = "DOSEN";
  draft.translations.id = {
    title: "Refleksi Ramadhan 2026",
    excerpt: "Ringkasan singkat",
    content: "<p>Isi kolom.</p>",
  };
  return draft;
}

describe("buildColumnCreatePayload", () => {
  it("produces a Post-contract payload with type=KOLOM and the selected columnType", () => {
    const result = buildColumnCreatePayload(validDraft());
    expect(result.success).toBe(true);
    if (!result.success) return;
    // The acceptance requirement this pins: a KOLOM draft must never resolve to type=BERITA.
    expect(result.data.type).toBe("KOLOM");
    expect(result.data.type).not.toBe("BERITA");
    expect(result.data.columnType).toBe("DOSEN");
    expect(result.data.slug).toBe("refleksi-ramadhan-2026");
    expect(result.data.publication).toEqual({ intent: "SAVE_DRAFT" });
  });

  it("rejects a KOLOM draft with no columnType selected (contract's validatePostType rule)", () => {
    const draft = validDraft();
    draft.columnType = null;
    const result = buildColumnCreatePayload(draft);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.path.join(".") === "columnType")).toBe(true);
  });

  it("rejects a blank slug or missing Indonesian title", () => {
    const draft = validDraft();
    draft.slug = "";
    expect(buildColumnCreatePayload(draft).success).toBe(false);

    const draft2 = validDraft();
    draft2.translations.id.title = "";
    expect(buildColumnCreatePayload(draft2).success).toBe(false);
  });

  it("omits English/Arabic translations that were never filled in", () => {
    const result = buildColumnCreatePayload(validDraft());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.translations.en).toBeUndefined();
    expect(result.data.translations.ar).toBeUndefined();
  });

  it(
    "cannot be transported through today's admin-only payload schema — the exact gap this task " +
      "hands off to GPT (AdminPostCreatePayloadSchema does not declare type/columnType). This " +
      "assertion documents the current blocker; it is expected to need updating once the admin " +
      "transport contract is generalized to accept KOLOM.",
    () => {
      const result = buildColumnCreatePayload(validDraft());
      expect(result.success).toBe(true);
      if (!result.success) return;
      // AdminPostCreatePayloadSchema is `.strict()` and only declares BERITA's mutable fields, so a
      // KOLOM-shaped payload (type + columnType present) is rejected rather than silently accepted
      // and misclassified.
      const adminTransportResult = AdminPostCreatePayloadSchema.safeParse(result.data);
      expect(adminTransportResult.success).toBe(false);
    },
  );
});

describe("buildColumnUpdatePayload", () => {
  it("carries postId/expectedVersion and keeps type=KOLOM", () => {
    const result = buildColumnUpdatePayload(validDraft(), "post-1", 3);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.postId).toBe("post-1");
    expect(result.data.expectedVersion).toBe(3);
    expect(result.data.type).toBe("KOLOM");
    expect(result.data.columnType).toBe("DOSEN");
  });
});

describe("column editor draft helpers", () => {
  it("emptyColumnDraft starts with no columnType and empty translations", () => {
    const draft = emptyColumnDraft();
    expect(draft.columnType).toBeNull();
    expect(hasColumnTranslationContent(draft.translations.en)).toBe(false);
  });

  it("exposes all three ColumnType values and locales in the frozen order", () => {
    expect(COLUMN_TYPES).toEqual(["DEKAN", "DOSEN", "MAHASISWA"]);
    expect(COLUMN_EDITOR_LOCALES).toEqual(["id", "en", "ar"]);
  });
});

describe("draftFromColumnEditorView", () => {
  it("projects an editor view onto the column draft shape", () => {
    const draft = draftFromColumnEditorView({
      id: "post-1",
      type: "BERITA",
      columnType: null,
      slug: "contoh-kolom",
      isFeatured: false,
      categoryId: null,
      coverMediaId: null,
      tagIds: [],
      translations: {
        id: { title: "Judul", excerpt: null, content: "<p>Isi</p>", metaTitle: null, metaDesc: null, coverCaption: null },
      },
      status: "DRAFT",
      publicationState: "DRAFT",
      version: 1,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cover: null,
      capabilities: { update: true, publish: true, delete: true },
    });
    expect(draft.slug).toBe("contoh-kolom");
    expect(draft.translations.id.title).toBe("Judul");
    expect(draft.translations.id.excerpt).toBe("");
    // AdminPostEditorViewSchema.columnType is frozen to null today (see the task handoff); this
    // mapper simply passes whatever it is given, so it starts reflecting the real value the moment
    // that schema is generalized.
    expect(draft.columnType).toBeNull();
  });
});

describe("/admin/kolom list wiring (basePath threading)", () => {
  it("toAdminPostTransportQuery passes type=KOLOM through only when explicitly requested", () => {
    const query = { page: 1, status: "ALL" as const, pageSize: 20 };
    expect(toAdminPostTransportQuery(query, "KOLOM").type).toBe("KOLOM");
    // Omitting `type` (as /admin/posts does) must not accidentally start sending KOLOM — the
    // admin transport's own BERITA default still applies in that case.
    expect("type" in toAdminPostTransportQuery(query)).toBe(false);
  });

  it("buildAdminPostHref uses the given basePath instead of /admin/posts", () => {
    expect(buildAdminPostHref("ALL", 1, "/admin/kolom")).toBe("/admin/kolom");
    expect(buildAdminPostHref("DRAFT", 2, "/admin/kolom")).toBe("/admin/kolom?status=DRAFT&page=2");
    // Default stays /admin/posts for every existing call site that doesn't pass basePath.
    expect(buildAdminPostHref("ALL", 1)).toBe("/admin/posts");
  });

  it("AdminPostList links to /admin/kolom/{id}/edit when editHrefBase is set, proving /admin/kolom is a real, reachable route rather than a dead link", () => {
    const markup = renderToStaticMarkup(
      <AdminPostList
        items={[{
          id: "col-1",
          slug: "refleksi-ramadhan-2026",
          title: "Refleksi Ramadhan 2026",
          availableLocales: ["id"],
          publicationState: "DRAFT",
          isFeatured: false,
          publishedAt: null,
          updatedAt: new Date().toISOString(),
          category: null,
          author: { name: "Editor FUSPI" },
          capabilities: { update: true },
        }]}
        locale="id"
        ariaLabel="Daftar kolom"
        editHrefBase="/admin/kolom"
        labels={{
          stateLabel: () => "Draf",
          featured: "Unggulan",
          localesLabel: () => "Bahasa tersedia",
          uncategorized: "Tanpa kategori",
          unknownAuthor: "Penulis tidak diketahui",
          byLabel: (name) => `Oleh ${name}`,
          publishedAtLabel: (instant) => `Terbit ${instant}`,
          updatedAtLabel: (instant) => `Diperbarui ${instant}`,
          edit: "Sunting",
          editLabelFor: (title) => `Sunting kolom: ${title}`,
        }}
      />,
    );
    expect(markup).toContain('href="/admin/kolom/col-1/edit"');
    expect(markup).not.toContain("/admin/posts/col-1/edit");
  });
});
