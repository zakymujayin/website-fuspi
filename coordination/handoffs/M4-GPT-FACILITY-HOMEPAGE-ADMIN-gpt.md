# Handoff — M4-GPT-FACILITY-HOMEPAGE-ADMIN — gpt

- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: 1c3df17ed99cdbe6c04f24b20a30836e3d6f518a
- Head SHA: final branch HEAD (`git rev-parse HEAD`)

## Result

Facilities shown on the homepage now come from the `Facility` backend instead
of the legacy `fasilitas-kampus` album shortcut. Admins can manage facilities
at `/admin/fasilitas`, with create/edit/delete forms backed by the existing
facility domain service.

The public facilities profile page also uses the same `Facility` public query,
so homepage cards and the "Semua Fasilitas" destination no longer diverge.

Follow-up bug fix in the same branch:

- Added the missing `FlowLine` public ornament component referenced by
  homepage sections, fixing `Module not found: Can't resolve
  '@/components/public/flow-line'`.
- Fixed the admin home slider form so changing only the hero image preserves
  all ID/EN/AR translation state instead of submitting empty hidden-tab
  fields. The CTA helper now treats bare host names as HTTPS external URLs,
  while still leaving the server-side public URL validation intact.

Second follow-up bug fix in the same branch:

- Fixed legacy media previews in the Berita editor and homepage hero slider
  editor. Admin edit views now use an admin-only image preview that accepts
  older public WebP media with missing `alt`, `width`, or `height` metadata,
  while public media contracts remain strict.
- Updated the shared admin thumbnail resolver so old image media still renders
  through a safe local `/uploads/...` path instead of showing the placeholder
  only because dimensions are missing.

Third follow-up feature in the same branch:

- Added a dedicated Sorotan Akademik admin surface at `/admin/kolom`,
  `/admin/kolom/new`, and `/admin/kolom/[postId]/edit`.
- Reused the Post editor/runtime with a new `KOLOM` mode, including required
  source labels for `DEKAN`, `DOSEN`, and `MAHASISWA`.
- Added column-specific create/update/autosave/publish/delete command envelopes
  so Kolom mutations cannot accidentally target Berita rows.
- Added a sidebar item and ID/EN/AR admin copy for Sorotan Akademik.
- Revalidated homepage, `/kolom`, Berita, and both admin lists after post
  mutations.

Fourth follow-up cleanup in the same branch:

- Removed the two seeded Sorotan Akademik demo writings shown in the user's
  screenshot:
  `menumbuhkan-nalar-kritis-mahasiswa` and
  `tafsir-kontekstual-di-era-digital`.
- Added a targeted seed cleanup so those two old demo rows are deleted on the
  next seed instead of being re-created.
- Deleted the two matching `KOLOM` rows from the local database; the command
  reported `{"deleted":2}` and a follow-up query reported `{"remaining":[]}`.
- Added admin breadcrumb/menu labels for the `kolom` route segment so admin UI
  shows Sorotan Akademik instead of the raw route name.

Fifth follow-up bug fix in the same branch:

- Added pagination support to admin image pickers so older Media Library images
  can be selected instead of only the first 24 newest images.
- Covered Berita cover/gallery pickers, page hero picker, and the shared home
  media picker used by homepage slider, homepage sections, homepage settings,
  and facility forms.
- Added ID/EN/AR `loadMore` labels and regression coverage for the shared
  picker pagination helper.

## Files changed

- Added `FACILITY` home section key, migration, seed copy, and contract max
  section count update.
- Added facility admin routes under `src/app/[locale]/admin/fasilitas/**`.
- Added facility server action and editor form under
  `src/components/admin/facility/**`.
- Wired admin navigation and ID/EN/AR messages.
- Updated homepage and `/profil/fasilitas` public routes to read `Facility`
  rows.
- Removed the album-specific homepage facility loader from
  `src/features/home-nav/public-query.ts`.
- Added facility contract/runtime tests.
- Added `src/components/public/flow-line.tsx`.
- Added `src/components/admin/home-nav/home-slider-editor-payload.ts` and
  `tests/m4/ui/home-slider-editor-form.test.ts` for slider payload regression
  coverage.
- Added admin-only legacy media preview handling in
  `src/features/public-content/shared.ts`, `src/contracts/post-admin.ts`,
  `src/lib/content/post-admin-transport.ts`, and
  `src/features/home-nav/admin-detail.ts`.
- Updated admin thumbnail regression coverage for legacy media without image
  dimensions.
- Added Sorotan Akademik admin routes under `src/app/[locale]/admin/kolom/**`.
- Extended shared Post admin UI components to support `KOLOM` mode while
  preserving the existing Berita defaults.
- Removed the two old Sorotan Akademik demo rows from `prisma/seed.ts`.
- Added `src/components/admin/media/media-picker-pagination.ts` and wired it
  into admin image pickers for Berita, pages, homepage settings/slider/sections,
  and facilities.

## Contract/schema/migration impact

- New migration:
  `prisma/migrations/20260817043000_add_facility_home_section_key/migration.sql`
  adds `FACILITY` to PostgreSQL enum `HomeSectionKey`.
- `HomeSectionKeySchema` now includes `FACILITY`.
- `PublicHomeSnapshotSchema.sections` max increased from 15 to 16.
- `FacilityLoadResultSchema` now returns `FacilityAdminDetailSchema`, which
  includes the validated edit `input` payload and optional public `cover`.
- `listPublicFacilities` now accepts an optional locale parameter. Existing
  callers keep the old default Indonesian behavior.
- New `listPublicHomeFacilities` returns only active, published, image-backed
  facility cards for homepage use.
