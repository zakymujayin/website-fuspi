import {describe, expect, it, vi} from "vitest";

import {
  getFacilityDetail,
  listPublicFacilities,
  listPublicHomeFacilities,
  type FacilityDatabase,
} from "@/features/facility/domain";

const now = new Date("2026-08-17T00:00:00.000Z");
const actor = {userId: "admin-1", role: "ADMIN" as const, isActive: true as const, mustChangePassword: false, expiresAt: new Date("2026-08-17T01:00:00.000Z")};
const image = {
  id: "media-1",
  storageKey: `2026/08/${"a".repeat(64)}.webp`,
  storageClass: "PUBLIC",
  mimeType: "image/webp",
  size: 1024,
  alt: "Aula FUSPI",
  isDecorative: false,
  width: 1200,
  height: 800,
};

describe("facility domain", () => {
  it("returns editor input from facility detail", async () => {
    const database = {
      facility: {findUnique: vi.fn().mockResolvedValue({
        id: "facility-1",
        slug: "aula-fuspi",
        type: "AULA",
        isActive: true,
        order: 2,
        version: 3,
        coverMediaId: "media-1",
        contentOwnerId: null,
        governanceStatus: "CURRENT",
        lastReviewedAt: null,
        reviewDueAt: null,
        expiresAt: null,
        translations: [
          {locale: "id", status: "PUBLISHED", sourceVersion: 3, translatorId: "admin-1", reviewerId: "admin-1", reviewedAt: now, name: "Aula FUSPI", description: "Ruang kegiatan."},
          {locale: "en", status: "DRAFT", sourceVersion: 3, translatorId: "admin-1", reviewerId: null, reviewedAt: null, name: "FUSPI Hall", description: null},
        ],
        coverMedia: image,
      })},
    } as unknown as FacilityDatabase;

    const result = await getFacilityDetail(database, actor, {id: "facility-1"}, "/uploads", now);
    expect(result).toMatchObject({
      ok: true,
      data: {
        input: {slug: "aula-fuspi", translations: {id: {name: "Aula FUSPI"}, en: {name: "FUSPI Hall"}}},
        cover: {id: "media-1"},
      },
    });
  });

  it("resolves public facilities in the requested locale with Indonesian fallback", async () => {
    const database = {
      $transaction: vi.fn(async (queries) => Promise.all(queries)),
      facility: {
        findMany: vi.fn().mockResolvedValue([{
          id: "facility-1",
          slug: "aula-fuspi",
          type: "AULA",
          order: 1,
          translations: [
            {locale: "id", status: "PUBLISHED", name: "Aula FUSPI", description: null},
            {locale: "en", status: "PUBLISHED", name: "FUSPI Hall", description: "Event hall."},
          ],
          coverMedia: image,
        }]),
        count: vi.fn().mockResolvedValue(1),
      },
      album: {findUnique: vi.fn()},
    } as unknown as FacilityDatabase & {album: {findUnique: ReturnType<typeof vi.fn>}};

    const result = await listPublicFacilities(database, {page: 1, pageSize: 10, search: "", direction: "ASC", active: "ACTIVE"}, "/uploads", "en");
    expect(result).toMatchObject({ok: true, data: {items: [{translation: {resolvedLocale: "en", name: "FUSPI Hall"}}]}});
    expect(database.album.findUnique).not.toHaveBeenCalled();
  });

  it("maps homepage facilities from Facility rows, keeping items without a cover image", async () => {
    const database = {
      $transaction: vi.fn(async (queries) => Promise.all(queries)),
      facility: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "facility-1",
            slug: "aula-fuspi",
            type: "AULA",
            order: 1,
            translations: [{locale: "id", status: "PUBLISHED", name: "Aula FUSPI", description: null}],
            coverMedia: image,
          },
          {
            id: "facility-2",
            slug: "tanpa-gambar",
            type: "LAINNYA",
            order: 2,
            translations: [{locale: "id", status: "PUBLISHED", name: "Tanpa Gambar", description: null}],
            coverMedia: null,
          },
        ]),
        count: vi.fn().mockResolvedValue(2),
      },
    } as unknown as FacilityDatabase;

    await expect(listPublicHomeFacilities(database, "id", 4, "/uploads"))
      .resolves.toEqual([
        {id: "facility-1", slug: "aula-fuspi", image: expect.objectContaining({id: "media-1"}), caption: "Aula FUSPI", description: null},
        {id: "facility-2", slug: "tanpa-gambar", image: null, caption: "Tanpa Gambar", description: null},
      ]);
  });
});
