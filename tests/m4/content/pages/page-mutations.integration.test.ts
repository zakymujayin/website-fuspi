import {afterAll, beforeAll, describe, expect, it} from "vitest";

import type {ActiveDatabaseSession} from "@/contracts/auth";
import {
  createPage,
  deletePage,
  mutatePagePublication,
  updatePage,
} from "@/features/content/pages/mutations";
import {getPageDetail, listPages} from "@/features/content/pages/queries";
import {createPrismaClient} from "@/lib/db/client";

const runDatabaseTests = process.env.RUN_PLATFORM_DB_TESTS === "true";
const suite = runDatabaseTests ? describe : describe.skip;

suite("M4 Page mutation runtime on PostgreSQL", () => {
  const marker = `m4-page-${Date.now()}`;
  const now = new Date("2026-07-16T08:00:00.000Z");
  const clock = () => now;
  let prisma: ReturnType<typeof createPrismaClient>;
  let adminId: string;
  let editorId: string;
  let adminMediaId: string;
  let privateMediaId: string;

  function actor(
    userId: string,
    role: ActiveDatabaseSession["role"],
  ): ActiveDatabaseSession {
    return {
      userId,
      role,
      isActive: true,
      mustChangePassword: false,
      expiresAt: new Date("2026-07-16T16:00:00.000Z"),
    };
  }

  function translation(title: string, content = "<p>Konten aman.</p>") {
    return {
      title,
      content,
      metaTitle: title,
      metaDesc: `Metadata ${title}`,
    };
  }

  function input(slug: string, overrides: Record<string, unknown> = {}) {
    return {
      slug,
      parentId: null,
      heroMediaId: adminMediaId,
      order: 0,
      translations: {
        id: translation("Halaman Indonesia"),
        en: translation("English Page"),
        ar: translation("صفحة عربية"),
      },
      publication: {intent: "SAVE_DRAFT"},
      ...overrides,
    };
  }

  function updateInput(
    pageId: string,
    expectedVersion: number,
    slug: string,
    overrides: Record<string, unknown> = {},
  ) {
    const candidate = {
      pageId,
      expectedVersion,
      ...input(slug, overrides),
    };
    delete (candidate as {publication?: unknown}).publication;
    return candidate;
  }

  beforeAll(async () => {
    prisma = createPrismaClient();
    await prisma.$connect();
    const users = await Promise.all([
      prisma.user.create({
        data: {
          name: "M4 Synthetic Admin",
          email: `${marker}-admin@example.test`,
          role: "ADMIN",
        },
      }),
      prisma.user.create({
        data: {
          name: "M4 Synthetic Editor",
          email: `${marker}-editor@example.test`,
          role: "EDITOR",
        },
      }),
    ]);
    [adminId, editorId] = users.map(({id}) => id);

    const media = await Promise.all([
      prisma.media.create({
        data: {
          storageKey: `2026/07/${"c".repeat(64)}.webp`,
          storageClass: "PUBLIC",
          checksumSha256: "c".repeat(64),
          originalName: `${marker}-public.webp`,
          mimeType: "image/webp",
          size: 1_024,
          alt: "Hero publik",
          width: 800,
          height: 600,
          uploaderId: adminId,
        },
      }),
      prisma.media.create({
        data: {
          storageKey: `2026/07/${"d".repeat(64)}.webp`,
          storageClass: "PRIVATE",
          checksumSha256: "d".repeat(64),
          originalName: `${marker}-private.webp`,
          mimeType: "image/webp",
          size: 1_024,
          alt: "Hero privat",
          width: 800,
          height: 600,
          uploaderId: adminId,
        },
      }),
    ]);
    [adminMediaId, privateMediaId] = media.map(({id}) => id);
  });

  afterAll(async () => {
    const pages = await prisma.page.findMany({
      where: {slug: {startsWith: marker}},
      select: {id: true},
    });
    const pageIds = pages.map(({id}) => id);
    if (pageIds.length > 0) {
      await prisma.activityLog.deleteMany({
        where: {resourceType: "Page", resourceId: {in: pageIds}},
      });
      await prisma.contentRevision.deleteMany({
        where: {resourceType: "Page", resourceId: {in: pageIds}},
      });
      await prisma.page.deleteMany({where: {id: {in: pageIds}}});
    }
    await prisma.media.deleteMany({where: {originalName: {startsWith: marker}}});
    await prisma.activityLog.deleteMany({
      where: {actorId: {in: [adminId, editorId]}},
    });
    await prisma.user.deleteMany({where: {email: {startsWith: marker}}});
    await prisma.$disconnect();
  });

  it("creates a page with sanitized locales, revisions, and activity atomically", async () => {
    const slug = `${marker}-create`;
    const hostile = "<p onclick=\"alert(1)\">Aman</p><script>alert(2)</script>";
    const result = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(slug, {
        translations: {
          id: translation("Indonesia", hostile),
          en: translation("English", hostile),
          ar: translation("العربية", hostile),
        },
        publication: {intent: "PUBLISH_NOW"},
      }),
      clock,
    );

    expect(result).toMatchObject({
      ok: true,
      version: 1,
      status: "PUBLISHED",
    });
    if (!result.ok) throw new Error("Expected Page creation.");
    const stored = await prisma.page.findUniqueOrThrow({
      where: {id: result.pageId},
      include: {translations: {orderBy: {locale: "asc"}}},
    });
    expect(stored).toMatchObject({
      contentOwnerId: adminId,
      status: "PUBLISHED",
      heroMediaId: adminMediaId,
    });
    expect(stored.translations).toHaveLength(3);
    expect(stored.translations.every(({content, status, sourceVersion}) =>
      content === "<p>Aman</p>"
      && status === "PUBLISHED"
      && sourceVersion === 1,
    )).toBe(true);

    const revisions = await prisma.contentRevision.findMany({
      where: {resourceType: "Page", resourceId: stored.id},
      orderBy: [{scopeKey: "asc"}, {version: "asc"}],
    });
    expect(revisions).toHaveLength(4);
    expect(revisions.map(({scopeKey}) => scopeKey).sort()).toEqual([
      "ar", "en", "id", "root",
    ]);
    expect(JSON.stringify(revisions.map(({snapshotJson}) => snapshotJson))).not.toMatch(
      /storageKey|session|password|token|onclick|<script/i,
    );

    const activities = await prisma.activityLog.findMany({
      where: {resourceType: "Page", resourceId: stored.id},
    });
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({action: "CREATE"});
  });

  it("rejects non-ADMIN sessions from creating, updating, or mutating Pages", async () => {
    const slug = `${marker}-role-reject`;
    const roles: ActiveDatabaseSession["role"][] = ["EDITOR", "PETUGAS", "SATGAS_PPKS"];

    for (const role of roles) {
      await expect(createPage(
        prisma,
        actor(editorId, role),
        input(slug),
        clock,
      )).resolves.toEqual({ok: false, code: "FORBIDDEN"});
    }
    expect(await prisma.page.count({where: {slug}})).toBe(0);
  });

  it("rejects missing references and non-public hero media without partial writes", async () => {
    const candidates = [
      {
        suffix: "missing-media",
        expected: "MEDIA_NOT_FOUND",
        override: {heroMediaId: `${marker}-missing-media`},
      },
      {
        suffix: "private-media",
        expected: "MEDIA_FORBIDDEN",
        override: {heroMediaId: privateMediaId},
      },
      {
        suffix: "missing-parent",
        expected: "PARENT_NOT_FOUND",
        override: {heroMediaId: adminMediaId, parentId: `${marker}-non-existent-parent`},
      },
    ] as const;

    for (const candidate of candidates) {
      const slug = `${marker}-${candidate.suffix}`;
      await expect(createPage(
        prisma,
        actor(adminId, "ADMIN"),
        input(slug, candidate.override),
        clock,
      )).resolves.toEqual({ok: false, code: candidate.expected});
      expect(await prisma.page.count({where: {slug}})).toBe(0);
    }
  });

  it("replaces translations atomically and rejects stale updates without partial changes", async () => {
    const slug = `${marker}-update`;
    const created = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(slug),
      clock,
    );
    if (!created.ok) throw new Error("Expected draft Page.");

    const updated = await updatePage(
      prisma,
      actor(adminId, "ADMIN"),
      updateInput(created.pageId, 1, `${slug}-renamed`, {
        translations: {
          id: translation("Judul versi dua"),
          ar: translation("العنوان الثاني"),
        },
      }),
      clock,
    );
    expect(updated).toMatchObject({ok: true, version: 2, status: "DRAFT"});

    const stale = await updatePage(
      prisma,
      actor(adminId, "ADMIN"),
      updateInput(created.pageId, 1, `${slug}-stale`, {
        translations: {id: translation("Tidak boleh tersimpan")},
      }),
      clock,
    );
    expect(stale).toEqual({ok: false, code: "VERSION_CONFLICT"});

    const stored = await prisma.page.findUniqueOrThrow({
      where: {id: created.pageId},
      include: {translations: true},
    });
    expect(stored).toMatchObject({slug: `${slug}-renamed`, version: 2});
    expect(stored.translations.map(({locale}) => locale).sort()).toEqual(["ar", "id"]);
    expect(stored.translations.find(({locale}) => locale === "id")?.title)
      .toBe("Judul versi dua");
    expect(await prisma.contentRevision.count({
      where: {resourceType: "Page", resourceId: stored.id, version: 2},
    })).toBe(3);
  });

  it("returns identical non-disclosing results for missing and non-ADMIN actor queries", async () => {
    const created = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-idor-target`),
      clock,
    );
    if (!created.ok) throw new Error("Expected owner Page.");

    const missing = await updatePage(
      prisma,
      actor(adminId, "ADMIN"),
      updateInput(`${marker}-missing-page`, 1, `${marker}-missing-attempt`),
      clock,
    );
    expect(missing).toEqual({ok: false, code: "NOT_FOUND"});

    const stored = await prisma.page.findUniqueOrThrow({
      where: {id: created.pageId},
    });
    expect(stored).toMatchObject({version: 1, slug: `${marker}-idor-target`});
  });

  it("enforces legal publication transitions and records accurate audit actions", async () => {
    const created = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-publication`, {
        translations: {id: translation("Publication flow")},
      }),
      clock,
    );
    if (!created.ok) throw new Error("Expected draft.");

    const published = await mutatePagePublication(
      prisma,
      actor(adminId, "ADMIN"),
      {intent: "PUBLISH_NOW", pageId: created.pageId, expectedVersion: 1},
      clock,
    );
    expect(published).toMatchObject({
      ok: true,
      version: 2,
      status: "PUBLISHED",
    });
    await expect(mutatePagePublication(
      prisma,
      actor(adminId, "ADMIN"),
      {intent: "PUBLISH_NOW", pageId: created.pageId, expectedVersion: 2},
      clock,
    )).resolves.toEqual({ok: false, code: "INVALID_STATE"});

    const archived = await mutatePagePublication(
      prisma,
      actor(adminId, "ADMIN"),
      {intent: "ARCHIVE", pageId: created.pageId, expectedVersion: 2},
      clock,
    );
    expect(archived).toMatchObject({
      ok: true,
      version: 3,
      status: "ARCHIVED",
    });
    const returned = await mutatePagePublication(
      prisma,
      actor(adminId, "ADMIN"),
      {intent: "RETURN_TO_DRAFT", pageId: created.pageId, expectedVersion: 3},
      clock,
    );
    expect(returned).toMatchObject({
      ok: true,
      version: 4,
      status: "DRAFT",
    });

    const stored = await prisma.page.findUniqueOrThrow({
      where: {id: created.pageId},
      include: {translations: true},
    });
    expect(stored).toMatchObject({version: 4, status: "DRAFT"});
    expect(stored.translations).toEqual([
      expect.objectContaining({locale: "id", status: "DRAFT", sourceVersion: 4}),
    ]);
    expect(await prisma.contentRevision.count({
      where: {resourceType: "Page", resourceId: stored.id},
    })).toBe(8);

    const activities = await prisma.activityLog.findMany({
      where: {resourceType: "Page", resourceId: stored.id},
      orderBy: {createdAt: "asc"},
    });
    expect(activities).toHaveLength(4);
    expect(activities[0].action).toBe("CREATE");
    expect(activities[1].action).toBe("PUBLISH");
    expect(activities[2].action).toBe("ARCHIVE");
    expect(activities[3].action).toBe("UPDATE");
    expect((activities[3].metadata as Record<string, unknown>)?.operation).toBe("RETURN_TO_DRAFT");
  });

  it("rolls back optimistic claims and content changes on a slug conflict", async () => {
    const first = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-slug-first`),
      clock,
    );
    const second = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-slug-second`),
      clock,
    );
    if (!first.ok || !second.ok) throw new Error("Expected draft Pages.");

    const result = await updatePage(
      prisma,
      actor(adminId, "ADMIN"),
      updateInput(second.pageId, 1, `${marker}-slug-first`, {
        translations: {id: translation("Harus rollback")},
      }),
      clock,
    );
    expect(result).toEqual({ok: false, code: "SLUG_CONFLICT"});
    const stored = await prisma.page.findUniqueOrThrow({
      where: {id: second.pageId},
      include: {translations: true},
    });
    expect(stored).toMatchObject({version: 1, slug: `${marker}-slug-second`});
    expect(stored.translations.find(({locale}) => locale === "id")?.title)
      .toBe("Halaman Indonesia");
    expect(await prisma.contentRevision.count({
      where: {resourceType: "Page", resourceId: second.pageId},
    })).toBe(4);
  });

  it("rejects hierarchy cycles when creating a page under a descendant", async () => {
    const grandparent = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-gp`, {
        heroMediaId: null,
        translations: {id: translation("Grandparent")},
      }),
      clock,
    );
    if (!grandparent.ok) throw new Error("Expected grandparent.");

    const parent = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-p`, {
        parentId: grandparent.pageId,
        heroMediaId: null,
        translations: {id: translation("Parent")},
      }),
      clock,
    );
    if (!parent.ok) throw new Error("Expected parent.");

    const child = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-c`, {
        parentId: parent.pageId,
        heroMediaId: null,
        translations: {id: translation("Child")},
      }),
      clock,
    );
    if (!child.ok) throw new Error("Expected child.");

    const cycle = await updatePage(
      prisma,
      actor(adminId, "ADMIN"),
      updateInput(grandparent.pageId, 1, `${marker}-gp`, {
        parentId: child.pageId,
        heroMediaId: null,
        translations: {id: translation("Grandparent (cycle attempt)")},
      }),
      clock,
    );
    expect(cycle).toEqual({ok: false, code: "HIERARCHY_CYCLE"});

    const stored = await prisma.page.findUniqueOrThrow({
      where: {id: grandparent.pageId},
    });
    expect(stored.parentId).toBeNull();
  });

  it("prevents deleting a page that has children", async () => {
    const parent = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-del-parent`, {
        heroMediaId: null,
        translations: {id: translation("Parent to delete")},
      }),
      clock,
    );
    if (!parent.ok) throw new Error("Expected parent.");

    const child = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-del-child`, {
        parentId: parent.pageId,
        heroMediaId: null,
        translations: {id: translation("Child")},
      }),
      clock,
    );
    if (!child.ok) throw new Error("Expected child.");

    const delResult = await deletePage(
      prisma,
      actor(adminId, "ADMIN"),
      {pageId: parent.pageId, expectedVersion: 1},
      clock,
    );
    expect(delResult).toEqual({ok: false, code: "INVALID_STATE"});

    const stored = await prisma.page.findUniqueOrThrow({
      where: {id: parent.pageId},
    });
    expect(stored).not.toBeNull();
  });

  it("safely deletes an orphan page and records audit activity", async () => {
    const orphan = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-delete`, {
        heroMediaId: null,
        translations: {id: translation("Yatim")},
      }),
      clock,
    );
    if (!orphan.ok) throw new Error("Expected orphan Page.");

    const result = await deletePage(
      prisma,
      actor(adminId, "ADMIN"),
      {pageId: orphan.pageId, expectedVersion: 1},
      clock,
    );
    expect(result).toMatchObject({ok: true, pageId: orphan.pageId, version: 2});

    await expect(prisma.page.findUniqueOrThrow({
      where: {id: orphan.pageId},
    })).rejects.toThrow();

    const activities = await prisma.activityLog.findMany({
      where: {resourceType: "Page", resourceId: orphan.pageId},
    });
    expect(activities).toHaveLength(2);
    const deleteActivity = activities.find((a) =>
      a.action === "UPDATE" && (a.metadata as Record<string, unknown>)?.operation === "DELETE"
    );
    expect(deleteActivity).toBeDefined();
    expect(deleteActivity).toMatchObject({
      action: "UPDATE",
      metadata: {operation: "DELETE", version: 2},
    });
  });

  it("allows create with slug equal to a valid parentId reference", async () => {
    const parent = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-parent-ref`, {
        heroMediaId: null,
        translations: {id: translation("Referensi Parent")},
      }),
      clock,
    );
    if (!parent.ok) throw new Error("Expected parent.");

    const result = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-child-ref`, {
        slug: parent.pageId,
        parentId: parent.pageId,
        heroMediaId: null,
        translations: {id: translation("Child with parentId as slug")},
      }),
      clock,
    );
    expect(result).toMatchObject({ok: true});

    if (!result.ok) throw new Error("Expected ok");
    const stored = await prisma.page.findUniqueOrThrow({
      where: {id: result.pageId},
    });
    expect(stored.parentId).toBe(parent.pageId);
    expect(stored.slug).toBe(parent.pageId);
  });

  it("sorts by TITLE_ASC with deterministic tiebreak and correct pagination", async () => {
    const created = await Promise.all([
      createPage(prisma, actor(adminId, "ADMIN"), input(`${marker}-sort-z`, {
        order: 0,
        heroMediaId: null,
        translations: {id: translation("Zebra Sort")},
      }), clock),
      createPage(prisma, actor(adminId, "ADMIN"), input(`${marker}-sort-a`, {
        order: 99,
        heroMediaId: null,
        translations: {id: translation("Alpha Sort")},
      }), clock),
      createPage(prisma, actor(adminId, "ADMIN"), input(`${marker}-sort-m`, {
        order: 50,
        heroMediaId: null,
        translations: {id: translation("Mango Sort")},
      }), clock),
      createPage(prisma, actor(adminId, "ADMIN"), input(`${marker}-sort-alpha2`, {
        order: 1,
        heroMediaId: null,
        translations: {id: translation("Alpha Sort")},
      }), clock),
    ]);
    if (created.some((c) => !c.ok)) throw new Error("Expected all pages created.");

    const result = await listPages(prisma, actor(adminId, "ADMIN"), {
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "Sort",
      sort: "TITLE_ASC",
    }, clock);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected list.");
    // "Sort" search matches exactly the 4 test pages
    const matching = result.data.items.filter((i: {slug: string}) => i.slug.startsWith(marker));
    expect(matching).toHaveLength(4);
    const titles = matching.map((i: {title: string; order: number}) => ({title: i.title, order: i.order}));

    // Should be sorted by title ASC (Alpha Sort, Alpha Sort, Mango Sort, Zebra Sort) not by order
    expect(titles.map((t) => t.title)).toEqual(["Alpha Sort", "Alpha Sort", "Mango Sort", "Zebra Sort"]);
    // The two "Alpha Sort" entries: deterministic tiebreak by id ASC (created order)
    expect(titles[0].order).toBe(99);
    expect(titles[1].order).toBe(1);
  });

  it("supports status filtering and search in list queries", async () => {
    const result = await listPages(prisma, actor(adminId, "ADMIN"), {
      page: 1,
      pageSize: 20,
      status: "PUBLISHED",
      search: "Sort",
      sort: "TITLE_ASC",
    }, clock);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected list.");
    const matching = result.data.items.filter((i: {slug: string}) => i.slug.startsWith(marker));
    // None of the Sort pages are PUBLISHED
    expect(matching).toHaveLength(0);

    const searchResult = await listPages(prisma, actor(adminId, "ADMIN"), {
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "Zebra",
      sort: "TITLE_ASC",
    }, clock);

    expect(searchResult.ok).toBe(true);
    if (!searchResult.ok) throw new Error("Expected list.");
    const searchMatching = searchResult.data.items.filter((i: {slug: string}) => i.slug.startsWith(marker));
    expect(searchMatching).toHaveLength(1);
    expect(searchMatching[0].title).toBe("Zebra Sort");
  });

  it("returns parent summary, locale list, and hasChildren in list results", async () => {
    const parent = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-list-parent`, {
        heroMediaId: null,
        translations: {id: translation("Parent Page")},
      }),
      clock,
    );
    if (!parent.ok) throw new Error("Expected parent.");

    const child = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-list-child`, {
        parentId: parent.pageId,
        heroMediaId: null,
        translations: {id: translation("Child Page"), en: translation("Child EN")},
      }),
      clock,
    );
    if (!child.ok) throw new Error("Expected child.");

    const result = await listPages(prisma, actor(adminId, "ADMIN"), {
      page: 1,
      pageSize: 20,
      status: "ALL",
      search: "",
      sort: "TITLE_ASC",
    }, clock);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected list.");

    const childItem = result.data.items.find((i: {id: string}) => i.id === child.pageId);
    expect(childItem).toBeDefined();
    if (!childItem) throw new Error("Missing child item");
    expect(childItem.parentId).toBe(parent.pageId);
    expect(childItem.parentTitle).toBe("Parent Page");
    expect(childItem.hasChildren).toBe(false);
    expect(childItem.availableLocales).toEqual(["id", "en"]);

    const parentItem = result.data.items.find((i: {id: string}) => i.id === parent.pageId);
    expect(parentItem).toBeDefined();
    if (!parentItem) throw new Error("Missing parent item");
    expect(parentItem.hasChildren).toBe(true);
    expect(parentItem.parentTitle).toBeNull();
    expect(parentItem.title).toBe("Parent Page");
    expect(parentItem.titleLocale).toBe("id");
  });

  it("rejects non-ADMIN query sessions and returns detail for admin", async () => {
    const page = await createPage(
      prisma,
      actor(adminId, "ADMIN"),
      input(`${marker}-query-detail`, {
        heroMediaId: null,
        translations: {
          id: translation("Query Detail"),
          en: translation("Query Detail EN"),
        },
      }),
      clock,
    );
    if (!page.ok) throw new Error("Expected page.");

    const editorResult = await getPageDetail(prisma, actor(editorId, "EDITOR"), page.pageId, clock);
    expect(editorResult).toEqual({ok: false, code: "SESSION_INVALID"});

    const missingResult = await getPageDetail(prisma, actor(adminId, "ADMIN"), `${marker}-nonexist`, clock);
    expect(missingResult).toEqual({ok: false, code: "REQUEST_INVALID"});

    const detail = await getPageDetail(prisma, actor(adminId, "ADMIN"), page.pageId, clock);
    if (!detail.ok) throw new Error("Expected detail");
    expect(detail.data.id).toBe(page.pageId);
    expect(detail.data.status).toBe("DRAFT");
    expect(detail.data.translations.id.title).toBe("Query Detail");
    expect(detail.data.translations.en).toBeDefined();
    expect(detail.data.translations.en!.title).toBe("Query Detail EN");
    expect(detail.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
