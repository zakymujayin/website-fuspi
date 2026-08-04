# M4-CLAUDE-FULL-UI-READY-BACKEND — Handoff

## Task / Scope
Implement production-ready UI surfaces for all backend-ready domains in
`origin/integration/m4-features`, substituting lane Claude UI.
Covered: Page Admin CMS, Public Content public list/detail (10 resources),
Public Content admin CRUD (10 resources), admin navigation, i18n messages.

## Branch
`ai/claude/m4-full-ui-ready-backend`

## Base SHA
`b6f8f2887f3196bc4c7632f1eac17695dd7faaef` (`origin/integration/m4-features`)

## Implementation Head SHA
`b6f8f2887f3196bc4c7632f1eac17695dd7faaef` (uncommitted — all changes staged / working-tree)

Working-tree state:
- 26 new directories/files untracked (public content UI)
- ~30 files previously staged via `git cherry-pick 7ebafb2 --no-commit` (Page Admin UI)
- 3 message files modified (i18n additions)

## Files Changed

### A. Page Admin UI (cherry-picked from `ai/claude/m4-page-admin-ui`, commit `7ebafb2`)
All staged with `--no-commit`:
- `src/app/[locale]/admin/pages/**` — list, create, edit routes
- `src/components/admin/pages/**` — 20+ components (form, list, pagination, publication, delete, etc.)
- `tests/m4/ui/page-admin/**` — 7 unit/component test files
- `e2e/m4/page-admin.spec.ts` — E2E spec
- `messages/{id,en,ar}.json` — AdminPageEditor, AdminPageList, AdminPagePublication, AdminPageDelete, AdminPageNavigation namespaces
- `src/app/[locale]/admin/layout.tsx` — updated to use AdminPageNav

### B. Public Content — Public UI (new)
Route pages:
- `src/app/[locale]/(public)/layanan/**` — Service list + detail
- `src/app/[locale]/(public)/kerjasama/**` — Partnership list + detail
- `src/app/[locale]/(public)/beasiswa/**` — Scholarship list + detail
- `src/app/[locale]/(public)/prestasi/**` — Achievement list + detail
- `src/app/[locale]/(public)/kegiatan/**` — Student Activity list + detail
- `src/app/[locale]/(public)/dokumen/**` — Document list + detail
- `src/app/[locale]/(public)/album/**` — Album list + detail
- `src/app/[locale]/(public)/agenda/**` — Event list + detail
- `src/app/[locale]/(public)/faq/page.tsx` — FAQ accordion page
- `src/app/[locale]/(public)/testimoni/page.tsx` — Testimonial card grid

Shared components:
- `src/components/public/public-content-card.tsx` — Card component
- `src/components/public/public-content-card-skeleton.tsx` — Loading skeleton
- `src/components/public/public-content-list-page.tsx` — Shared list page
- `src/components/public/section-heading-skeleton.tsx` — Heading skeleton

### C. Public Content — Admin UI (new)
Server Actions:
- `src/components/admin/public-content/public-content-server-actions.ts`
- `src/components/admin/public-content/public-content-editor-errors.ts`

Shared admin components:
- `src/components/admin/public-content/public-content-query.ts`
- `src/components/admin/public-content/public-content-state-notice.tsx`
- `src/components/admin/public-content/public-content-list-skeleton.tsx`
- `src/components/admin/public-content/public-content-pagination.tsx`
- `src/components/admin/public-content/public-content-status-badge.tsx`

Admin route pages (list):
- `src/app/[locale]/admin/layanan/**` — Service list
- `src/app/[locale]/admin/kerjasama/**` — Partnership list
- `src/app/[locale]/admin/beasiswa/**` — Scholarship list
- `src/app/[locale]/admin/prestasi/**` — Achievement list
- `src/app/[locale]/admin/kegiatan/**` — Student Activity list
- `src/app/[locale]/admin/dokumen/**` — Document list
- `src/app/[locale]/admin/album/**` — Album list
- `src/app/[locale]/admin/agenda/**` — Event list
- `src/app/[locale]/admin/faq/**` — FAQ list
- `src/app/[locale]/admin/testimoni/**` — Testimonial list

Admin form pages (create/edit):
- `src/app/[locale]/admin/layanan/baru/` + `[id]/edit/` + ServiceEditorForm
- `src/app/[locale]/admin/kerjasama/baru/` + `[id]/edit/` + PartnershipEditorForm
- `src/app/[locale]/admin/beasiswa/baru/` + `[id]/edit/` + ScholarshipEditorForm
- `src/app/[locale]/admin/prestasi/baru/` + `[id]/edit/` + AchievementEditorForm
- `src/app/[locale]/admin/kegiatan/baru/` + `[id]/edit/` + ActivityEditorForm
- `src/app/[locale]/admin/dokumen/baru/` + `[id]/edit/` + DocumentEditorForm
- `src/app/[locale]/admin/album/baru/` + `[id]/edit/` + AlbumEditorForm
- `src/app/[locale]/admin/agenda/baru/` + `[id]/edit/` + EventEditorForm
- `src/app/[locale]/admin/faq/baru/` + `[id]/edit/` + FaqEditorForm
- `src/app/[locale]/admin/testimoni/baru/` + `[id]/edit/` + TestimonialEditorForm

