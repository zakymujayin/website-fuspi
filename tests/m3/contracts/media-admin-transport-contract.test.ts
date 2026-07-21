import {describe, expect, it} from "vitest";

import {
  ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT,
  AdminMediaItemSchema,
  AdminMediaListResultSchema,
  AdminMediaListSearchParamsSchema,
  AdminMediaMutationResponseSchema,
  AdminMediaPersistenceInvariantDispositionSchema,
  AdminMediaTransportCommandSchema,
  AdminMediaUploadMetadataSchema,
  adminMediaPersistenceInvariantDisposition,
  toAdminMediaMutationResponse,
} from "@/contracts/media-admin";

const STORAGE_KEY = `2026/07/${"a".repeat(64)}.webp`;
const PUBLIC_IMAGE = {
  id: "media-1",
  url: `/uploads/${STORAGE_KEY}`,
  mimeType: "image/webp" as const,
  size: 120_000,
  alt: "Mahasiswa FUSPI mengikuti kegiatan akademik",
  isDecorative: false,
  width: 1_200,
  height: 800,
  originalName: "kegiatan-fuspi.png",
  createdAt: "2026-07-21T08:00:00+07:00",
  uploaderName: "Editor FUSPI",
};

const IMAGE_INTENT = {
  policy: "CMS_IMAGE" as const,
  alt: "Mahasiswa FUSPI mengikuti kegiatan akademik",
  isDecorative: false,
};

describe("M3 Media Picker read transport contract", () => {
  it("normalizes a bounded picker query without accepting ownership scope", () => {
    expect(AdminMediaListSearchParamsSchema.parse({})).toEqual({
      page: 1, pageSize: 24, kind: "ALL",
    });
    expect(AdminMediaListSearchParamsSchema.parse({
      page: "10000", pageSize: "48", kind: "PDF",
    })).toEqual({page: 10_000, pageSize: 48, kind: "PDF"});
    for (const query of [
      {page: ["1", "2"]},
      {page: "0"},
      {page: "1.5"},
      {pageSize: "49"},
      {kind: ["IMAGE", "PDF"]},
      {uploaderId: "another-editor"},
      {ownership: "ANY"},
      {storageClass: "PRIVATE"},
      {fields: "storageKey,checksumSha256"},
    ]) {
      expect(AdminMediaListSearchParamsSchema.safeParse(query).success).toBe(false);
    }
  });

  it("accepts only safe public image/PDF fields needed by the picker", () => {
    expect(AdminMediaItemSchema.safeParse(PUBLIC_IMAGE).success).toBe(true);
    const pdfKey = `2026/07/${"b".repeat(64)}.pdf`;
    expect(AdminMediaItemSchema.safeParse({
      ...PUBLIC_IMAGE,
      id: "media-pdf",
      url: `https://fuspi.uinbanten.ac.id/uploads/${pdfKey}`,
      mimeType: "application/pdf",
      size: 5_000_000,
      alt: "",
      isDecorative: false,
      width: null,
      height: null,
      originalName: "pedoman-akademik.pdf",
    }).success).toBe(true);
  });

  it("rejects unsafe URLs, filenames, instants, private fields, and technical internals", () => {
    for (const item of [
      {...PUBLIC_IMAGE, url: "http://evil.invalid/uploads/a.webp"},
      {...PUBLIC_IMAGE, url: "/uploads/../private/a.webp"},
      {...PUBLIC_IMAGE, originalName: "../private/a.webp"},
      {...PUBLIC_IMAGE, originalName: "folder\\a.webp"},
      {...PUBLIC_IMAGE, createdAt: "21-07-2026"},
      {...PUBLIC_IMAGE, storageKey: STORAGE_KEY},
      {...PUBLIC_IMAGE, checksumSha256: "c".repeat(64)},
      {...PUBLIC_IMAGE, storageClass: "PUBLIC"},
      {...PUBLIC_IMAGE, uploaderId: "editor-1"},
      {...PUBLIC_IMAGE, absolutePath: "/srv/fuspi/shared/public/uploads/file.webp"},
      {...PUBLIC_IMAGE, uploaderEmail: "editor@example.test"},
    ]) {
      expect(AdminMediaItemSchema.safeParse(item).success).toBe(false);
    }
  });

  it("bounds pages and rejects repeated Media IDs", () => {
    expect(AdminMediaListResultSchema.safeParse({
      items: [PUBLIC_IMAGE], page: 1, pageSize: 24, total: 1, hasNextPage: false,
    }).success).toBe(true);
    expect(AdminMediaListResultSchema.safeParse({
      items: [PUBLIC_IMAGE, {...PUBLIC_IMAGE}],
      page: 1,
      pageSize: 24,
      total: 2,
      hasNextPage: false,
    }).success).toBe(false);
    expect(AdminMediaListResultSchema.safeParse({
      items: [PUBLIC_IMAGE], page: 1, pageSize: 1, total: 2, hasNextPage: false,
    }).success).toBe(false);
  });
});

