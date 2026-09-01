import {describe, expect, it} from "vitest";

import {
  LecturerPortalCommandSchema,
  LecturerPortalMediaUploadResponseSchema,
  LecturerProfileInputSchema,
  TrustedLecturerActorSchema,
} from "@/contracts/lecturer-portal";
import {
  resolveActiveLoginSessionDestination,
  resolvePostLoginDestination,
} from "@/lib/auth/runtime/redirect";

const FUTURE = new Date("2027-01-01T00:00:00.000Z");

function actor(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-dosen-a",
    role: "DOSEN",
    isActive: true,
    mustChangePassword: false,
    expiresAt: FUTURE,
    ...overrides,
  };
}

const VALID_PROFILE = {
  position: "Dosen Ulumul Hadis",
  expertise: null,
  bio: null,
  quote: null,
  officeHours: null,
  officeLocation: null,
  phone: null,
  googleScholarUrl: null,
  sintaUrl: null,
  scopusUrl: null,
  linkedinUrl: null,
  instagramUrl: null,
  twitterUrl: null,
  photoMediaId: null,
  cvMediaId: null,
};

describe("trusted lecturer actor", () => {
  it("accepts an active DOSEN that has already rotated its password", () => {
    expect(TrustedLecturerActorSchema.safeParse(actor()).success).toBe(true);
  });

  it("rejects every other role", () => {
    for (const role of ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"] as const) {
      expect(TrustedLecturerActorSchema.safeParse(actor({role})).success).toBe(false);
    }
  });

  it("rejects a lecturer that still owes a password change", () => {
    expect(TrustedLecturerActorSchema.safeParse(actor({mustChangePassword: true})).success).toBe(false);
  });

  it("rejects an inactive account and unknown extra fields", () => {
    expect(TrustedLecturerActorSchema.safeParse(actor({isActive: false})).success).toBe(false);
    expect(TrustedLecturerActorSchema.safeParse(actor({lecturerId: "smuggled"})).success).toBe(false);
  });
});

describe("lecturer portal input validation", () => {
  it("turns blank optional text into null rather than an empty string", () => {
    const parsed = LecturerProfileInputSchema.parse({...VALID_PROFILE, expertise: "  "});
    expect(parsed.expertise).toBeNull();
  });

  it("rejects a non-https link", () => {
    for (const url of ["http://example.test", "javascript:alert(1)", "//example.test"]) {
      expect(LecturerProfileInputSchema.safeParse({...VALID_PROFILE, sintaUrl: url}).success).toBe(false);
    }
  });

  it("keeps paragraphs in the biography but rejects other control characters", () => {
    expect(LecturerProfileInputSchema.safeParse({...VALID_PROFILE, bio: "Baris satu\nBaris dua"}).success).toBe(true);
    expect(LecturerProfileInputSchema.safeParse({...VALID_PROFILE, bio: "Rusak\u0007"}).success).toBe(false);
  });

  it("rejects a single-line field that carries a newline", () => {
    expect(LecturerProfileInputSchema.safeParse({...VALID_PROFILE, position: "a\nb"}).success).toBe(false);
  });

  it("bounds the academic year", () => {
    const base = {action: "EDUCATION_CREATE", payload: {degree: "Dr.", field: null, institution: "UIN", city: null}};
    expect(LecturerPortalCommandSchema.safeParse({...base, payload: {...base.payload, year: 2019}}).success).toBe(true);
    expect(LecturerPortalCommandSchema.safeParse({...base, payload: {...base.payload, year: 1200}}).success).toBe(false);
    expect(LecturerPortalCommandSchema.safeParse({...base, payload: {...base.payload, year: 2.5}}).success).toBe(false);
  });

  it("requires degree and institution", () => {
    const payload = {degree: "", field: null, institution: "", city: null, year: null};
    expect(LecturerPortalCommandSchema.safeParse({action: "EDUCATION_CREATE", payload}).success).toBe(false);
  });

  it("refuses a command carrying an unknown action or extra keys", () => {
    expect(LecturerPortalCommandSchema.safeParse({action: "PROFILE_DELETE"}).success).toBe(false);
    expect(
      LecturerPortalCommandSchema.safeParse({
        action: "PROFILE_UPDATE",
        payload: VALID_PROFILE,
        lecturerId: "someone-else",
      }).success,
    ).toBe(false);
  });
});