Editor form components:
- `src/components/admin/public-content/{service,partnership,scholarship,achievement,activity,document,album,event,faq,testimonial}-editor-form.tsx`

### D. Admin Navigation
- `src/components/admin/admin-nav.tsx` — Comprehensive admin nav with icons
- `src/app/[locale]/admin/layout.tsx` — Updated to use AdminNav

### E. i18n Messages
- `messages/id.json` — Added `AdminPublicContent`, `AdminNavigation`, `PublicContent` namespaces
- `messages/en.json` — Same
- `messages/ar.json` — Same (with Arabic RTL translations)

## Backend / Contracts Consumed
- `@/contracts/public-content` — public content schemas and types
- `@/features/public-content/public-list` — `listPublicContent()` for public lists
- `@/features/public-content/public-query` — `getPublicContentDetail()` for public detail
- `@/features/public-content/admin-query` — `listPublicContentAdmin()` for admin lists
- `@/features/public-content/admin-detail` — `getPublicContentAdminDetail()` for admin edit load
- `@/features/public-content/administration` — `executePublicContentCommand()` for admin create/update/delete/reorder
- `@/features/content/pages/admin-transport` — Page Admin transport (consumed by cherry-picked UI)
- `@/lib/auth/runtime/request-session` — Session validation
- `@/lib/db/client` — Prisma client factory

## Route UI Created

### Public routes
| Route | Method | Resource |
|---|---|---|
| `/[locale]/layanan` | List | SERVICE |
| `/[locale]/layanan/[slug]` | Detail | SERVICE |
| `/[locale]/kerjasama` | List | PARTNERSHIP |
| `/[locale]/kerjasama/[slug]` | Detail | PARTNERSHIP |
| `/[locale]/beasiswa` | List | SCHOLARSHIP |
| `/[locale]/beasiswa/[slug]` | Detail | SCHOLARSHIP |
| `/[locale]/prestasi` | List | ACHIEVEMENT |
| `/[locale]/prestasi/[slug]` | Detail | ACHIEVEMENT |
| `/[locale]/kegiatan` | List | STUDENT_ACTIVITY |
| `/[locale]/kegiatan/[slug]` | Detail | STUDENT_ACTIVITY |
| `/[locale]/dokumen` | List | DOCUMENT |
| `/[locale]/dokumen/[slug]` | Detail | DOCUMENT |
| `/[locale]/album` | List | ALBUM |
| `/[locale]/album/[slug]` | Detail | ALBUM |
| `/[locale]/agenda` | List | EVENT |
| `/[locale]/agenda/[slug]` | Detail | EVENT |
| `/[locale]/faq` | Accordion list | FAQ |
| `/[locale]/testimoni` | Card grid | TESTIMONIAL |

### Admin routes
| Route | Method | Resource |
|---|---|---|
| `/[locale]/admin/layanan` | List | SERVICE |
| `/[locale]/admin/layanan/baru` | Create | SERVICE |
| `/[locale]/admin/layanan/[id]/edit` | Edit | SERVICE |
| `/[locale]/admin/kerjasama` | List | PARTNERSHIP |
| `/[locale]/admin/kerjasama/baru` | Create | PARTNERSHIP |
| `/[locale]/admin/kerjasama/[id]/edit` | Edit | PARTNERSHIP |
| … (same pattern for all 10 resources) | | |
| `/[locale]/admin/agenda` | List | EVENT |
| `/[locale]/admin/agenda/baru` | Create | EVENT |
| `/[locale]/admin/agenda/[id]/edit` | Edit | EVENT |
| `/[locale]/admin/faq` | List | FAQ |
| `/[locale]/admin/faq/baru` | Create | FAQ |
| `/[locale]/admin/faq/[id]/edit` | Edit | FAQ |
| `/[locale]/admin/testimoni` | List | TESTIMONIAL |
| `/[locale]/admin/testimoni/baru` | Create | TESTIMONIAL |
| `/[locale]/admin/testimoni/[id]/edit` | Edit | TESTIMONIAL |

## API / Schema / Migration Impact
None. No API routes, schema, migrations, or contracts were modified.

## Exact Command Results