- `AdminPostEditorViewSchema` now uses an admin-only media preview schema for
  cover/gallery previews. Public post and public media schemas are unchanged.
- `AdminPostEditorViewSchema` now supports `BERITA` and `KOLOM`; `KOLOM`
  requires `columnType`.
- New admin command actions:
  `CREATE_COLUMN`, `UPDATE_COLUMN`, `AUTOSAVE_COLUMN`, `PUBLICATION_COLUMN`,
  and `DELETE_COLUMN`.
- No schema/API contract change for media pagination; existing
  `/api/admin/media` `page`, `pageSize`, and `hasNextPage` response fields are
  now consumed by the admin picker UI.

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run prisma:validate` | Passed |
| `npx vitest run tests/m4/contracts/home-nav-contracts.test.ts tests/m4/contracts/facility-contracts.test.ts tests/m4/runtime/facility-domain.test.ts` | Passed, 14 tests |
| `npm run test` | Passed, 90 files / 1146 tests |
| `git diff --check` | Passed |
| `npm run build` | Failed after `.next` cleanup because `next/font/google` could not fetch Amiri, IBM Plex Sans Arabic, Inter, and Plus Jakarta Sans from `fonts.googleapis.com` in this environment. A rerun with escalated network permission failed the same way. An earlier build before cache cleanup compiled and generated routes successfully, including `/[locale]/admin/fasilitas`, but the final build cannot be considered passed until Google Fonts fetch or local font caching is available. |

Follow-up bug fix verification:

| Command | Result |
|---|---|
| `npx vitest run tests/m4/ui/home-slider-editor-form.test.ts tests/m4/contracts/home-nav-contracts.test.ts` | Passed, 2 files / 14 tests |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run test` | Passed, 94 files / 1170 tests |
| `npm run prisma:validate` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-FACILITY-HOMEPAGE-ADMIN.md TASK_BASE=HEAD~1 npm run check:scope` | Passed, 6 changed files within lease |

Second follow-up bug fix verification:

| Command | Result |
|---|---|
| `npx shadcn@latest info` | Passed |
| `npx vitest run tests/m4/ui/admin-legacy-media-preview.test.ts tests/m3/ui/admin-media-library-browse.test.tsx tests/m3/contracts/post-admin-transport-contract.test.ts` | Passed, 3 files / 59 tests |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run prisma:validate` | Passed |
| `npm run test` | Passed, 95 files / 1173 tests |
| `git diff --check` | Passed |
| `npm run build` | Passed |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-FACILITY-HOMEPAGE-ADMIN.md TASK_BASE=HEAD~1 npm run check:scope` | Passed after adding `src/lib/content/post-admin-transport.ts` to the lease |

Third follow-up feature verification:

| Command | Result |
|---|---|
| `node -e "JSON.parse(...messages/id,en,ar...)"` | Passed |
| `npx vitest run tests/m3/contracts/post-admin-transport-contract.test.ts tests/m3/ui/admin-post-editor.test.tsx tests/m3/ui/admin-post-list.test.tsx tests/m3/ui/admin-post-autosave.test.tsx tests/m3/ui/admin-post-publication-actions.test.tsx tests/m3/ui/admin-post-delete.test.tsx` | Passed, 6 files / 147 tests |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm run prisma:validate` | Passed |
| `npm run test` | Passed, 95 files / 1180 tests |
| `git diff --check` | Passed |
| `npm run build` | Passed, routes include `/[locale]/admin/kolom`, `/[locale]/admin/kolom/new`, and `/[locale]/admin/kolom/[postId]/edit` |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-FACILITY-HOMEPAGE-ADMIN.md TASK_BASE=HEAD~1 npm run check:scope` | Passed, 30 changed files within lease |

Fourth follow-up cleanup verification:

| Command | Result |
|---|---|
| `set -a; source .env; ... prisma.post.deleteMany(...)` | Passed, `{"deleted":2}` |
| `set -a; source .env; ... prisma.post.findMany(...)` | Passed, `{"remaining":[]}` |
| `npx vitest run tests/m4/runtime/fuspi-seed-content.test.ts tests/m3/ui/admin-post-editor.test.tsx` | Passed, 2 files / 48 tests |
| `node -e "JSON.parse(...messages/id,en,ar...)"` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run prisma:validate` | Passed |
| `npm run test` | Passed, 96 files / 1181 tests |
| `git diff --check` | Passed |
| `npm run build` | Passed |

Fifth follow-up media picker pagination verification:

| Command | Result |
|---|---|
| `npx vitest run tests/m4/ui/admin-media-picker-pagination.test.ts tests/m3/ui/admin-post-cover-picker.test.tsx` | Passed, 2 files / 17 tests |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run prisma:validate` | Passed |
| `npm run build` | Passed |
| `npm run test` | Initially failed when run in parallel with `npm run build` due Vitest worker/test timeouts; rerun separately passed, 97 files / 1186 tests |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-FACILITY-HOMEPAGE-ADMIN.md TASK_BASE=HEAD~1 npm run check:scope` | Passed, 16 changed files within lease |

## Untested areas

- Browser-level admin CRUD flow was not run with Playwright.
- Real media picker interaction was not exercised against uploaded files.
- Real legacy uploaded media was not manually opened in the browser; coverage is
  contract/runtime/unit level plus full production build.
- Browser-level create/edit/delete flow for `/admin/kolom` was not manually run
  with Playwright; coverage is contract/source tests plus production build.

## Risks and follow-ups

- Production/staging build needs network access to Google Fonts or a local
  font strategy. This task did not change font loading.
- Existing `/api/public/facilities` still defaults to Indonesian unless callers
  are updated to pass a locale through query/API contract.

## Requested shared changes

- None beyond this task's schema enum migration and contract updates.
