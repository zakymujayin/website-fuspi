let categoryIdCounter = 0;

export interface FixtureCategory {
  id: string;
  slug: string;
  createdAt: Date;
  translations: FixtureCategoryTranslation[];
}

export interface FixtureCategoryTranslation {
  id: string;
  categoryId: string;
  locale: "id" | "en" | "ar";
  name: string;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  sourceVersion: number;
}

export function createCategory(overrides: Partial<FixtureCategory> = {}): FixtureCategory {
  categoryIdCounter += 1;
  const id = overrides.id ?? `test-category-${categoryIdCounter}`;
  return {
    id,
    slug: `test-category-${categoryIdCounter}`,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    translations: [],
    ...overrides,
  };
}

export function createCategoryTranslation(
  categoryId: string,
  overrides: Partial<FixtureCategoryTranslation> = {},
): FixtureCategoryTranslation {
  const locale = overrides.locale ?? "id";
  return {
    id: `${categoryId}-${locale}`,
    categoryId,
    locale,
    name: `Kategori ${locale}`,
    status: "PUBLISHED",
    sourceVersion: 1,
    ...overrides,
  };
}

export function createCategoryWithTranslations(
  overrides: Partial<FixtureCategory> = {},
): FixtureCategory {
  const category = createCategory(overrides);
  category.translations = [
    createCategoryTranslation(category.id, { locale: "id" }),
    createCategoryTranslation(category.id, { locale: "en" }),
    createCategoryTranslation(category.id, { locale: "ar" }),
  ];
  return category;
}

export function resetCategoryIdCounter(): void {
  categoryIdCounter = 0;
}
