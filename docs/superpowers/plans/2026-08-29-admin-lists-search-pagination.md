# Admin Lists — Search & Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every admin list page (except the Media Library) exposes a search field, a page-size selector (10 / 20 / 50), and pagination, and defaults to 10 rows per page.

**Architecture:** Two shared client primitives — `AdminListSearch` and `AdminPageSizeSelect` — are dropped into each list page. Each list family's existing URL-query normalizer gains `search` and `pageSize` members under the same whole-record fail-closed rule it already uses, threaded through its transport-query builder, its filter/sort tab link builders, and its pagination link builder. The `*_PAGE_SIZE` constants flip from 20 to 10. No list layout changes (Berita/Kolom/Pengumuman stay tables; the rest stay card lists).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS 4, shadcn/ui, next-intl, Zod, Prisma, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-28-admin-list-table-search-pagination-design.md`

## Global Constraints

- **Whole-record fail-closed normalization.** In every query normalizer touched: any unknown key, any array/repeated value, or any member outside its strict form collapses the *entire* query back to that family's canonical defaults. Never partially trust a query.
- **`pageSize` is never a free integer from the URL.** Accept only the exact strings `"10"`, `"20"`, `"50"`; anything else fails the whole record closed. Canonical `pageSize` is `10`.
- **`search` validation.** `.trim()` first (a spaces-only term is "no search", not invalid). Reject if `length > MAX` or if it matches `UNSAFE_TEXT_PATTERN` (`/[--]/u`). MAX is 100 for posts/pages/public-content, 120 for facility/taxonomy — mirror each family's existing `SearchTextSchema`/`CmsSearchSchema` bound.
- **`page` form** stays the existing strict `^(?:[1-9]\d{0,3}|10000)$`.
- **Logical direction utilities only.** `ms/me/ps/pe/text-start/text-end/start-*/end-*`. Never `ml-/mr-/pl-/pr-/text-left/text-right/left-N/right-N/border-l/border-r/rounded-l-`. An existing test (`tests/m3/ui/admin-post-list.test.tsx` › "uses no physical direction utility") enforces this for the Post admin surface — keep it green.
- **i18n.** Every new message key is added to `messages/id.json`, `messages/en.json`, `messages/ar.json` in the same commit. Arabic is a real translation, not transliterated Latin. Per-namespace "same keys in id/en/ar" parity tests must stay green.
- **shadcn/ui.** Use `Button` and `Input` from `@/components/ui`. Use `cn()` for conditional classes. Icons inside buttons get `data-icon`. `gap-*`, not `space-x/y-*`. `size-*` for equal dimensions.
- **Components.** Server Components by default. `AdminListSearch` and `AdminPageSizeSelect` are Client Components (`"use client"`) because they navigate on interaction.
- **Verification per task:** `npm run typecheck` (zero errors), `npm run lint` (zero errors), `npm run test` (zero failures). Playwright specs run with `npx playwright test <path>` where a local isolated Postgres is configured (`DATABASE_URL`); if it is not available the runner skips them — note that in the task report rather than treating it as a pass.
- **Out of scope:** `/admin/media` (frozen `page`+`kind` query, thumbnail grid), `/admin/beranda/*` (small fixed ordered lists).
- **Commits:** one per task, message `feat(admin): <task deliverable>` or `refactor(admin): …`. End every commit message with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

## File Structure

**New files:**
- `src/components/admin/shared/admin-list-search.tsx` — client search field (generalized from `AdminPageSearch`).
- `src/components/admin/shared/admin-page-size-select.tsx` — client 10/20/50 selector.
- `src/components/admin/taxonomy/taxonomy-list-query.ts` — UI-side href/canonical helpers for the taxonomy list (the raw normalizer stays in `src/contracts/admin-foundation.ts`).
- `src/components/admin/facility/facility-list-query.ts` — same, for facilities.
- `src/components/admin/taxonomy/taxonomy-pagination.tsx` + `src/components/admin/facility/facility-pagination.tsx` — thin wrappers over the shared pagination markup, or direct reuse of `AdminPagePagination`-style markup (decide in-task).
- Test files alongside each.

**Modified files:**
- `src/components/admin/posts/post-query.ts` — add `search` + `pageSize`; `ADMIN_POST_PAGE_SIZE` 20→10.
- `src/components/admin/pages/page-query.ts` — add `pageSize`; `ADMIN_PAGE_PAGE_SIZE` 20→10.
- `src/components/admin/public-content/public-content-query.ts` — add `pageSize` to allowed keys + normalizer + transport + `buildPublicContentAdminHref`; `PUBLIC_CONTENT_ADMIN_PAGE_SIZE` 20→10.
- `src/components/admin/pages/page-search.tsx` — delegate to `AdminListSearch` (keep its public props).
- `src/components/admin/posts/post-filter-tabs.tsx`, `post-pagination.tsx` — accept + forward `search` and `pageSize`.
- `src/app/[locale]/admin/posts/page.tsx`, `admin/kolom/page.tsx`, `admin/pengumuman/page.tsx` — add search + size select; thread `search`/`pageSize`.
- `src/app/[locale]/admin/pages/page.tsx` — add size select.
- The 10 public-content pages (`agenda`, `album`, `beasiswa`, `dokumen`, `faq`, `kegiatan`, `kerjasama`, `layanan`, `prestasi`, `testimoni`) `page.tsx` — swap the plain `<form method="GET">` for `AdminListSearch`; add size select; preserve `pageSize` in the inline href builders.
- `src/app/[locale]/admin/taksonomi/page.tsx` — add search + pagination + size select.
- `src/app/[locale]/admin/fasilitas/page.tsx` — swap plain form for `AdminListSearch`; add pagination + size select.
- `src/contracts/admin-foundation.ts` — `normalizeTaxonomySearchParams` default `pageSize` 20→10 (one literal).
- `src/features/facility/domain.ts` — `normalizeFacilitySearchParams` default `pageSize` 20→10 (one literal).
- `messages/{id,en,ar}.json` — new keys.
- e2e specs: `e2e/m3/admin-post-list-browse.spec.ts` and any public-content/pages/taxonomy/facility spec that hard-codes "20 per page" or a derived count.

---

## Task 1: `AdminPageSizeSelect` shared primitive

**Files:**
- Create: `src/components/admin/shared/admin-page-size-select.tsx`
- Test: `tests/m4/ui/admin-page-size-select.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
  export type AdminPageSize = (typeof ADMIN_PAGE_SIZE_OPTIONS)[number];
  export function AdminPageSizeSelect(props: {
    value: AdminPageSize;
    buildHref: (size: AdminPageSize) => string; // href with pageSize set (or omitted for 10) and page reset to 1
    label: string;      // e.g. "Baris per halaman"
    optionLabel: (size: AdminPageSize) => string; // e.g. (n) => `${n}`
  }): JSX.Element;
  ```
