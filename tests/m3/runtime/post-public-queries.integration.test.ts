import {createHash} from "node:crypto";
import {afterAll, beforeAll, describe, expect, it} from "vitest";

import {
  getPublicPostDetail,
  listPublicPosts,
} from "@/lib/content/post-public-queries";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M3 public Post queries on PostgreSQL", () => {
  const marker = `m3-public-${Date.now()}`;
  const now = new Date("2026-07-16T08:00:00.000Z");
  const clock = () => now;
  let prisma: ReturnType<typeof createPrismaClient>;
  let authorId: string;
  let categoryId: string;
  let tagId: string;
  let publicMediaId: string;
  let privateMediaId: string;

  function storageKey(seed: string) {
    return `2026/07/${createHash("sha256").update(`${marker}-${seed}`).digest("hex")}.webp`;
  }

  async function createPost(options: {
    suffix: string;
    type?: "BERITA" | "PENGUMUMAN";
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    publishedAt?: Date | null;
    locales?: Array<"id" | "en" | "ar">;
    coverMediaId?: string | null;
    category?: boolean;
    tag?: boolean;
    categoryId?: string;
    tagId?: string;
    titlePrefix?: string;
  }) {
    const locales = options.locales ?? ["id"];
    return prisma.post.create({
      data: {
        slug: `${marker}-${options.suffix}`,
        type: options.type ?? "BERITA",
        status: options.status ?? "PUBLISHED",
        publishedAt: options.publishedAt === undefined ? now : options.publishedAt,
        authorId,
        contentOwnerId: authorId,
        categoryId: options.category === false ? null : (options.categoryId ?? categoryId),
        coverMediaId: options.coverMediaId === undefined ? publicMediaId : options.coverMediaId,
        translations: {
          create: locales.map((locale) => ({
            locale,
            title: `${options.titlePrefix ?? options.suffix}-${locale}`,
            excerpt: null,
            content: `<p>${options.suffix}-${locale}</p>`,
            status: "PUBLISHED",
          })),
        },
        tags: options.tag === false
          ? undefined
          : {create: {tagId: options.tagId ?? tagId}},
      },
    });
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    authorId = (await prisma.user.create({
      data: {
        name: "M3 Public Author",
        email: `${marker}@example.test`,
        role: "EDITOR",
      },
    })).id;
    categoryId = (await prisma.category.create({
      data: {slug: `${marker}-category`},
    })).id;
    tagId = (await prisma.tag.create({
      data: {slug: `${marker}-tag`},
    })).id;
    publicMediaId = (await prisma.media.create({
      data: {
        storageKey: storageKey("public"),
        storageClass: "PUBLIC",
        checksumSha256: createHash("sha256").update("public").digest("hex"),
        originalName: `${marker}-public.webp`,
        mimeType: "image/webp",
        size: 1_024,
        alt: "Gambar publik FUSPI",
        width: 320,
        height: 240,
        uploaderId: authorId,
      },
    })).id;
    privateMediaId = (await prisma.media.create({
      data: {
        storageKey: storageKey("private"),
        storageClass: "PRIVATE",
        checksumSha256: createHash("sha256").update("private").digest("hex"),
        originalName: `${marker}-private.webp`,
        mimeType: "image/webp",
        size: 1_024,
        alt: "Gambar privat",
        width: 320,
        height: 240,
        uploaderId: authorId,
      },
    })).id;
  });

  afterAll(async () => {
    await prisma.post.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.media.deleteMany({where: {originalName: {startsWith: marker}}});
    await prisma.category.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.tag.deleteMany({where: {slug: {startsWith: marker}}});
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  it("shows only matching published Posts at or before the server clock", async () => {
    const visible = await createPost({suffix: "visible"});
    await createPost({
      suffix: "future",
      publishedAt: new Date(now.getTime() + 1),
    });
    await createPost({suffix: "draft", status: "DRAFT"});
    await createPost({suffix: "archived", status: "ARCHIVED"});
    await createPost({suffix: "announcement", type: "PENGUMUMAN"});

    const result = await listPublicPosts(
      prisma,
      {locale: "id", type: "BERITA", pageSize: 24},
      "https://fuspi.example/uploads",
      clock,
    );
    expect(result).toMatchObject({ok: true, data: {total: 1}});
    if (!result.ok) throw new Error("Expected public list.");
    expect(result.data.items.map(({id}) => id)).toEqual([visible.id]);

    const boundary = await getPublicPostDetail(
      prisma,
      {locale: "id", type: "BERITA", slug: visible.slug},
      "https://fuspi.example/uploads",
      clock,
    );
    expect(boundary).toMatchObject({ok: true, data: {publishedAt: now}});
  });

  it("resolves exact AR/EN content and deterministic Indonesian fallback", async () => {
    const multilingual = await createPost({
      suffix: "multilingual",
      locales: ["id", "en", "ar"],
      titlePrefix: "multi",
    });
    const fallbackOnly = await createPost({
      suffix: "fallback",
      locales: ["id"],
      titlePrefix: "fallback",
    });
    const withoutIndonesian = await createPost({
      suffix: "without-id",
      locales: ["en"],
      titlePrefix: "no-id",
    });

    const arabic = await getPublicPostDetail(
      prisma,
      {locale: "ar", type: "BERITA", slug: multilingual.slug},
      "/uploads",
      clock,
    );
    expect(arabic).toMatchObject({
      ok: true,
      data: {
        translation: {
          requestedLocale: "ar",
          resolvedLocale: "ar",
          isFallback: false,
          value: {title: "multi-ar"},
        },
      },
    });
    const fallback = await getPublicPostDetail(
      prisma,
      {locale: "en", type: "BERITA", slug: fallbackOnly.slug},
      "/uploads",
      clock,
    );
    expect(fallback).toMatchObject({
      ok: true,
      data: {
        translation: {
          requestedLocale: "en",
          resolvedLocale: "id",
          isFallback: true,
          value: {title: "fallback-id"},
        },
      },
    });
    await expect(getPublicPostDetail(
      prisma,
      {locale: "id", type: "BERITA", slug: withoutIndonesian.slug},
      "/uploads",
      clock,
    )).resolves.toEqual({ok: false, code: "NOT_FOUND"});
    await expect(getPublicPostDetail(
      prisma,
      {locale: "en", type: "BERITA", slug: withoutIndonesian.slug},
      "/uploads",
      clock,
    )).resolves.toEqual({ok: false, code: "NOT_FOUND"});
  });

  it("filters category/tag without duplicates and paginates with stable ordering", async () => {
    const publishedAt = new Date(now.getTime() - 60_000);
    const pageCategory = await prisma.category.create({
      data: {slug: `${marker}-page-category`},
    });
    const pageTag = await prisma.tag.create({
      data: {slug: `${marker}-page-tag`},
    });
    const matching = await Promise.all([
      createPost({
        suffix: "page-a",
        publishedAt,
        categoryId: pageCategory.id,
        tagId: pageTag.id,
      }),
      createPost({
        suffix: "page-b",
        publishedAt,
        categoryId: pageCategory.id,
        tagId: pageTag.id,
      }),
      createPost({
        suffix: "page-c",
        publishedAt,
        categoryId: pageCategory.id,
        tagId: pageTag.id,
      }),
    ]);
    await createPost({
      suffix: "no-tag",
      tag: false,
      publishedAt,
      categoryId: pageCategory.id,
    });
    await createPost({
      suffix: "no-category",
      category: false,
      publishedAt,
      tagId: pageTag.id,
    });
    const ordered = matching.map(({id}) => id).sort();

    const first = await listPublicPosts(
      prisma,
      {
        locale: "id",
        type: "BERITA",
        categorySlug: pageCategory.slug,
        tagSlug: pageTag.slug,
        page: 1,
        pageSize: 2,
      },
      "/uploads",
      clock,
    );
    expect(first).toMatchObject({
      ok: true,
      data: {total: 3, page: 1, pageSize: 2, hasNextPage: true},
    });
    if (!first.ok) throw new Error("Expected first page.");
    expect(first.data.items.map(({id}) => id)).toEqual(ordered.slice(0, 2));
    expect(new Set(first.data.items.map(({id}) => id)).size).toBe(2);

    const second = await listPublicPosts(
      prisma,
      {
        locale: "id",
        type: "BERITA",
        categorySlug: pageCategory.slug,
        tagSlug: pageTag.slug,
        page: 2,
        pageSize: 2,
      },
      "/uploads",
      clock,
    );
    expect(second).toMatchObject({
      ok: true,
      data: {total: 3, page: 2, pageSize: 2, hasNextPage: false},
    });
    if (!second.ok) throw new Error("Expected second page.");
    expect(second.data.items.map(({id}) => id)).toEqual(ordered.slice(2));
  });

  it("builds canonical public cover URLs and hides private cover metadata", async () => {
    const publicPost = await createPost({suffix: "public-cover"});
    const privatePost = await createPost({
      suffix: "private-cover",
      coverMediaId: privateMediaId,
    });
    const publicResult = await getPublicPostDetail(
      prisma,
      {locale: "id", type: "BERITA", slug: publicPost.slug},
      "https://cdn.fuspi.example/uploads/",
      clock,
    );
    expect(publicResult).toMatchObject({
      ok: true,
      data: {
        cover: {
          url: `https://cdn.fuspi.example/uploads/${storageKey("public")}`,
        },
      },
    });
    const privateResult = await getPublicPostDetail(
      prisma,
      {locale: "id", type: "BERITA", slug: privatePost.slug},
      "https://cdn.fuspi.example/uploads",
      clock,
    );
    expect(privateResult).toMatchObject({ok: true, data: {cover: null}});
    expect(JSON.stringify(privateResult)).not.toMatch(
      /"storageKey"|"storageClass"|"checksumSha256"|"originalName"|"uploaderId"/i,
    );
  });

  it("makes missing, future, wrong-type, wrong-slug, and unusable-locale details indistinguishable", async () => {
    const future = await createPost({
      suffix: "hidden-future",
      publishedAt: new Date(now.getTime() + 60_000),
    });
    const noId = await createPost({
      suffix: "hidden-no-id",
      locales: ["en"],
    });
    const queries = [
      {locale: "id", type: "BERITA", slug: `${marker}-missing`},
      {locale: "id", type: "BERITA", slug: future.slug},
      {locale: "id", type: "PENGUMUMAN", slug: future.slug},
      {locale: "id", type: "BERITA", slug: noId.slug},
    ] as const;
    for (const query of queries) {
      await expect(getPublicPostDetail(
        prisma,
        query,
        "/uploads",
        clock,
      )).resolves.toEqual({ok: false, code: "NOT_FOUND"});
    }
  });
});
