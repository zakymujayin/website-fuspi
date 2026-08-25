# Handoff — M4-GPT-FACILITY-HOMEPAGE-ADMIN — gpt

- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: 1c3df17ed99cdbe6c04f24b20a30836e3d6f518a
- Head SHA: see branch HEAD (`git rev-parse HEAD`) after final commit

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

## Untested areas

- Browser-level admin CRUD flow was not run with Playwright.
- Real media picker interaction was not exercised against uploaded files.

## Risks and follow-ups

- Production/staging build needs network access to Google Fonts or a local
  font strategy. This task did not change font loading.
- Existing `/api/public/facilities` still defaults to Indonesian unless callers
  are updated to pass a locale through query/API contract.

## Requested shared changes

- None beyond this task's schema enum migration and contract updates.
