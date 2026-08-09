let pageIdCounter = 0;

export interface FixturePage {
  id: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  order: number;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  translations: FixturePageTranslation[];
}

export interface FixturePageTranslation {
  id: string;
  pageId: string;
  locale: "id" | "en" | "ar";
  title: string;
  content: string;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  sourceVersion: number;
}

export function createPage(overrides: Partial<FixturePage> = {}): FixturePage {
  pageIdCounter += 1;
  const id = overrides.id ?? `test-page-${pageIdCounter}`;
  return {
    id,
    slug: `test-page-${pageIdCounter}`,
    status: "PUBLISHED",
    order: pageIdCounter,
    parentId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    translations: [],
    ...overrides,
  };
}

export function createPageTranslation(
  pageId: string,
  overrides: Partial<FixturePageTranslation> = {},
): FixturePageTranslation {
  const locale = overrides.locale ?? "id";
  return {
    id: `${pageId}-${locale}`,
    pageId,
    locale,
    title: `Halaman ${locale}`,
    content: `<p>Konten halaman dalam ${locale}</p>`,
    status: "PUBLISHED",
    sourceVersion: 1,
    ...overrides,
  };
}

export function createPageWithTranslations(overrides: Partial<FixturePage> = {}): FixturePage {
  const page = createPage(overrides);
  page.translations = [
    createPageTranslation(page.id, { locale: "id" }),
    createPageTranslation(page.id, { locale: "en" }),
    createPageTranslation(page.id, { locale: "ar" }),
  ];
  return page;
}

export function resetPageIdCounter(): void {
  pageIdCounter = 0;
}
