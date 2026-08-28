import {describe, expect, it} from "vitest";

import {
  MediaDeleteInputSchema,
  MediaListQuerySchema,
  MediaPersistenceResultSchema,
  MediaUploadIntentSchema,
  MediaValidatedRecordInputSchema,
  PublicMediaViewSchema,
  TrustedMediaActorScopeSchema,
} from "@/contracts/media";

const STORAGE_KEY = `2026/07/${"a".repeat(64)}.webp`;
const CHECKSUM = "b".repeat(64);
const IMAGE_RECORD = {
  policy: "CMS_IMAGE" as const,
  storageClass: "PUBLIC" as const,
  storageKey: STORAGE_KEY,
  originalName: "kegiatan-fuspi.png",
  mimeType: "image/webp" as const,
  size: 120_000,
  checksumSha256: CHECKSUM,
  width: 1_200,
  height: 800,
  alt: "Mahasiswa FUSPI mengikuti kegiatan akademik",
  isDecorative: false,
  focalX: null,
  focalY: null,
};

describe("M3 Media input contracts", () => {
  it("requires explicit and coherent image accessibility intent", () => {
    expect(MediaUploadIntentSchema.safeParse({
      policy: "CMS_IMAGE", alt: "Suasana seminar FUSPI", isDecorative: false,
    }).success).toBe(true);
    expect(MediaUploadIntentSchema.safeParse({
      policy: "CMS_IMAGE", alt: "", isDecorative: false,
    }).success).toBe(false);
    expect(MediaUploadIntentSchema.safeParse({
      policy: "CMS_IMAGE", alt: "Tidak boleh terisi", isDecorative: true,
    }).success).toBe(false);
    expect(MediaUploadIntentSchema.safeParse({
      policy: "PUBLIC_PDF", alt: "", isDecorative: false,
    }).success).toBe(true);
  });

  it("accepts validated public image metadata and rejects policy mismatches", () => {
    expect(MediaValidatedRecordInputSchema.safeParse(IMAGE_RECORD).success).toBe(true);
    expect(MediaValidatedRecordInputSchema.safeParse({
      ...IMAGE_RECORD, mimeType: "application/pdf", width: null, height: null,
    }).success).toBe(false);
    expect(MediaValidatedRecordInputSchema.safeParse({
      ...IMAGE_RECORD, storageKey: `2026/07/${"d".repeat(64)}.pdf`,
    }).success).toBe(false);
    expect(MediaValidatedRecordInputSchema.safeParse({...IMAGE_RECORD, size: 5_242_881}).success)
      .toBe(false);
    expect(MediaValidatedRecordInputSchema.safeParse({...IMAGE_RECORD, width: 1_601}).success)
      .toBe(false);
  });

  it("accepts bounded PDF metadata without image-only attributes", () => {
    const pdf = {
      ...IMAGE_RECORD,
      policy: "PUBLIC_PDF" as const,
      storageKey: `2026/07/${"c".repeat(64)}.pdf`,
      originalName: "pedoman-akademik.pdf",
      mimeType: "application/pdf" as const,
      size: 20_000_000,
      width: null,
      height: null,
      alt: "",
      isDecorative: false,
    };
    expect(MediaValidatedRecordInputSchema.safeParse(pdf).success).toBe(true);
    expect(MediaValidatedRecordInputSchema.safeParse({...pdf, width: 10}).success).toBe(false);
    expect(MediaValidatedRecordInputSchema.safeParse({...pdf, isDecorative: true}).success)
      .toBe(false);
  });

  it("rejects caller-controlled uploader, storage class, and unknown metadata", () => {
    expect(MediaValidatedRecordInputSchema.safeParse({...IMAGE_RECORD, uploaderId: "attacker"}).success)
      .toBe(false);
    expect(MediaValidatedRecordInputSchema.safeParse({...IMAGE_RECORD, storageClass: "PRIVATE"}).success)
      .toBe(false);
    expect(MediaUploadIntentSchema.safeParse({
      policy: "CMS_IMAGE",
      alt: "Deskripsi gambar",
      isDecorative: false,
      storageKey: STORAGE_KEY,
    }).success).toBe(false);
  });

  it("bounds list/delete identifiers without accepting an ownership override", () => {
    expect(MediaListQuerySchema.parse({})).toEqual({page: 1, pageSize: 24, kind: "ALL"});
    expect(MediaListQuerySchema.safeParse({page: 1, pageSize: 49}).success).toBe(false);
    expect(MediaListQuerySchema.safeParse({page: 1, uploaderId: "another-user"}).success)
      .toBe(false);
    expect(MediaDeleteInputSchema.safeParse({mediaId: "../private-file"}).success).toBe(false);
    expect(MediaDeleteInputSchema.safeParse({mediaId: "media-1", force: true}).success).toBe(false);
  });

  it("binds trusted actor scope to ADMIN-any and EDITOR-own", () => {
    expect(TrustedMediaActorScopeSchema.safeParse({
      role: "ADMIN", userId: "admin-1", ownership: "ANY",
    }).success).toBe(true);
    expect(TrustedMediaActorScopeSchema.safeParse({
      role: "EDITOR", userId: "editor-1", ownership: "OWN",
    }).success).toBe(true);
    expect(TrustedMediaActorScopeSchema.safeParse({
      role: "EDITOR", userId: "editor-1", ownership: "ANY",
    }).success).toBe(false);
  });
});

