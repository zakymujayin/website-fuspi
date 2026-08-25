import {describe, expect, it, vi} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  adminMediaHttpStatus,
  executeAdminMediaCommand,
  executeAdminMediaUpload,
  listAdminMedia,
  normalizeAdminMediaSearchParams,
  type AdminMediaTransportDatabase,
} from "@/lib/content/media-admin-transport";
import type {StorageRoots} from "@/lib/storage";

const NOW = new Date("2026-07-22T01:00:00.000Z");
const KEY = `2026/07/${"a".repeat(64)}.webp`;
const ROOTS = {
  PUBLIC: "/tmp/fuspi-media-admin-public",
  PRIVATE: "/tmp/fuspi-media-admin-private",
  PPKS_PRIVATE: "/tmp/fuspi-media-admin-ppks",
} as StorageRoots;

function session(role: ActiveDatabaseSession["role"] = "EDITOR"): ActiveDatabaseSession {
  return {
    userId: "editor-1",
    role,
    isActive: true,
    mustChangePassword: false,
    expiresAt: new Date("2026-07-22T09:00:00.000Z"),
  };
}

describe("M3 Media admin transport runtime", () => {
  it("rejects repeated, unknown, and ownership query selectors", () => {
    expect(normalizeAdminMediaSearchParams(new URLSearchParams("page=1&page=2"))).toEqual({
      ok: false,
      code: "REQUEST_INVALID",
    });
    expect(normalizeAdminMediaSearchParams(new URLSearchParams("uploaderId=attacker"))).toEqual({
      ok: false,
      code: "REQUEST_INVALID",
    });
    expect(normalizeAdminMediaSearchParams(new URLSearchParams("page=2&pageSize=12&kind=IMAGE")))
      .toEqual({ok: true, data: {page: 2, pageSize: 12, kind: "IMAGE"}});
  });

  it("fails closed for missing, forbidden, expired, and password-change sessions", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as AdminMediaTransportDatabase;
    for (const actor of [
      null,
      session("PETUGAS"),
      {...session(), expiresAt: NOW},
      {...session(), mustChangePassword: true},
    ]) {
      await expect(listAdminMedia(
        database,
        actor,
        {page: 1, pageSize: 24, kind: "ALL"},
        "/uploads",
        () => NOW,
      )).resolves.toEqual({ok: false, code: "SESSION_INVALID"});
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("applies public IMAGE and EDITOR ownership predicates in the database", async () => {
    const findMany = vi.fn().mockResolvedValue([{
      id: "media-1",
      storageKey: KEY,
      originalName: "kegiatan-fuspi.png",
      mimeType: "image/webp",
      size: 12_000,
      alt: "Kegiatan FUSPI",
      isDecorative: false,
      width: 640,
      height: 480,
      createdAt: NOW,
      uploader: {name: "Editor FUSPI"},
    }]);
    const count = vi.fn().mockResolvedValue(1);
    const database = {
      media: {findMany, count},
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    } as unknown as AdminMediaTransportDatabase;

    const result = await listAdminMedia(
      database,
      session(),
      {page: 1, pageSize: 24, kind: "IMAGE"},
      "/uploads",
      () => NOW,
    );
    expect(result).toMatchObject({
      ok: true,
      data: {total: 1, items: [{id: "media-1", url: `/uploads/${KEY}`}]},
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {storageClass: "PUBLIC", uploaderId: "editor-1", mimeType: "image/webp"},
    }));
  });

  it("keeps listing valid media when a legacy row has invalid public metadata", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "legacy-pdf",
        storageKey: "documents/old.pdf",
        originalName: "old.pdf",
        mimeType: "application/pdf",
        size: 12_000,
        alt: "Legacy PDF",
        isDecorative: false,
        width: null,
        height: null,
        createdAt: NOW,
        uploader: {name: "Editor FUSPI"},
      },
      {
        id: "media-1",
        storageKey: KEY,
        originalName: "kegiatan-fuspi.webp",
        mimeType: "image/webp",
        size: 12_000,
        alt: "Kegiatan FUSPI",
        isDecorative: false,
        width: 640,
        height: 480,
        createdAt: NOW,
        uploader: {name: "Editor FUSPI"},
      },
    ]);
    const count = vi.fn().mockResolvedValue(2);
    const database = {
      media: {findMany, count},
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    } as unknown as AdminMediaTransportDatabase;

    await expect(listAdminMedia(
      database,
      session(),
      {page: 1, pageSize: 24, kind: "ALL"},
      "/uploads",
      () => NOW,
    )).resolves.toMatchObject({
      ok: true,
      data: {items: [{id: "media-1"}], total: 2},
    });
  });

  it("updates only an owned public image with strict accessibility metadata", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "media-1",
      uploaderId: "editor-1",
      storageKey: KEY,
      mimeType: "image/webp",
      _count: {},
    });
    const updateMany = vi.fn().mockResolvedValue({count: 1});
    const database = {
      $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
        media: {findFirst, updateMany},
      })),
    } as unknown as AdminMediaTransportDatabase;
    await expect(executeAdminMediaCommand(database, session(), {
      action: "UPDATE_METADATA",
      payload: {mediaId: "media-1", alt: "", isDecorative: true},
    }, ROOTS, () => NOW)).resolves.toEqual({ok: true, mediaId: "media-1"});
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "media-1",
        storageClass: "PUBLIC",
        mimeType: "image/webp",
        uploaderId: "editor-1",
      },
      data: {alt: "", isDecorative: true},
    });
  });

  it("returns only MEDIA_IN_USE when any direct Media relation exists", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "media-1",
      uploaderId: "editor-1",
      storageKey: KEY,
      mimeType: "image/webp",
      _count: {postCovers: 1},
    });
    const database = {
      $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
        media: {findFirst},
      })),
    } as unknown as AdminMediaTransportDatabase;
    await expect(executeAdminMediaCommand(database, session(), {
      action: "DELETE",
      payload: {mediaId: "media-1"},
    }, ROOTS, () => NOW)).resolves.toEqual({ok: false, code: "MEDIA_IN_USE"});
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        _count: {select: expect.objectContaining({
          postCovers: true,
          pageHeroes: true,
          lecturerPhotos: true,
          staffPhotos: true,
          programLogos: true,
          partnershipLogos: true,
          albumCovers: true,
          albumPhotos: true,
          sliderImages: true,
          sectionBackgrounds: true,
          testimonialPhotos: true,
          activityImages: true,
          deanPhotos: true,
        })},
      }),
    }));
  });

  it("rejects injected upload/command identity before database or filesystem work", async () => {
    const transaction = vi.fn();
    const database = {$transaction: transaction} as unknown as AdminMediaTransportDatabase;
    await expect(executeAdminMediaCommand(database, session(), {
      action: "DELETE",
      payload: {mediaId: "media-1", force: true},
    }, ROOTS, () => NOW)).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    await expect(executeAdminMediaUpload(database, session(), {
      policy: "CMS_IMAGE",
      uploadCount: 1,
      intents: [{policy: "CMS_IMAGE", alt: "Kegiatan", isDecorative: false}],
      uploaderId: "attacker",
    }, [], ROOTS, () => NOW)).resolves.toEqual({ok: false, code: "REQUEST_INVALID"});
    expect(transaction).not.toHaveBeenCalled();
  });

  it("maps only stable public HTTP statuses", () => {
    expect(adminMediaHttpStatus({ok: false, code: "SESSION_INVALID"})).toBe(401);
    expect(adminMediaHttpStatus({ok: false, code: "CSRF_INVALID"})).toBe(403);
    expect(adminMediaHttpStatus({ok: false, code: "NOT_FOUND"})).toBe(404);
    expect(adminMediaHttpStatus({ok: false, code: "MEDIA_IN_USE"})).toBe(409);
    expect(adminMediaHttpStatus({ok: false, code: "UPLOAD_FAILED"})).toBe(422);
    expect(adminMediaHttpStatus({ok: false, code: "UNAVAILABLE"})).toBe(503);
  });
});