```
npm run typecheck  →  tsc --noEmit passes
npm run lint       →  0 errors, 57 warnings (all warnings pre-existing or img-element)
npm test           →  80 test files, 1035 tests passed
npm run build      →  Compiled successfully, 137 static pages generated
```

Page Admin UI unit tests:
```
npx vitest run tests/m4/ui/page-admin  →  7 files, 65 tests passed
```

## Tests
- Unit/component tests: 1035 passing (80 files) — includes existing codebase + page admin tests
- E2E: Not run. Requires authenticated admin test fixture which is not available in this environment. The existing `e2e/m4/page-admin.spec.ts` and public content E2E tests should be run after fixtures are configured.
- Public content admin forms: Untested. Component unit tests should be written for the 10 editor form components.

## Test yang Gagal/Skip dan Alasannya
- E2E tests not run — no authenticated admin fixture available for Playwright.
  Tested with `npx playwright test e2e/m4 --project=chromium --project=mobile --workers=1` but requires DB seeding + auth setup.
- Public content admin forms have no component tests. Should be added as follow-up.

## Risiko / Follow-up

1. **i18n completeness**: Admin form messages (`createDescription`, `editDescription`, form-specific labels) use fallback `{defaultValue}` in some places. Full message coverage for all 10 resource forms needs manual review.

2. **Media picker integration**: Admin forms use text inputs for media IDs. A proper media picker component should replace these in a follow-up task. See `src/components/admin/pages/page-hero-picker.tsx` for the pattern.

3. **Rich text editor**: Descriptions/answers are saved as plain text or assumed rich text. Tiptap integration (like `page-rich-text-field.tsx`) is needed for content fields in admin forms.

4. **Admin reorder**: The contract supports reorder for SERVICE, PARTNERSHIP, FAQ, and TESTIMONIAL. No UI for reorder was built — deferred.

5. **Public content list features**: Search, filtering, pagination for public list pages are not yet wired. Currently shows all results (page 1, no search).

6. **Document upload**: `DocumentEditorForm` accepts a raw `publicPdfMediaId` text input. Proper file upload + media picker integration is needed.

7. **Admin role enforcement**: Admin routes validate session but do not check specific resource permissions beyond session validity. Page Admin uses ADMIN-only gate; public content uses the generic session check from the feature functions.

8. **Arabic RTL forms**: Basic RTL support is in place (`dir="rtl"` on Arabic inputs) but full layout mirroring for admin forms needs verification.

## Backend-Ready UI yang Belum Dibuat

| Domain | Reason |
|---|---|
| PPKS | Sensitive; needs explicit manifest/lease |
| Home/Nav dynamic | Navigation registry runtime not merged |
| Auth/login UI | Already exists in base |
| Media admin | Already exists in base |
| Post admin/public | Already exists in base |
| Academic (StudyProgram, Lecturer, Staff) | Deferred — belongs in separate task |
| Research/CommunityService | Deferred — belongs in separate task |
| Unit, Room, Booking | Deferred — belongs in separate task |
| SiteSetting, Menu, ExternalLink | Deferred — belongs in separate task |

## Commit & Push
Not yet committed. Working directory contains:
- Staged cherry-pick files (Page Admin UI)
- Untracked new files (Public Content UI)

Commit command:
```bash
git add src/app/[locale]/(public)/agenda/ src/app/[locale]/(public)/album/ src/app/[locale]/(public)/beasiswa/ src/app/[locale]/(public)/dokumen/ src/app/[locale]/(public)/faq/ src/app/[locale]/(public)/kegiatan/ src/app/[locale]/(public)/kerjasama/ src/app/[locale]/(public)/layanan/ src/app/[locale]/(public)/prestasi/ src/app/[locale]/(public)/testimoni/
git add src/app/[locale]/admin/agenda/ src/app/[locale]/admin/album/ src/app/[locale]/admin/beasiswa/ src/app/[locale]/admin/dokumen/ src/app/[locale]/admin/faq/ src/app/[locale]/admin/kegiatan/ src/app/[locale]/admin/kerjasama/ src/app/[locale]/admin/layanan/ src/app/[locale]/admin/prestasi/ src/app/[locale]/admin/testimoni/
git add src/components/admin/admin-nav.tsx src/components/admin/public-content/ src/components/public/public-content-* src/components/public/section-heading-skeleton.tsx
git add src/app/[locale]/admin/layout.tsx messages/
git commit -m "feat(m4): implement public content UI for all 10 resources

- Public list/detail pages for services, partnerships, scholarships,
  achievements, activities, documents, albums, events, FAQ, testimonials
- Admin CRUD with server actions, locale tabs, form validation
- Shared admin navigation with icons
- ID/EN/AR i18n messages with Arabic RTL"

git push origin ai/claude/m4-full-ui-ready-backend
```