describe("M3 Media result contracts", () => {
  const publicImage = {
    id: "media-1",
    url: `https://fuspi.uinbanten.ac.id/uploads/${STORAGE_KEY}`,
    mimeType: "image/webp" as const,
    size: IMAGE_RECORD.size,
    alt: IMAGE_RECORD.alt,
    isDecorative: false,
    width: IMAGE_RECORD.width,
    height: IMAGE_RECORD.height,
    focalX: null,
    focalY: null,
  };
  const publicPdfKey = `2026/07/${"d".repeat(64)}.pdf`;

  it("allows safe public URLs but never private storage metadata", () => {
    expect(PublicMediaViewSchema.safeParse(publicImage).success).toBe(true);
    expect(PublicMediaViewSchema.safeParse({...publicImage, url: `/uploads/${STORAGE_KEY}`}).success)
      .toBe(true);
    for (const url of ["http://fuspi.invalid/a.webp", "//evil.invalid/a.webp", "ftp://evil/a"]) {
      expect(PublicMediaViewSchema.safeParse({...publicImage, url}).success).toBe(false);
    }
    expect(PublicMediaViewSchema.safeParse({...publicImage, url: "/uploads/../private/a.webp"}).success)
      .toBe(false);
    expect(PublicMediaViewSchema.safeParse({
      ...publicImage, storageKey: STORAGE_KEY, uploaderId: "editor-1",
    }).success).toBe(false);
  });

  it("models only committed success or cleaned-up failure", () => {
    expect(MediaPersistenceResultSchema.safeParse({
      ok: true, mediaId: "media-1", storageState: "COMMITTED",
    }).success).toBe(true);
    expect(MediaPersistenceResultSchema.safeParse({
      ok: false, code: "DATABASE_WRITE_FAILED", storageState: "DISCARDED",
    }).success).toBe(true);
    expect(MediaPersistenceResultSchema.safeParse({
      ok: false, code: "DATABASE_WRITE_FAILED", storageState: "ORPHANED",
    }).success).toBe(false);
    expect(MediaPersistenceResultSchema.safeParse({
      ok: false,
      code: "INTERNAL_ERROR",
      storageState: "DISCARDED",
      detail: "/srv/fuspi/shared/public/uploads/private-path",
    }).success).toBe(false);
  });

  it("requires coherent public PDF output", () => {
    expect(PublicMediaViewSchema.safeParse({
      id: "media-pdf",
      url: `/uploads/${publicPdfKey}`,
      mimeType: "application/pdf",
      size: 500_000,
      alt: "",
      isDecorative: false,
      width: null,
      height: null,
      focalX: null,
      focalY: null,
    }).success).toBe(true);
    expect(PublicMediaViewSchema.safeParse({
      ...publicImage, mimeType: "application/pdf", width: null, height: null,
    }).success).toBe(false);
  });
});
