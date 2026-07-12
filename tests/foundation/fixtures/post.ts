let postIdCounter = 0;

export interface FixturePost {
  id: string;
  type: "BERITA" | "PENGUMUMAN" | "INFORMASI" | "KOLOM";
  columnType: string | null;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  viewCount: number;
  publishedAt: Date | null;
  version: number;
  categoryId: string | null;
  authorId: string | null;
  coverMediaId: string | null;
  createdAt: Date;
  updatedAt: Date;
  translations: FixturePostTranslation[];
}

export interface FixturePostTranslation {
  id: string;
  postId: string;
  locale: "id" | "en" | "ar";
  title: string;
  excerpt: string | null;
  content: string;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  sourceVersion: number;
}

export function createPost(overrides: Partial<FixturePost> = {}): FixturePost {
  postIdCounter += 1;
  const id = overrides.id ?? `test-post-${postIdCounter}`;
  return {
    id,
    type: "BERITA",
    columnType: null,
    slug: `test-post-${postIdCounter}`,
    status: "PUBLISHED",
    isFeatured: false,
    viewCount: 0,
    publishedAt: new Date("2026-01-15T00:00:00.000Z"),
    version: 1,
    categoryId: null,
    authorId: null,
    coverMediaId: null,
    createdAt: new Date("2026-01-10T00:00:00.000Z"),
    updatedAt: new Date("2026-01-15T00:00:00.000Z"),
    translations: [],
    ...overrides,
  };
}

export function createPostTranslation(
  postId: string,
  overrides: Partial<FixturePostTranslation> = {},
): FixturePostTranslation {
  const locale = overrides.locale ?? "id";
  return {
    id: `${postId}-${locale}`,
    postId,
    locale,
    title: `Post di ${locale}`,
    excerpt: `Ringkasan post dalam ${locale}`,
    content: `<p>Konten post dalam ${locale}</p>`,
    status: "PUBLISHED",
    sourceVersion: 1,
    ...overrides,
  };
}

export function createPostWithTranslations(overrides: Partial<FixturePost> = {}): FixturePost {
  const post = createPost(overrides);
  post.translations = [
    createPostTranslation(post.id, { locale: "id" }),
    createPostTranslation(post.id, { locale: "en" }),
    createPostTranslation(post.id, { locale: "ar" }),
  ];
  return post;
}

export function resetPostIdCounter(): void {
  postIdCounter = 0;
}