describe("lecturer portal media upload contract", () => {
  it("accepts the fixed success shape returned by the portal upload endpoint", () => {
    expect(LecturerPortalMediaUploadResponseSchema.safeParse({
      ok: true,
      kind: "PHOTO",
      mediaId: "media-dosen-1",
      url: "/uploads/2026/01/profile.webp",
      originalName: "profile.webp",
      mimeType: "image/webp",
    }).success).toBe(true);
    expect(LecturerPortalMediaUploadResponseSchema.safeParse({
      ok: true,
      kind: "CV",
      mediaId: "media-dosen-2",
      url: "/uploads/2026/01/cv.pdf",
      originalName: "cv.pdf",
      mimeType: "application/pdf",
    }).success).toBe(true);
  });

  it("rejects extra data and unsupported upload kinds", () => {
    expect(LecturerPortalMediaUploadResponseSchema.safeParse({
      ok: true,
      kind: "AVATAR",
      mediaId: "media-dosen-1",
      url: "/uploads/2026/01/profile.webp",
      originalName: "profile.webp",
      mimeType: "image/webp",
    }).success).toBe(false);
    expect(LecturerPortalMediaUploadResponseSchema.safeParse({
      ok: false,
      code: "VALIDATION_FAILED",
      debug: "bad mime",
    }).success).toBe(false);
  });
});

describe("post-login destination", () => {
  it("sends a lecturer to the portal instead of the CMS", () => {
    expect(resolvePostLoginDestination("DOSEN", null, "id")).toBe("/id/portal-dosen");
    expect(resolvePostLoginDestination("DOSEN", "/id/admin", "id")).toBe("/id/portal-dosen");
    expect(resolvePostLoginDestination("DOSEN", "/id/admin/posts", "id")).toBe("/id/portal-dosen");
  });

  it("keeps active lecturer sessions on the portal path, including password rotation", () => {
    expect(resolveActiveLoginSessionDestination(
      {role: "DOSEN", mustChangePassword: false},
      null,
      "id",
    )).toBe("/id/portal-dosen");
    expect(resolveActiveLoginSessionDestination(
      {role: "DOSEN", mustChangePassword: true},
      null,
      "id",
    )).toBe("/id/change-password?next=%2Fid%2Fportal-dosen");
    expect(resolveActiveLoginSessionDestination(
      {role: "DOSEN", mustChangePassword: true},
      "/id/admin/posts",
      "id",
    )).toBe("/id/change-password?next=%2Fid%2Fportal-dosen");
  });

  it("leaves every other role on its existing destination", () => {
    for (const role of ["ADMIN", "EDITOR", "PETUGAS", "SATGAS_PPKS"] as const) {
      expect(resolvePostLoginDestination(role, "/id/admin/posts", "id")).toBe("/id/admin/posts");
      expect(resolvePostLoginDestination(role, null, "id")).toBe("/id/admin");
    }
  });

  it("sends booking-only institutional roles to the borrowing queue", () => {
    for (const role of ["STAF_UMUM", "DEKAN", "WADEK", "KABAG"] as const) {
      expect(resolvePostLoginDestination(role, "/id/admin/posts", "id")).toBe("/id/admin/peminjaman");
      expect(resolvePostLoginDestination(role, null, "id")).toBe("/id/admin/peminjaman");
    }
  });

  it("still refuses an off-site redirect for a lecturer", () => {
    expect(resolvePostLoginDestination("DOSEN", "https://evil.test/steal", "id")).toBe("/id/portal-dosen");
    expect(resolvePostLoginDestination("DOSEN", "//evil.test", "id")).toBe("/id/portal-dosen");
  });

  it("keeps the lecturer's own locale", () => {
    expect(resolvePostLoginDestination("DOSEN", null, "ar")).toBe("/ar/portal-dosen");
  });
});
