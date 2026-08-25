import {describe, expect, it, vi} from "vitest";

import type {PublicPostQueryDatabase} from "@/lib/content/post-public-queries";
import {
  getPublicPostDetail,
  listPublicPosts,
} from "@/lib/content/post-public-queries";

const NOW = new Date("2026-07-16T08:00:00.000Z");
const clock = () => NOW;
const STORAGE_KEY = `2026/07/${"a".repeat(64)}.webp`;

function translation(locale: "id" | "en" | "ar", title: string) {
  return {
    locale,
    title,
    excerpt: null,
    content: `<p>${title}</p>`,
    metaTitle: null,
    metaDesc: null,
    coverCaption: null,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    type: "BERITA",
    columnType: null,
    slug: "berita-fuspi",
    isFeatured: false,
    publishedAt: NOW,
    author: {name: "Editor FUSPI"},
    category: {slug: "akademik"},
    coverMedia: {
      id: "media-1",
      storageKey: STORAGE_KEY,
      storageClass: "PUBLIC",
      mimeType: "image/webp",
      size: 1_024,
      alt: "Dokumentasi FUSPI",
      isDecorative: false,
      width: 320,
      height: 240,
    },
    images: [],
    translations: [translation("id", "Berita Indonesia")],
    ...overrides,
  };
}

function database(options: {
  rows?: unknown[];
  total?: number;
  detail?: unknown;
  failure?: Error;
} = {}) {
  const findMany = options.failure
    ? vi.fn().mockRejectedValue(options.failure)
    : vi.fn().mockResolvedValue(options.rows ?? [row()]);
  const count = vi.fn().mockResolvedValue(options.total ?? (options.rows?.length ?? 1));
  const findFirst = options.failure
    ? vi.fn().mockRejectedValue(options.failure)
    : vi.fn().mockResolvedValue(options.detail === undefined ? row() : options.detail);
  const client = {
    post: {findMany, count, findFirst},
    $transaction: vi.fn(async (promises: Array<Promise<unknown>>) => Promise.all(promises)),
  } as unknown as PublicPostQueryDatabase;
  return {client, findMany, count, findFirst};
}

