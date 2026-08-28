import {describe, expect, it} from "vitest";

import {
  FacilityAdminDetailSchema,
  FacilityInputSchema,
  PublicFacilityListResultSchema,
} from "@/contracts/facility";

const media = {
  id: "media-1",
  url: "/uploads/2026/08/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp",
  mimeType: "image/webp",
  size: 1024,
  alt: "Aula",
  isDecorative: false,
  width: 1200,
  height: 800,
  focalX: null,
  focalY: null,
};

describe("facility contracts", () => {
  it("accepts the admin detail shape needed by the editor", () => {
    const input = FacilityInputSchema.parse({
      slug: "aula-fuspi",
      type: "AULA",
      isActive: true,
      order: 1,
      coverMediaId: "media-1",
      contentOwnerId: null,
      translations: {id: {name: "Aula FUSPI", description: "Ruang kegiatan."}},
    });

    expect(FacilityAdminDetailSchema.parse({
      id: "facility-1",
      slug: "aula-fuspi",
      type: "AULA",
      isActive: true,
      order: 1,
      version: 2,
      translations: [{locale: "id", status: "PUBLISHED", sourceVersion: 2, translatorId: "admin-1", reviewerId: "admin-1", reviewedAt: "2026-08-17T00:00:00.000Z"}],
      governance: {status: "CURRENT", contentOwnerId: null, lastReviewedAt: null, reviewDueAt: null, expiresAt: null},
      assets: [{kind: "MEDIA", media}],
      input,
      cover: media,
    })).toMatchObject({input: {translations: {id: {name: "Aula FUSPI"}}}, cover: {id: "media-1"}});
  });

  it("rejects internal database fields in public facility results", () => {
    expect(PublicFacilityListResultSchema.safeParse({
      items: [{
        id: "facility-1",
        slug: "aula-fuspi",
        type: "AULA",
        order: 1,
        cover: media,
        contentOwnerId: "owner-1",
        translation: {requestedLocale: "id", resolvedLocale: "id", isFallback: false, name: "Aula", description: null},
      }],
      page: {page: 1, pageSize: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false},
    }).success).toBe(false);
  });
});