describe("M3 multipart metadata and Media command contracts", () => {
  it("composes Media upload intent and enforces the 20-image request limit", () => {
    const intents = Array.from({length: ADMIN_MEDIA_IMAGE_UPLOAD_LIMIT}, (_, index) => ({
      ...IMAGE_INTENT,
      alt: `Kegiatan FUSPI nomor ${index + 1}`,
    }));
    expect(AdminMediaUploadMetadataSchema.safeParse({
      policy: "CMS_IMAGE",
      uploadCount: intents.length,
      intents,
    }).success).toBe(true);
    expect(AdminMediaUploadMetadataSchema.safeParse({
      policy: "CMS_IMAGE",
      uploadCount: 21,
      intents: [...intents, IMAGE_INTENT],
    }).success).toBe(false);
    expect(AdminMediaUploadMetadataSchema.safeParse({
      policy: "CMS_IMAGE", uploadCount: 2, intents: [IMAGE_INTENT],
    }).success).toBe(false);
  });

  it("allows exactly one public PDF metadata intent per field", () => {
    const pdfIntent = {policy: "PUBLIC_PDF", alt: "", isDecorative: false} as const;
    expect(AdminMediaUploadMetadataSchema.safeParse({
      policy: "PUBLIC_PDF", uploadCount: 1, intents: [pdfIntent],
    }).success).toBe(true);
    expect(AdminMediaUploadMetadataSchema.safeParse({
      policy: "PUBLIC_PDF", uploadCount: 2, intents: [pdfIntent, pdfIntent],
    }).success).toBe(false);
    expect(AdminMediaUploadMetadataSchema.safeParse({
      policy: "PUBLIC_PDF", uploadCount: 1, intents: [IMAGE_INTENT],
    }).success).toBe(false);
  });

  it("keeps file bytes and trusted identity/storage metadata outside multipart JSON", () => {
    for (const injected of [
      {files: [new Uint8Array([1, 2, 3])]},
      {uploaderId: "attacker"},
      {role: "ADMIN"},
      {ownership: "ANY"},
      {storageKey: STORAGE_KEY},
      {checksumSha256: "c".repeat(64)},
      {absolutePath: "/srv/fuspi/private"},
    ]) {
      expect(AdminMediaUploadMetadataSchema.safeParse({
        policy: "CMS_IMAGE", uploadCount: 1, intents: [IMAGE_INTENT], ...injected,
      }).success).toBe(false);
    }
    expect(AdminMediaUploadMetadataSchema.safeParse({
      policy: "CMS_IMAGE",
      uploadCount: 1,
      intents: [{...IMAGE_INTENT, alt: "", isDecorative: false}],
    }).success).toBe(false);
  });

  it("accepts strict accessibility metadata updates and reference-aware delete commands", () => {
    expect(AdminMediaTransportCommandSchema.safeParse({
      action: "UPDATE_METADATA",
      payload: {mediaId: "media-1", alt: "", isDecorative: true},
    }).success).toBe(true);
    expect(AdminMediaTransportCommandSchema.safeParse({
      action: "UPDATE_METADATA",
      payload: {mediaId: "media-1", alt: "", isDecorative: false},
    }).success).toBe(false);
    expect(AdminMediaTransportCommandSchema.safeParse({
      action: "UPDATE_METADATA",
      payload: {
        mediaId: "media-1", alt: "Deskripsi", isDecorative: false, uploaderId: "attacker",
      },
    }).success).toBe(false);
    expect(AdminMediaTransportCommandSchema.safeParse({
      action: "DELETE", payload: {mediaId: "media-1"},
    }).success).toBe(true);
    expect(AdminMediaTransportCommandSchema.safeParse({
      action: "DELETE", payload: {mediaId: "media-1", force: true},
    }).success).toBe(false);
  });
});

describe("M3 Media mutation and invariant response contract", () => {
  it("removes storage state from successful persistence output", () => {
    expect(toAdminMediaMutationResponse({
      ok: true, mediaId: "media-1", storageState: "COMMITTED",
    })).toEqual({ok: true, mediaId: "media-1"});
  });

  it("maps ownership, in-use, storage, and technical failures to stable generic codes", () => {
    expect(toAdminMediaMutationResponse({
      ok: false, code: "FORBIDDEN", storageState: "NOT_STAGED",
    })).toEqual({ok: false, code: "NOT_FOUND"});
    expect(toAdminMediaMutationResponse({
      ok: false, code: "MEDIA_IN_USE", storageState: "NOT_STAGED",
    })).toEqual({ok: false, code: "MEDIA_IN_USE"});
    expect(toAdminMediaMutationResponse({
      ok: false, code: "STORAGE_COMMIT_FAILED", storageState: "DISCARDED",
    })).toEqual({ok: false, code: "UPLOAD_FAILED"});
    expect(toAdminMediaMutationResponse({
      ok: false, code: "INTERNAL_ERROR", storageState: "DISCARDED",
    })).toEqual({ok: false, code: "UNAVAILABLE"});
  });

  it("rejects leaked reference reports, paths, causes, and stacks from public responses", () => {
    expect(AdminMediaMutationResponseSchema.safeParse({
      ok: false,
      code: "MEDIA_IN_USE",
      references: [{model: "Post", id: "post-1"}],
    }).success).toBe(false);
    expect(AdminMediaMutationResponseSchema.safeParse({
      ok: false,
      code: "UNAVAILABLE",
      path: "/srv/fuspi/shared/public/uploads/file.webp",
      cause: "Prisma P2002",
      stack: "technical stack",
    }).success).toBe(false);
    for (const code of ["SESSION_INVALID", "CSRF_INVALID", "REQUEST_INVALID", "UNAVAILABLE"]) {
      expect(AdminMediaMutationResponseSchema.safeParse({ok: false, code}).success).toBe(true);
    }
  });

  it("separates a generic public invariant response from the alert-only operational signal", () => {
    const disposition = adminMediaPersistenceInvariantDisposition();
    expect(disposition).toEqual({
      publicResponse: {ok: false, code: "UNAVAILABLE"},
      operationalAlert: {code: "MEDIA_PERSISTENCE_INVARIANT", severity: "CRITICAL"},
    });
    expect(AdminMediaPersistenceInvariantDispositionSchema.safeParse(disposition).success)
      .toBe(true);
    expect(AdminMediaMutationResponseSchema.safeParse({
      ...disposition.publicResponse,
      operationalAlert: disposition.operationalAlert,
    }).success).toBe(false);
  });
});