describe("M3 public Post query boundary", () => {
  it("rejects publication, preview, fallback, and upload-origin injection before database access", async () => {
    const {client, findMany, findFirst} = database();
    for (const injected of [
      {status: "DRAFT"},
      {publishedBefore: "2099-01-01T00:00:00Z"},
      {preview: true},
      {fallbackLocale: "en"},
      {uploadOrigin: "https://evil.example/uploads"},
    ]) {
      await expect(listPublicPosts(client, {
        locale: "id",
        type: "BERITA",
        ...injected,
      }, "https://fuspi.example/uploads", clock)).resolves.toEqual({
        ok: false,
        code: "INVALID_QUERY",
      });
    }
    await expect(getPublicPostDetail(client, {
      locale: "id",
      type: "BERITA",
      slug: "berita-fuspi",
      preview: true,
    }, "https://fuspi.example/uploads", clock)).resolves.toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
    expect(findMany).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("uses server visibility, filters, bounded pagination, and stable ordering", async () => {
    const {client, findMany, count} = database({total: 13});
    const result = await listPublicPosts(client, {
      locale: "id",
      type: "BERITA",
      categorySlug: "akademik",
      tagSlug: "tafsir",
      page: 2,
      pageSize: 12,
    }, "https://fuspi.example/uploads", clock);

    expect(result).toMatchObject({
      ok: true,
      data: {page: 2, pageSize: 12, total: 13, hasNextPage: false},
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        type: "BERITA",
        status: "PUBLISHED",
        publishedAt: {not: null, lte: NOW},
        translations: {
          some: {
            locale: "id",
            status: "PUBLISHED",
          },
        },
        category: {is: {slug: "akademik"}},
        tags: {some: {tag: {slug: "tafsir"}}},
      }),
      orderBy: [{publishedAt: "desc"}, {id: "asc"}],
      skip: 12,
      take: 12,
    }));
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({status: "PUBLISHED"}),
    });
  });

  it("resolves exact locale first and falls back only to Indonesian", async () => {
    const exactDatabase = database({
      detail: row({
        translations: [
          translation("id", "Indonesia"),
          translation("ar", "العربية"),
        ],
      }),
    });
    const exact = await getPublicPostDetail(
      exactDatabase.client,
      {locale: "ar", type: "BERITA", slug: "berita-fuspi"},
      "https://fuspi.example/uploads",
      clock,
    );
    expect(exact).toMatchObject({
      ok: true,
      data: {
        translation: {
          requestedLocale: "ar",
          resolvedLocale: "ar",
          isFallback: false,
          value: {title: "العربية"},
        },
      },
    });

    const fallbackDatabase = database({
      detail: row({translations: [translation("id", "Indonesia")]}),
    });
    const fallback = await getPublicPostDetail(
      fallbackDatabase.client,
      {locale: "en", type: "BERITA", slug: "berita-fuspi"},
      "https://fuspi.example/uploads",
      clock,
    );
    expect(fallback).toMatchObject({
      ok: true,
      data: {
        translation: {
          requestedLocale: "en",
          resolvedLocale: "id",
          isFallback: true,
        },
      },
    });
    const noIndonesian = database({
      detail: row({translations: [translation("en", "English")]}),
    });
    await expect(getPublicPostDetail(
      noIndonesian.client,
      {locale: "id", type: "BERITA", slug: "berita-fuspi"},
      "https://fuspi.example/uploads",
      clock,
    )).resolves.toEqual({ok: false, code: "NOT_FOUND"});
  });

  it("constructs canonical cover URLs and fails closed for private or corrupt cover metadata", async () => {
    const canonical = await getPublicPostDetail(
      database().client,
      {locale: "id", type: "BERITA", slug: "berita-fuspi"},
      "https://cdn.fuspi.example/uploads/",
      clock,
    );
    expect(canonical).toMatchObject({
      ok: true,
      data: {cover: {url: `https://cdn.fuspi.example/uploads/${STORAGE_KEY}`}},
    });

    for (const coverMedia of [
      {...row().coverMedia, storageClass: "PRIVATE"},
      {...row().coverMedia, mimeType: "application/pdf"},
      {...row().coverMedia, storageKey: "../../../secret.webp"},
      {...row().coverMedia, alt: null},
    ]) {
      const result = await getPublicPostDetail(
        database({detail: row({coverMedia})}).client,
        {locale: "id", type: "BERITA", slug: "berita-fuspi"},
        "https://cdn.fuspi.example/uploads",
        clock,
      );
      expect(result).toMatchObject({ok: true, data: {cover: null}});
      expect(JSON.stringify(result)).not.toMatch(/storageKey|PRIVATE|secret/i);
    }
  });

  it("projects only frozen public fields", async () => {
    const result = await getPublicPostDetail(
      database({
        detail: row({
          authorId: "private-author",
          contentOwnerId: "private-owner",
          version: 99,
          governanceStatus: "CURRENT",
        }),
      }).client,
      {locale: "id", type: "BERITA", slug: "berita-fuspi"},
      "/uploads",
      clock,
    );
    expect(result).toMatchObject({
      ok: true,
      data: {
        authorName: "Editor FUSPI",
        cover: {url: `/uploads/${STORAGE_KEY}`},
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /authorId|contentOwnerId|uploaderId|checksum|originalName|storageClass|version|governance/i,
    );
  });

  it("returns non-technical failures for corrupt rows and database errors", async () => {
    await expect(listPublicPosts(
      database({rows: [row({publishedAt: null})]}).client,
      {locale: "id", type: "BERITA"},
      "https://fuspi.example/uploads",
      clock,
    )).resolves.toEqual({ok: false, code: "QUERY_UNAVAILABLE"});
    const failed = database({
      failure: new Error("Prisma SQL failed at postgresql://secret /srv/fuspi"),
    });
    const listResult = await listPublicPosts(
      failed.client,
      {locale: "id", type: "BERITA"},
      "https://fuspi.example/uploads",
      clock,
    );
    const detailResult = await getPublicPostDetail(
      failed.client,
      {locale: "id", type: "BERITA", slug: "berita-fuspi"},
      "https://fuspi.example/uploads",
      clock,
    );
    expect(listResult).toEqual({ok: false, code: "QUERY_UNAVAILABLE"});
    expect(detailResult).toEqual({ok: false, code: "NOT_FOUND"});
    expect(JSON.stringify([listResult, detailResult])).not.toMatch(
      /Prisma|SQL|postgresql|secret|srv/i,
    );
  });
});