- Consumes: `useRouter` from `@/i18n/navigation`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/m4/ui/admin-page-size-select.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { AdminPageSizeSelect, ADMIN_PAGE_SIZE_OPTIONS } = await import(
  "@/components/admin/shared/admin-page-size-select"
);

function container(markup: string) {
  const el = document.createElement("div");
  el.innerHTML = markup;
  return el;
}

describe("AdminPageSizeSelect", () => {
  it("renders one option per allowed size and marks the current value selected", () => {
    const markup = renderToStaticMarkup(
      <AdminPageSizeSelect
        value={10}
        buildHref={(size) => `/admin/x?pageSize=${size}`}
        label="Baris per halaman"
        optionLabel={(n) => `${n}`}
      />,
    );
    const el = container(markup);
    const options = el.querySelectorAll("option");
    expect(Array.from(options).map((o) => o.getAttribute("value"))).toEqual(
      ADMIN_PAGE_SIZE_OPTIONS.map(String),
    );
    expect(el.querySelector("option[selected]")?.getAttribute("value")).toBe("10");
    expect(el.querySelector("select")?.getAttribute("aria-label")).toBe("Baris per halaman");
  });

  it("uses only logical-direction utilities", () => {
    const markup = renderToStaticMarkup(
      <AdminPageSizeSelect value={20} buildHref={() => "/x"} label="L" optionLabel={String} />,
    );
    for (const bad of [/\bml-\d/, /\bmr-\d/, /\bpl-\d/, /\bpr-\d/, /\btext-left\b/, /\btext-right\b/]) {
      expect(markup).not.toMatch(bad);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/m4/ui/admin-page-size-select.test.tsx`
Expected: FAIL — module `@/components/admin/shared/admin-page-size-select` not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/shared/admin-page-size-select.tsx
"use client";

import type { ChangeEvent } from "react";

import { useRouter } from "@/i18n/navigation";

export const ADMIN_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type AdminPageSize = (typeof ADMIN_PAGE_SIZE_OPTIONS)[number];

type AdminPageSizeSelectProps = {
  value: AdminPageSize;
  buildHref: (size: AdminPageSize) => string;
  label: string;
  optionLabel: (size: AdminPageSize) => string;
};

export function AdminPageSizeSelect({ value, buildHref, label, optionLabel }: AdminPageSizeSelectProps) {
  const router = useRouter();

  function change(event: ChangeEvent<HTMLSelectElement>) {
    const next = Number(event.target.value) as AdminPageSize;
    if (next !== value) router.push(buildHref(next));
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-500">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={change}
        className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:border-royal-500 focus:outline-none focus:ring-1 focus:ring-royal-500"
      >
        {ADMIN_PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {optionLabel(size)}
          </option>
        ))}
      </select>
    </label>
  );
}
```

Note: `renderToStaticMarkup` emits `selected` on the option matching `value`; keep `value` on the `<select>` (React controlled) — the test asserts `option[selected]`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/m4/ui/admin-page-size-select.test.tsx`
Expected: PASS.

- [ ] **Step 5: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add src/components/admin/shared/admin-page-size-select.tsx tests/m4/ui/admin-page-size-select.test.tsx
git commit -m "feat(admin): AdminPageSizeSelect shared 10/20/50 primitive

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `AdminListSearch` shared primitive

**Files:**
- Create: `src/components/admin/shared/admin-list-search.tsx`
- Modify: `src/components/admin/pages/page-search.tsx` (delegate to the new primitive; keep its exported `AdminPageSearch` props unchanged so `pages` tests pass)
- Test: `tests/m4/ui/admin-list-search.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export function AdminListSearch(props: {
    initialSearch: string;
    maxLength: number;
    buildHref: (search: string) => string; // href with search set (or omitted when empty) and page reset to 1
    labels: { placeholder: string; ariaLabel: string; action: string; clear: string };
  }): JSX.Element;
  ```
- Consumes: `useRouter` from `@/i18n/navigation`; `Button`, `Input` from `@/components/ui`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/m4/ui/admin-list-search.test.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { AdminListSearch } = await import("@/components/admin/shared/admin-list-search");

const LABELS = { placeholder: "Cari judul…", ariaLabel: "Cari", action: "Cari", clear: "Bersihkan" };

function container(markup: string) {
  const el = document.createElement("div");
  el.innerHTML = markup;
  return el;
}

describe("AdminListSearch", () => {
  it("is a search landmark with a bounded search input", () => {
    const markup = renderToStaticMarkup(
      <AdminListSearch initialSearch="" maxLength={100} buildHref={(s) => `/x?search=${s}`} labels={LABELS} />,
    );
    const el = container(markup);
    expect(el.querySelector("[role='search']")).not.toBeNull();
    const input = el.querySelector("input[type='search']");
    expect(input?.getAttribute("maxlength")).toBe("100");
    expect(input?.getAttribute("aria-label")).toBe("Cari");
  });

  it("offers a clear affordance only when there is an active term", () => {
    const empty = renderToStaticMarkup(
      <AdminListSearch initialSearch="" maxLength={100} buildHref={() => "/x"} labels={LABELS} />,
    );
    const withTerm = renderToStaticMarkup(
      <AdminListSearch initialSearch="wisuda" maxLength={100} buildHref={() => "/x"} labels={LABELS} />,
    );
    expect(container(empty).textContent).not.toContain("Bersihkan");
    expect(container(withTerm).textContent).toContain("Bersihkan");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/m4/ui/admin-list-search.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/admin/shared/admin-list-search.tsx
"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminListSearchProps = {
  initialSearch: string;
  maxLength: number;
  buildHref: (search: string) => string;
  labels: { placeholder: string; ariaLabel: string; action: string; clear: string };
};

export function AdminListSearch({ initialSearch, maxLength, buildHref, labels }: AdminListSearchProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildHref(search.trim()));
  }

  function clear() {
    setSearch("");
    if (initialSearch) router.push(buildHref(""));
  }

  return (
    <form onSubmit={submit} role="search" className="flex w-full max-w-md flex-wrap items-center gap-2">
      <div className="relative flex-1">
        <SearchIcon
          aria-hidden
          className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          strokeWidth={1.5}
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          maxLength={maxLength}
          placeholder={labels.placeholder}
          aria-label={labels.ariaLabel}
          className="ps-9"
        />
      </div>
      <Button type="submit" variant="outline">
        {labels.action}
      </Button>
      {search || initialSearch ? (
        <Button type="button" variant="ghost" onClick={clear}>
          <XIcon data-icon aria-hidden />
          {labels.clear}
        </Button>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 4: Delegate `AdminPageSearch` to the primitive**

Rewrite `src/components/admin/pages/page-search.tsx` body to render `<AdminListSearch>` with `buildHref={(s) => buildAdminPageHref({ status, sort, search: s, page: 1 })}`, `maxLength={ADMIN_PAGE_SEARCH_MAX_LENGTH}`, and `labels` pulled from `useTranslations("AdminPageList")` (`searchPlaceholder`, `searchAriaLabel`, `searchAction`, `searchClear`). Keep the exported component name and props (`initialSearch`, `status`, `sort`).

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/m4/ui/admin-list-search.test.tsx tests/m4/ui/page-admin`
Expected: PASS (the existing `AdminPageSearch` / pages tests still green).

- [ ] **Step 6: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add src/components/admin/shared/admin-list-search.tsx src/components/admin/pages/page-search.tsx tests/m4/ui/admin-list-search.test.tsx
git commit -m "feat(admin): AdminListSearch shared primitive; AdminPageSearch delegates to it

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Posts query — `search` + `pageSize`, default 10

**Files:**
- Modify: `src/components/admin/posts/post-query.ts`
- Modify: `src/components/admin/posts/post-filter-tabs.tsx`, `src/components/admin/posts/post-pagination.tsx`
- Test: `tests/m3/ui/admin-post-list.test.tsx` (extend the existing `normalizeAdminPostQuery` / `buildAdminPostHref` describes)

**Interfaces:**
- Produces:
  ```ts
  export const ADMIN_POST_PAGE_SIZE = 10;                 // was 20
  export const ADMIN_POST_SEARCH_MAX_LENGTH = 100;
  export type AdminPostNormalizedQuery = {
    page: number; status: AdminPostStatusFilter; search: string; pageSize: 10 | 20 | 50;
  };
  export function normalizeAdminPostQuery(raw): AdminPostNormalizedQuery; // now also reads search + pageSize
  export function toAdminPostTransportQuery(query, type?: "BERITA"|"PENGUMUMAN"|"KOLOM");
    // now emits query.search and query.pageSize (not "" / fixed)
  export function buildAdminPostHref(
    status: AdminPostStatusFilter, page: number,
    basePath?: string,
    extra?: { search?: string; pageSize?: 10 | 20 | 50 },
  ): string;
  ```
- Consumes: nothing new.

- [ ] **Step 1: Write the failing tests**

Add to `tests/m3/ui/admin-post-list.test.tsx` inside the `normalizeAdminPostQuery` describe:

```ts
it("defaults to page size 10", () => {
  expect(normalizeAdminPostQuery({}).pageSize).toBe(10);
});

it("accepts a trimmed search term and an allowed page size", () => {
  expect(normalizeAdminPostQuery({ search: "  wisuda  ", pageSize: "50" })).toEqual({
    page: 1, status: "ALL", search: "wisuda", pageSize: 50,
  });
});

it.each([
  ["free-int page size", { pageSize: "30" }],
  ["control char in search", { search: "ab" }],
  ["over-long search", { search: "x".repeat(101) }],
])("collapses the whole query to canonical for %s", (_label, raw) => {
  expect(normalizeAdminPostQuery(raw)).toEqual({ page: 1, status: "ALL", search: "", pageSize: 10 });
});
```

And in the `buildAdminPostHref` describe:

```ts
it("serializes a search term and a non-default page size, resetting to page 1", () => {
  expect(buildAdminPostHref("ALL", 1, "/admin/posts", { search: "wisuda", pageSize: 50 }))
    .toBe("/admin/posts?search=wisuda&pageSize=50");
});
it("omits page size 10 from the URL", () => {
  expect(buildAdminPostHref("DRAFT", 2, "/admin/posts", { pageSize: 10 }))
    .toBe("/admin/posts?status=DRAFT&page=2");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/m3/ui/admin-post-list.test.tsx -t "page size"`
Expected: FAIL — `pageSize` undefined / `search` not accepted.

- [ ] **Step 3: Implement in `post-query.ts`**

```ts
export const ADMIN_POST_PAGE_SIZE = 10;
export const ADMIN_POST_SEARCH_MAX_LENGTH = 100;

const ALLOWED_QUERY_KEYS = new Set(["page", "status", "search", "pageSize"]);
const PAGE_SIZE_VALUES = new Set(["10", "20", "50"]);
const UNSAFE_TEXT_PATTERN = /[--]/u;

export type AdminPostNormalizedQuery = {
  page: number;
  status: AdminPostStatusFilter;
  search: string;
  pageSize: 10 | 20 | 50;
};

const ADMIN_POST_CANONICAL_QUERY: AdminPostNormalizedQuery = {
  page: 1, status: "ALL", search: "", pageSize: 10,
};

export function normalizeAdminPostQuery(raw: RawSearchParams): AdminPostNormalizedQuery {
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) return ADMIN_POST_CANONICAL_QUERY;
  }
  const { page: rawPage, status: rawStatus, search: rawSearch, pageSize: rawPageSize } = raw;
  if (Array.isArray(rawPage) || Array.isArray(rawStatus) || Array.isArray(rawSearch) || Array.isArray(rawPageSize)) {
    return ADMIN_POST_CANONICAL_QUERY;
  }
  if (rawPage !== undefined && !STRICT_PAGE_PATTERN.test(rawPage)) return ADMIN_POST_CANONICAL_QUERY;
  if (rawStatus !== undefined && !(STATUS_FILTERS as readonly string[]).includes(rawStatus)) {
    return ADMIN_POST_CANONICAL_QUERY;
  }
  if (rawPageSize !== undefined && !PAGE_SIZE_VALUES.has(rawPageSize)) return ADMIN_POST_CANONICAL_QUERY;
  const search = rawSearch?.trim() ?? "";
  if (search.length > ADMIN_POST_SEARCH_MAX_LENGTH || UNSAFE_TEXT_PATTERN.test(search)) {
    return ADMIN_POST_CANONICAL_QUERY;
  }
  return {
    page: rawPage !== undefined ? Number(rawPage) : 1,
    status: rawStatus !== undefined ? (rawStatus as AdminPostStatusFilter) : "ALL",
    search,
    pageSize: rawPageSize !== undefined ? (Number(rawPageSize) as 10 | 20 | 50) : 10,
  };
}

export function toAdminPostTransportQuery(
  query: AdminPostNormalizedQuery,
  type?: "BERITA" | "PENGUMUMAN" | "KOLOM",
) {
  const transportQuery = {
    page: query.page,
    pageSize: query.pageSize,
    status: query.status,
    search: query.search,
    sort: ADMIN_POST_SORT,
  } as const;
  return type ? { ...transportQuery, type } : transportQuery;
}

export function buildAdminPostHref(
  status: AdminPostStatusFilter,
  page: number,
  basePath = "/admin/posts",
  extra: { search?: string; pageSize?: 10 | 20 | 50 } = {},
): string {
  const params = new URLSearchParams();
  if (status !== "ALL") params.set("status", status);
  if (extra.search) params.set("search", extra.search);
  if (extra.pageSize && extra.pageSize !== 10) params.set("pageSize", String(extra.pageSize));
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
```

- [ ] **Step 4: Thread `search` + `pageSize` through the tab + pagination components**

`post-filter-tabs.tsx`: add optional props `search?: string; pageSize?: 10 | 20 | 50`, pass them to `buildAdminPostHref(filter, 1, basePath, { search, pageSize })`.
`post-pagination.tsx`: same props; pass to each `buildAdminPostHref(status, <page>, basePath, { search, pageSize })` call.

- [ ] **Step 5: Fix the frozen-transport-schema mismatch**

`src/lib/content/post-admin-transport.ts` — confirm `listAdminPosts` parses via `AdminPostListQuerySchema`, which already accepts `pageSize ∈ {10,20,50}` and a non-empty `search`. Run:

Run: `npx vitest run tests/m3/runtime/post-admin-transport.test.ts tests/m3/contracts/post-admin-transport-contract.test.ts`
Expected: PASS. If a runtime test hard-codes `pageSize: 20` in a transport-query literal, update it to `10`.

- [ ] **Step 6: Run the post admin test file**

Run: `npx vitest run tests/m3/ui/admin-post-list.test.tsx`
Expected: PASS. The existing `toAdminPostTransportQuery` test that asserts `search: ""` / fixed sort must be updated to expect `search` passthrough and `pageSize` from the query.

- [ ] **Step 7: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint && npm run test
git add src/components/admin/posts/post-query.ts src/components/admin/posts/post-filter-tabs.tsx src/components/admin/posts/post-pagination.tsx tests/m3
git commit -m "feat(admin): Posts query accepts search + pageSize, default 10

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Wire search + size select into Berita / Kolom / Pengumuman pages

**Files:**
- Modify: `src/app/[locale]/admin/posts/page.tsx`, `src/app/[locale]/admin/kolom/page.tsx`, `src/app/[locale]/admin/pengumuman/page.tsx`
- Modify: `messages/{id,en,ar}.json` — add to `AdminPostList`, `AdminColumnList`, `AdminAnnouncementList`: `searchPlaceholder`, `searchAriaLabel`, `searchAction`, `searchClear`, `searchEmpty` (`{title, description}`), `pageSizeLabel`.
- Modify: `e2e/m3/admin-post-list-browse.spec.ts` — page-size assertions.
- Test: `tests/m3/ui/admin-post-list.test.tsx` (page-level wiring assertions via `readFileSync`).

**Interfaces:**
- Consumes: `AdminListSearch`, `AdminPageSizeSelect` (Tasks 1–2); `buildAdminPostHref`, `normalizeAdminPostQuery`, `ADMIN_POST_SEARCH_MAX_LENGTH` (Task 3).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

Add to `tests/m3/ui/admin-post-list.test.tsx`:

```ts
it.each([
  ["src/app/[locale]/admin/posts/page.tsx", "AdminPostList"],
  ["src/app/[locale]/admin/kolom/page.tsx", "AdminColumnList"],
  ["src/app/[locale]/admin/pengumuman/page.tsx", "AdminAnnouncementList"],
])("%s renders search + page-size controls", (relPath) => {
  const source = readFileSync(path.join(process.cwd(), relPath), "utf8");
  expect(source).toContain("AdminListSearch");
  expect(source).toContain("AdminPageSizeSelect");
});

it("defines the search + page-size keys in id, en, and ar for all three post namespaces", () => {
  for (const locale of ["id", "en", "ar"]) {
    const messages = JSON.parse(readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8"));
    for (const ns of ["AdminPostList", "AdminColumnList", "AdminAnnouncementList"]) {
      for (const key of ["searchPlaceholder", "searchAriaLabel", "searchAction", "searchClear", "pageSizeLabel"]) {
        expect(messages[ns][key], `${locale}.${ns}.${key}`).toBeTruthy();
      }
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/m3/ui/admin-post-list.test.tsx -t "search + page-size"`
Expected: FAIL.

- [ ] **Step 3: Add the i18n keys**

To each of `AdminPostList` / `AdminColumnList` / `AdminAnnouncementList` in all three locale files (values shown for `AdminPostList`; adjust the noun for Kolom = "sorotan akademik" / Announcement = "pengumuman"):

```json
"searchPlaceholder": "Cari judul berita…",
"searchAriaLabel": "Cari berita",
"searchAction": "Cari",
"searchClear": "Bersihkan",
"searchEmpty": {
  "title": "Tidak ada hasil",
  "description": "Tidak ada berita yang cocok dengan pencarian Anda."
},
"pageSizeLabel": "Baris per halaman"
```

en: "Search news titles…" / "Search news" / "Search" / "Clear" / "No results" / "No news matches your search." / "Rows per page".
ar: "ابحث في عناوين الأخبار…" / "ابحث في الأخبار" / "بحث" / "مسح" / "لا توجد نتائج" / "لا توجد أخبار تطابق بحثك." / "صفوف لكل صفحة".

- [ ] **Step 4: Wire the pages**

In each page, after `normalizeAdminPostQuery`, between the filter tabs and the total-count line:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <AdminListSearch
    initialSearch={query.search}
    maxLength={ADMIN_POST_SEARCH_MAX_LENGTH}
    buildHref={(search) => buildAdminPostHref(query.status, 1, BASE_PATH, { search, pageSize: query.pageSize })}
    labels={{
      placeholder: t("searchPlaceholder"),
      ariaLabel: t("searchAriaLabel"),
      action: t("searchAction"),
      clear: t("searchClear"),
    }}
  />
  <AdminPageSizeSelect
    value={query.pageSize}
    label={t("pageSizeLabel")}
    optionLabel={(n) => String(n)}
    buildHref={(size) => buildAdminPostHref(query.status, 1, BASE_PATH, { search: query.search, pageSize: size })}
  />
</div>
```

`BASE_PATH` is `"/admin/posts"` / `"/admin/kolom"` / `"/admin/pengumuman"`. Pass `search={query.search}` and `pageSize={query.pageSize}` to `<AdminPostFilterTabs>` and `<AdminPostPagination>`. When `result.data.items.length === 0` and `query.search !== ""`, render `<AdminPostStateNotice variant="empty" title={t("searchEmpty.title")} description={t("searchEmpty.description")} />` instead of the plain empty notice.

- [ ] **Step 5: Update the e2e spec**

`e2e/m3/admin-post-list-browse.spec.ts`: the ADMIN fixture builds 26 Berita. With page size 10: "ADMIN page 1 shows 10 rows" (was 20), "ADMIN page 2 shows 10 rows", "ADMIN page 3 shows 6 rows". Update the three assertions and the EDITOR-A "15 < 20 → no pagination" test to "15 > 10 → pagination present, page 1 shows 10, page 2 shows 5". Add a test: typing "wisuda" into the search field narrows the list and the URL gains `?search=wisuda`.

- [ ] **Step 6: Run tests**

Run: `npm run test` then `npx playwright test e2e/m3/admin-post-list-browse.spec.ts` (or note skip if no DB).
Expected: PASS.

- [ ] **Step 7: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "src/app/[locale]/admin/posts/page.tsx" "src/app/[locale]/admin/kolom/page.tsx" "src/app/[locale]/admin/pengumuman/page.tsx" messages/ e2e/m3/admin-post-list-browse.spec.ts tests/m3/ui/admin-post-list.test.tsx
git commit -m "feat(admin): search + page-size controls on Berita/Kolom/Pengumuman

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Halaman — `pageSize`, default 10, size select

**Files:**
- Modify: `src/components/admin/pages/page-query.ts`
- Modify: `src/components/admin/pages/page-pagination.tsx`, `src/components/admin/pages/page-filter-tabs.tsx`, `src/components/admin/pages/page-sort-tabs.tsx` (forward `pageSize` in every `buildAdminPageHref` call)
- Modify: `src/app/[locale]/admin/pages/page.tsx`
- Modify: `messages/{id,en,ar}.json` — `AdminPageList.pageSizeLabel`, `AdminPageList.searchClear` (add if missing).
- Test: `tests/m4/ui/page-admin/*` (the file covering `normalizeAdminPageQuery` / `buildAdminPageHref`)

**Interfaces:**
- Produces:
  ```ts
  export const ADMIN_PAGE_PAGE_SIZE = 10; // was 20
  export type AdminPageNormalizedQuery = { page; status; search; sort; pageSize: 10 | 20 | 50 };
  export function buildAdminPageHref(parts: { status?; search?; sort?; page?; pageSize?: 10 | 20 | 50 }): string;
  ```

- [ ] **Step 1: Write the failing test**

In the page-query test file:

```ts
it("defaults page size to 10 and accepts 10/20/50 from the URL", () => {
  expect(normalizeAdminPageQuery({}).pageSize).toBe(10);
  expect(normalizeAdminPageQuery({ pageSize: "50" }).pageSize).toBe(50);
});
it("collapses the whole query when pageSize is a free integer", () => {
  expect(normalizeAdminPageQuery({ status: "DRAFT", pageSize: "40" })).toEqual({
    page: 1, status: "ALL", search: "", sort: "UPDATED_DESC", pageSize: 10,
  });
});
it("serializes a non-default page size", () => {
  expect(buildAdminPageHref({ pageSize: 20 })).toBe("/admin/pages?pageSize=20");
  expect(buildAdminPageHref({ pageSize: 10 })).toBe("/admin/pages");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/m4/ui/page-admin -t "page size"`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `page-query.ts`: add `"pageSize"` to `ALLOWED_QUERY_KEYS`; add `PAGE_SIZE_VALUES` set + the array-check + the `!PAGE_SIZE_VALUES.has(rawPageSize)` fail-closed branch; `ADMIN_PAGE_PAGE_SIZE = 10`; canonical `pageSize: 10`; return `pageSize: rawPageSize !== undefined ? (Number(rawPageSize) as 10|20|50) : 10`. In `buildAdminPageHref`: add `pageSize` to `AdminPageHrefParts`, serialize `if (pageSize && pageSize !== 10) params.set("pageSize", String(pageSize))`. In `toAdminPageTransportQuery`: `pageSize: query.pageSize` (already `as 10|20|50`). Update `page-pagination.tsx` / `page-filter-tabs.tsx` / `page-sort-tabs.tsx` to pass `pageSize: query.pageSize` in their `buildAdminPageHref` calls (add a `pageSize` prop to each, plumbed from the page).

- [ ] **Step 4: Wire the page**

`src/app/[locale]/admin/pages/page.tsx`: add `<AdminPageSizeSelect value={query.pageSize} label={t("pageSizeLabel")} optionLabel={String} buildHref={(size) => buildAdminPageHref({ status: query.status, search: query.search, sort: query.sort, page: 1, pageSize: size })} />` next to `<AdminPageSearch>`. Pass `pageSize={query.pageSize}` to the tabs and pagination.

- [ ] **Step 5: i18n**

Add `AdminPageList.pageSizeLabel` (id "Baris per halaman", en "Rows per page", ar "صفوف لكل صفحة") and `AdminPageList.searchClear` if not present (id "Bersihkan", en "Clear", ar "مسح") to all three files.

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: PASS. Update any pages e2e "20 per page" assertion.

- [ ] **Step 7: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add src/components/admin/pages "src/app/[locale]/admin/pages/page.tsx" messages/ tests/m4/ui/page-admin
git commit -m "feat(admin): Halaman list page-size selector, default 10

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Public-content query — `pageSize`, default 10

**Files:**
- Modify: `src/components/admin/public-content/public-content-query.ts`
- Test: `tests/m4/ui/public-content/public-content-query.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const PUBLIC_CONTENT_ADMIN_PAGE_SIZE = 10; // was 20
  export type PublicContentAdminNormalizedQuery = { …; pageSize: 10 | 20 | 50 };
  export function buildPublicContentAdminHref(
    resource: string,
    parts: { visibility?; search?; direction?; page?; pageSize?: 10 | 20 | 50 },
  ): string;
  ```
- Consumes: nothing new. `toPublicContentAdminTransportQuery` already emits `pageSize: query.pageSize`; only the source value changes.

- [ ] **Step 1: Write the failing test**

```ts
it("defaults page size to 10 and accepts the enum values", () => {
  expect(normalizePublicContentAdminQuery({}, RESOURCE).pageSize).toBe(10);
  expect(normalizePublicContentAdminQuery({ pageSize: "50" }, RESOURCE).pageSize).toBe(50);
});
it("collapses when pageSize is not an allowed literal", () => {
  expect(normalizePublicContentAdminQuery({ visibility: "PUBLIC", pageSize: "25" }, RESOURCE))
    .toMatchObject({ visibility: "ALL", pageSize: 10 });
});
it("serializes a non-default page size in the href", () => {
  expect(buildPublicContentAdminHref("kerjasama", { pageSize: 20 }))
    .toBe("/admin/kerjasama?pageSize=20");
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/m4/ui/public-content/public-content-query.test.ts -t "page size"`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add `"pageSize"` to `ALLOWED_QUERY_KEYS`; add `PAGE_SIZE_VALUES`; add `rawPageSize` to the destructure + `Array.isArray(rawPageSize)` guard + `if (rawPageSize !== undefined && !PAGE_SIZE_VALUES.has(rawPageSize)) return {...CANONICAL_QUERY, resource}`; `PUBLIC_CONTENT_ADMIN_PAGE_SIZE = 10`; `CANONICAL_QUERY.pageSize = 10`; return `pageSize: rawPageSize !== undefined ? (Number(rawPageSize) as 10|20|50) : 10` (replacing the hard-coded `pageSize: 20`). In `buildPublicContentAdminHref`: add `pageSize` param, `if (pageSize && pageSize !== 10) params.set("pageSize", String(pageSize))`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/m4/ui/public-content tests/m4/runtime/public-content-loaders.test.ts`
Expected: PASS. The existing chain test (`"accepts the query the admin list pages actually build"`) still passes because `AdminPostListQuerySchema` / `PublicContentAdminListQuerySchema` accept `pageSize: 10`.

- [ ] **Step 5: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint && npm run test
git add src/components/admin/public-content/public-content-query.ts tests/m4/ui/public-content
git commit -m "feat(admin): public-content query pageSize, default 10

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Wire search + size select into the 10 public-content pages

**Files:**
- Modify: the 10 `src/app/[locale]/admin/{agenda,album,beasiswa,dokumen,faq,kegiatan,kerjasama,layanan,prestasi,testimoni}/page.tsx`
- Modify: `messages/{id,en,ar}.json` — `AdminPublicContent` namespace: `searchClear`, `pageSizeLabel`, `searchEmpty` (`{title, description}`). (`searchPlaceholder`/`searchAriaLabel`/`searchAction` already exist.)
- Test: `tests/m4/ui/public-content/admin-list-routes.test.ts` (extend)

**Interfaces:**
- Consumes: `AdminListSearch`, `AdminPageSizeSelect`, `buildPublicContentAdminHref`, `PUBLIC_CONTENT_SEARCH_MAX_LENGTH`.

- [ ] **Step 1: Write the failing test**

Extend `admin-list-routes.test.ts`:

```ts
it.each(RESOURCES)("%s: uses the shared search + page-size controls", (resource) => {
  const source = readFileSync(path.join(appDir, resource, "page.tsx"), "utf8");
  expect(source).toContain("AdminListSearch");
  expect(source).toContain("AdminPageSizeSelect");
  expect(source).not.toContain('method="GET"'); // plain form removed
});

it("defines searchClear + pageSizeLabel for AdminPublicContent in all locales", () => {
  for (const locale of ["id", "en", "ar"]) {
    const m = JSON.parse(readFileSync(path.join(process.cwd(), `messages/${locale}.json`), "utf8"));
    expect(m.AdminPublicContent.searchClear).toBeTruthy();
    expect(m.AdminPublicContent.pageSizeLabel).toBeTruthy();
  }
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/m4/ui/public-content/admin-list-routes.test.ts`
Expected: FAIL.

- [ ] **Step 3: i18n**

Add to `AdminPublicContent` in all three files: `searchClear` (id "Bersihkan"), `pageSizeLabel` (id "Baris per halaman"), `searchEmpty.title` (id "Tidak ada hasil"), `searchEmpty.description` (id "Tidak ada konten yang cocok dengan pencarian Anda."). en/ar equivalents.

- [ ] **Step 4: Replace the form in each of the 10 pages**

Delete the `<form method="GET">…</form>` block. In its place:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <AdminListSearch
    initialSearch={query.search}
    maxLength={PUBLIC_CONTENT_SEARCH_MAX_LENGTH}
    buildHref={(search) =>
      buildPublicContentAdminHref(RESOURCE_SLUG, {
        visibility: query.visibility, direction: query.direction, search, pageSize: query.pageSize, page: 1,
      })}
    labels={{
      placeholder: t("searchPlaceholder"),
      ariaLabel: t("searchAriaLabel"),
      action: t("searchAction"),
      clear: t("searchClear"),
    }}
  />
  <AdminPageSizeSelect
    value={query.pageSize}
    label={t("pageSizeLabel")}
    optionLabel={String}
    buildHref={(size) =>
      buildPublicContentAdminHref(RESOURCE_SLUG, {
        visibility: query.visibility, direction: query.direction, search: query.search, pageSize: size, page: 1,
      })}
  />
</div>
```

`RESOURCE_SLUG` is the route segment (`"agenda"`, `"kerjasama"`, …) — each page already knows its slug (via `PUBLIC_CONTENT_SLUG_MAP` or a local const). In the visibility-tab links and the `<PublicContentPagination buildHref={…}>` prop, add `pageSize: query.pageSize` (and keep `search`). When `items.length === 0 && query.search !== ""`, swap the empty notice for the `searchEmpty` copy.

- [ ] **Step 5: Run tests**

Run: `npm run test`
Expected: PASS. Update any public-content e2e "20 per page" assertion.

- [ ] **Step 6: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add "src/app/[locale]/admin/agenda/page.tsx" "src/app/[locale]/admin/album/page.tsx" "src/app/[locale]/admin/beasiswa/page.tsx" "src/app/[locale]/admin/dokumen/page.tsx" "src/app/[locale]/admin/faq/page.tsx" "src/app/[locale]/admin/kegiatan/page.tsx" "src/app/[locale]/admin/kerjasama/page.tsx" "src/app/[locale]/admin/layanan/page.tsx" "src/app/[locale]/admin/prestasi/page.tsx" "src/app/[locale]/admin/testimoni/page.tsx" messages/ tests/m4/ui/public-content/admin-list-routes.test.ts
git commit -m "feat(admin): shared search + page-size controls on all 10 public-content lists

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Taksonomi — search, pagination, size select

**Files:**
- Create: `src/components/admin/taxonomy/taxonomy-list-query.ts` (href + canonical helpers) + test
- Modify: `src/contracts/admin-foundation.ts` — `normalizeTaxonomySearchParams`: default `pageSize` `20` → `10` (one literal, line ~+3 of the function). **This is the only contract touch; the `RawTaxonomyListQuerySchema` / `TaxonomyListQuerySchema` already accept `search` and `pageSize ∈ {10,20,50}`.**
- Modify: `src/app/[locale]/admin/taksonomi/page.tsx`
- Modify: `messages/{id,en,ar}.json` — `AdminTaxonomy`: `searchPlaceholder`, `searchAriaLabel`, `searchAction`, `searchClear`, `pageSizeLabel`, `searchEmpty` (`{title,description}`), `pagination` (`{ariaLabel, previous, next, pageStatus, goToPage}`).
- Test: `tests/m4/ui/taxonomy-admin-form.test.tsx` or a new `tests/m4/ui/taxonomy-list.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // taxonomy-list-query.ts
  export const TAXONOMY_SEARCH_MAX_LENGTH = 120;
  export function buildTaxonomyHref(parts: {
    kind?: "ALL" | "CATEGORY" | "TAG"; search?: string; page?: number; pageSize?: 10 | 20 | 50;
  }): string; // "/admin/taksonomi?…"
  export function totalPagesFor(total: number, pageSize: number): number;
  export function buildPaginationItems(current: number, totalPages: number): Array<number | "ellipsis">;
  ```
  (Copy `totalPagesFor` / `buildPaginationItems` verbatim from `post-query.ts` — same windowed algorithm.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/m4/ui/taxonomy-list.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const { buildTaxonomyHref, buildPaginationItems } = await import(
  "@/components/admin/taxonomy/taxonomy-list-query"
);

describe("buildTaxonomyHref", () => {
  it("keeps the canonical view bare and serialises the rest", () => {
    expect(buildTaxonomyHref({})).toBe("/admin/taksonomi");
    expect(buildTaxonomyHref({ kind: "TAG", search: "moderasi", page: 2, pageSize: 20 }))
      .toBe("/admin/taksonomi?kind=TAG&search=moderasi&pageSize=20&page=2");
    expect(buildTaxonomyHref({ pageSize: 10 })).toBe("/admin/taksonomi");
  });
});

describe("taxonomy list page", () => {
  it("renders search + pagination + page-size controls", () => {
    const src = readFileSync(path.join(process.cwd(), "src/app/[locale]/admin/taksonomi/page.tsx"), "utf8");
    expect(src).toContain("AdminListSearch");
    expect(src).toContain("AdminPageSizeSelect");
    expect(src).toMatch(/buildTaxonomyHref/);
  });
  it("defaults the normalizer page size to 10", () => {
    const src = readFileSync(path.join(process.cwd(), "src/contracts/admin-foundation.ts"), "utf8");
    expect(src).toMatch(/pageSize:\s*raw\.pageSize === undefined \? 10 : Number\(raw\.pageSize\)/);
  });
});

it("windows the taxonomy pagination like the other lists", () => {
  expect(buildPaginationItems(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/m4/ui/taxonomy-list.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper + contract literal**

Create `taxonomy-list-query.ts` with `buildTaxonomyHref` (params: kind≠"ALL", search, pageSize≠10, page>1 — serialised in that order), plus the copied `totalPagesFor` / `buildPaginationItems`. In `src/contracts/admin-foundation.ts`, change the `normalizeTaxonomySearchParams` body line `pageSize: raw.pageSize === undefined ? 20 : Number(raw.pageSize)` → `? 10 :`.

- [ ] **Step 4: Wire the page**

`src/app/[locale]/admin/taksonomi/page.tsx`:
- Keep the existing `try/catch` around `normalizeTaxonomySearchParams`; on catch, the fallback object's `pageSize` becomes `10`.
- After the kind-filter `<nav>`, add the `AdminListSearch` + `AdminPageSizeSelect` row (mirror Task 7's markup) using `buildTaxonomyHref` and `t("searchPlaceholder")` etc.
- After the `<ul>`, add a pagination `<nav>`. Reuse the markup shape from `src/components/admin/public-content/public-content-pagination.tsx` inline, or extract a `TaxonomyPagination` component that takes `current`, `totalPages`, `buildHref: (page) => string`, and the label strings. Feed it `result.data.page.page` / `result.data.page.totalPages` and `(page) => buildTaxonomyHref({ kind: query.kind, search: query.search, pageSize: query.pageSize, page })`.
- When `result.data.items.length === 0 && query.search !== ""`, render the `searchEmpty` copy.

- [ ] **Step 5: i18n**

Add the `AdminTaxonomy` keys listed above to all three locale files (real Arabic).

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: PASS. Update `tests/m4/contracts/*` if a test asserts the taxonomy default pageSize is 20.

- [ ] **Step 7: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add src/components/admin/taxonomy "src/app/[locale]/admin/taksonomi/page.tsx" src/contracts/admin-foundation.ts messages/ tests/m4/ui/taxonomy-list.test.ts
git commit -m "feat(admin): Taksonomi list search + pagination + page-size, default 10

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Fasilitas — pagination, size select, shared search

**Files:**
- Create: `src/components/admin/facility/facility-list-query.ts` + test (same shape as Task 8's helper)
- Modify: `src/features/facility/domain.ts` — `normalizeFacilitySearchParams`: default `pageSize` `20` → `10` (one literal). The raw + `FacilityListQuerySchema` already accept `search` (max 120) and `pageSize ∈ {10,20,50}`.
- Modify: `src/app/[locale]/admin/fasilitas/page.tsx` — swap the plain `<form method="GET">` for `AdminListSearch` (keep the `active` select as a sibling filter row), add pagination + `AdminPageSizeSelect`.
- Modify: `messages/{id,en,ar}.json` — `AdminFacility`: `searchClear`, `pageSizeLabel`, `searchEmpty` (`{title,description}`), `pagination` (`{ariaLabel, previous, next, pageStatus, goToPage}`). (`searchPlaceholder`/`searchAriaLabel`/`searchAction` exist.)
- Test: new `tests/m4/ui/facility-list.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const FACILITY_SEARCH_MAX_LENGTH = 120;
  export function buildFacilityHref(parts: {
    active?: "ALL" | "ACTIVE" | "INACTIVE"; search?: string; page?: number; pageSize?: 10 | 20 | 50;
  }): string; // "/admin/fasilitas?…"
  export const totalPagesFor; export const buildPaginationItems; // copied verbatim
  ```

- [ ] **Step 1: Write the failing test**

```ts
// tests/m4/ui/facility-list.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const { buildFacilityHref } = await import("@/components/admin/facility/facility-list-query");

describe("buildFacilityHref", () => {
  it("serialises active/search/pageSize/page, canonical stays bare", () => {
    expect(buildFacilityHref({})).toBe("/admin/fasilitas");
    expect(buildFacilityHref({ active: "ACTIVE", search: "lab", pageSize: 50, page: 3 }))
      .toBe("/admin/fasilitas?active=ACTIVE&search=lab&pageSize=50&page=3");
  });
});

describe("facility list page", () => {
  it("uses the shared controls and drops the plain GET form", () => {
    const src = readFileSync(path.join(process.cwd(), "src/app/[locale]/admin/fasilitas/page.tsx"), "utf8");
    expect(src).toContain("AdminListSearch");
    expect(src).toContain("AdminPageSizeSelect");
    expect(src).not.toContain('name="search"'); // raw input gone
  });
  it("defaults the facility normalizer page size to 10", () => {
    const src = readFileSync(path.join(process.cwd(), "src/features/facility/domain.ts"), "utf8");
    expect(src).toMatch(/pageSize:\s*raw\.pageSize === undefined \? 10 : Number\(raw\.pageSize\)/);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run tests/m4/ui/facility-list.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement helper + contract literal**

Create `facility-list-query.ts` (mirror `taxonomy-list-query.ts`). In `src/features/facility/domain.ts`, `normalizeFacilitySearchParams`: `pageSize: raw.pageSize === undefined ? 20 : …` → `? 10 :`.

- [ ] **Step 4: Wire the page**

- Replace the `<form method="GET">` block. Render the `active` `<select>` inside a small GET-less filter row of `<Link>`s **or** keep it as a controlled client control — simplest: keep a tiny `<form method="GET">` that only carries `active` + hidden `search`/`pageSize`, OR move `active` into `buildFacilityHref` links. Prefer: a row of three `active` filter `<Link href={buildFacilityHref({ active: v, search: query.search, pageSize: query.pageSize })}>` chips (matches the taksonomi kind-chip pattern), then `<AdminListSearch>` + `<AdminPageSizeSelect>` beneath.
- Add pagination `<nav>` after the `<ul>`, fed by `result.data.page` and `(page) => buildFacilityHref({ active, search: query.search, pageSize: query.pageSize, page })`.
- `searchEmpty` copy when `items.length === 0 && query.search !== ""`.

- [ ] **Step 5: i18n**

Add the `AdminFacility` keys to all three locale files.

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: PASS. Update `tests/**` facility assertions expecting pageSize 20.

- [ ] **Step 7: typecheck + lint + commit**

```bash
npm run typecheck && npm run lint
git add src/components/admin/facility "src/app/[locale]/admin/fasilitas/page.tsx" src/features/facility/domain.ts messages/ tests/m4/ui/facility-list.test.ts
git commit -m "feat(admin): Fasilitas list pagination + page-size + shared search, default 10

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Cross-cutting verification

**Files:**
- Modify: any remaining e2e spec / unit test with a hard-coded page size or derived count.
- Test: new `tests/m4/ui/admin-lists-consistency.test.ts`

**Interfaces:** none.

- [ ] **Step 1: Write the consistency test**

```ts
// tests/m4/ui/admin-lists-consistency.test.ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PAGES = [
  "posts", "kolom", "pengumuman", "pages",
  "agenda", "album", "beasiswa", "dokumen", "faq", "kegiatan",
  "kerjasama", "layanan", "prestasi", "testimoni",
  "taksonomi", "fasilitas",
];
const appDir = path.join(process.cwd(), "src/app/[locale]/admin");

describe("every in-scope admin list has search + page-size + pagination", () => {
  it.each(PAGES)("%s", (slug) => {
    const src = readFileSync(path.join(appDir, slug, "page.tsx"), "utf8");
    expect(src, `${slug}: search`).toContain("AdminListSearch");
    expect(src, `${slug}: page-size`).toContain("AdminPageSizeSelect");
    expect(src, `${slug}: pagination`).toMatch(/Pagination|pagination/);
  });
});

describe("default page size is 10 across every list query module", () => {
  it.each([
    ["src/components/admin/posts/post-query.ts", "ADMIN_POST_PAGE_SIZE = 10"],
    ["src/components/admin/pages/page-query.ts", "ADMIN_PAGE_PAGE_SIZE = 10"],
    ["src/components/admin/public-content/public-content-query.ts", "PUBLIC_CONTENT_ADMIN_PAGE_SIZE = 10"],
  ])("%s", (rel, needle) => {
    expect(readFileSync(path.join(process.cwd(), rel), "utf8")).toContain(needle);
  });
});
```

- [ ] **Step 2: Run the full unit suite**

Run: `npm run test`
Expected: PASS. Fix every remaining failure (mostly `pageSize: 20` literals and row-count expectations).

- [ ] **Step 3: Run the e2e admin suite where a DB is available**

Run: `npx playwright test e2e/m3 e2e/m4`
Expected: PASS, or a clean skip with `DATABASE_URL` unset — record which in the report.

- [ ] **Step 4: Adversarial query sweep — manual check via one script**

Write a throwaway `scripts/diag-query-sweep.ts` that, for each family's normalizer, asserts these all return the family canonical (page 1, no search, pageSize 10): `{ pageSize: "0" }`, `{ pageSize: "999" }`, `{ pageSize: ["10","20"] }`, `{ search: ["a","b"] }`, `{ search: "x".repeat(200) }`, `{ evil: "1" }`. Print PASS/FAIL per case. Delete the script after.

- [ ] **Step 5: i18n parity — run every namespace parity test**

Run: `npx vitest run -t "same"` (catches the `*List` / `*Editor` "same keys in id/en/ar" tests)
Expected: PASS.

- [ ] **Step 6: typecheck + lint + build + commit**

```bash
npm run typecheck && npm run lint && npm run build
git add tests/ e2e/ messages/
git commit -m "test(admin): cross-list search/pagination/page-size consistency + fixture updates

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Goals 1–4 (one visual language for search/pagination, every list has search + size selector + pagination, default 10, no contract/schema changes beyond the two one-literal normalizer defaults) → Tasks 1–9. *Deviation from spec: this plan does NOT convert the card lists (Halaman, public-content, Taksonomi, Fasilitas) to tables — the spec's table conversion is deferred. Flag this to the user at plan review.*
- Goal 5 (fail-closed preserved) → Tasks 3, 5, 6, 8, 9 each add the `pageSize`/`search` members under the existing whole-record collapse; Task 10 Step 4 sweeps adversarial inputs.
- Goal 6 (i18n parity, real Arabic, RTL-safe) → every wiring task adds keys to all three files; Task 10 Step 5 runs the parity tests; Tasks 1–2 assert logical-direction utilities.
- Non-goals respected: no pagination-component unification (each family keeps its own), Media out (never referenced), no sort UI added beyond Halaman's existing tabs.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Task 7/8/9 markup is shown in full for one page and explicitly "mirror Task N's markup" for the repeats — acceptable because the markup block *is* printed in Task 7 Step 4 and the repeats are mechanical per-file application of that exact block.

**Type consistency:** `AdminPageSize` = `10 | 20 | 50` used consistently. `buildXHref` extra-params object uses `{ search?, pageSize? }` in every family. `totalPagesFor` / `buildPaginationItems` are copied verbatim (same signature) into `taxonomy-list-query.ts` / `facility-list-query.ts`. `AdminListSearch` `labels` object shape (`placeholder/ariaLabel/action/clear`) is identical across Tasks 2, 4, 7, 8, 9.

**Open decisions for plan review:**
1. Table conversion of the four card-list families is deferred (see spec-coverage deviation). Confirm that's acceptable for this pass.
2. Tasks 8 & 9 each change one literal in a contract/feature file (`admin-foundation.ts`, `facility/domain.ts`) — `pageSize` default 20→10. Per `AGENTS.md` this is contract-lane; the change is a single number and the schemas already permit 10. Confirm proceed on this branch vs. a GPT contract task.
