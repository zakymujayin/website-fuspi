import type {ActiveDatabaseSession} from "@/contracts/auth";
import type {TaxonomyKind, TaxonomySummary} from "@/contracts/admin-foundation";
import type {createPrismaClient} from "@/lib/db/client";
import {listTaxonomies} from "@/features/admin/foundation";

export type TaxonomyOption = {
  id: string;
  kind: TaxonomyKind;
  slug: string;
  label: string;
};

export type PostTaxonomyOptions = {
  categories: TaxonomyOption[];
  tags: TaxonomyOption[];
};

export type EditableTaxonomy = {
  id: string;
  kind: TaxonomyKind;
  slug: string;
  usageCount: number;
  translations: {
    id: {name: string};
    en?: {name: string};
    ar?: {name: string};
  };
};

type Database = ReturnType<typeof createPrismaClient>;

function labelFor(item: TaxonomySummary) {
  return item.translations.id.name || item.slug;
}

function toOption(item: TaxonomySummary): TaxonomyOption {
  return {id: item.id, kind: item.kind, slug: item.slug, label: labelFor(item)};
}

export async function loadPostTaxonomyOptions(
  prisma: Database,
  session: ActiveDatabaseSession | null,
): Promise<PostTaxonomyOptions> {
  const [categories, tags] = await Promise.all([
    listTaxonomies(prisma, session, {page: 1, pageSize: 50, search: "", direction: "ASC", kind: "CATEGORY"}),
    listTaxonomies(prisma, session, {page: 1, pageSize: 50, search: "", direction: "ASC", kind: "TAG"}),
  ]);
  return {
    categories: categories.ok ? categories.data.items.map(toOption) : [],
    tags: tags.ok ? tags.data.items.map(toOption) : [],
  };
}

function translationsFromRows(rows: Array<{locale: "id" | "en" | "ar"; name: string}>) {
  const entries = Object.fromEntries(rows.map((row) => [row.locale, {name: row.name}]));
  return {
    id: entries.id ?? {name: ""},
    ...(entries.en ? {en: entries.en} : {}),
    ...(entries.ar ? {ar: entries.ar} : {}),
  };
}

export async function getEditableTaxonomy(
  prisma: Database,
  session: ActiveDatabaseSession | null,
  id: string,
  kind: TaxonomyKind,
): Promise<EditableTaxonomy | null> {
  const access = await listTaxonomies(prisma, session, {
    page: 1,
    pageSize: 10,
    search: "",
    direction: "ASC",
    kind,
  });
  if (!access.ok) return null;

  if (kind === "CATEGORY") {
    const row = await prisma.category.findUnique({
      where: {id},
      include: {translations: true, _count: {select: {posts: true}}},
    });
    if (!row) return null;
    return {
      id: row.id,
      kind,
      slug: row.slug,
      usageCount: row._count.posts,
      translations: translationsFromRows(row.translations),
    };
  }

  const row = await prisma.tag.findUnique({
    where: {id},
    include: {translations: true, _count: {select: {posts: true}}},
  });
  if (!row) return null;
  return {
    id: row.id,
    kind,
    slug: row.slug,
    usageCount: row._count.posts,
    translations: translationsFromRows(row.translations),
  };
}
