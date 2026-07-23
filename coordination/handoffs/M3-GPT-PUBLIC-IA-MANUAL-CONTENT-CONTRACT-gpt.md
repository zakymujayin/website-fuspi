# M3-GPT-PUBLIC-IA-MANUAL-CONTENT-CONTRACT — GPT handoff

- Task: `M3-GPT-PUBLIC-IA-MANUAL-CONTENT-CONTRACT`
- Branch: `ai/gpt/m3-public-ia-manual-content-contract`
- Base SHA: `311292f`
- Implementation head SHA: `d652494`

## Summary

- Added `docs/26-fuspi-public-ia-design-brief.md` as the canonical public IA and visual brief.
- Locked a fresh/manual-content launch: no import of previous articles, pages, media, metadata, or URLs is required for v1.
- Defined the three-layer navigation, with Profile, Academics, Research & PkM, Student Affairs, Cooperation, Accreditation, and Services as the institutional groups.
- Locked the five study programs, in order: IAT, IH, AFI, SAA, and TASPI.
- Defined a 15-section editable homepage narrative including Dean welcome/photo, verified counters, faculty introduction, programs, information, services, news, partnerships, academic highlights, video, agenda, optional alumni testimony, and admissions CTA.
- Defined dedicated template briefs for profile/history, vision-mission-goals-strategy, organization/leadership, lecturer/staff directories, facilities, programs, academic/accreditation, research/PkM, student affairs/cooperation, and services.
- Replaced mandatory previous-system import/reconciliation language across governing docs with manual content-readiness, neutral seeds, empty states, media validation, content-owner approval, and staging crawl.
- Retained the redirect registry only for safe future FUSPI URL changes; it does not need previous URL data.

The redesign audit skill shaped the result toward an editorial, asymmetric, image-led FUSPI experience with restrained institutional color, varied section rhythm, accessibility, RTL, and no generic campus-template composition.

## Files changed

- `docs/README.md`
- `docs/05-halaman-publik.md`
- `docs/07-upload-media-hostinger.md`
- `docs/10-menu-branding-referensi.md`
- `docs/13-celah-fitur-keamanan-operasional.md`
- `docs/16-audit-kelengkapan.md`
- `docs/18-beranda-editable.md`
- `docs/20-test-acceptance-go-live.md`
- `docs/24-implementation-plan-multi-model.md`
- `docs/26-fuspi-public-ia-design-brief.md`

## API, schema, and migration impact

- No runtime, API, schema, database migration, seed, messages, navigation code, or UI changes were made.
- The brief proposes `FACULTY_INTRO` and `SERVICES` as homepage concepts beyond the current documented 13-section set. A separate GPT contract task must reconcile enum/schema/seed/navigation contracts before UI implementation.
- Existing database migrations remain untouched.

## Verification

- `npm ci` — PASS; 904 packages installed, audit reported 0 vulnerabilities.
- `npm run lint` — PASS.
- `DATABASE_URL=postgresql://fuspi_validation:fuspi_validation@127.0.0.1:5432/fuspi_validation npm run prisma:generate` — PASS; generated ignored local build artifacts only.
- `npm run typecheck` — PASS after Prisma client generation.
- `npm test` — PASS; 36 files passed, 16 database-gated files skipped; 488 tests passed, 69 skipped.
- `DATABASE_URL=postgresql://fuspi_validation:fuspi_validation@127.0.0.1:5432/fuspi_validation npm run prisma:validate` — PASS.
- `npx vitest run src/test/identity-contracts.test.ts src/components/public/nav-items.test.ts` — PASS; 2 files and 16 tests passed.
- `git diff --check` / `git diff --cached --check` — PASS.
- `TASK_MANIFEST=coordination/tasks/M3-GPT-PUBLIC-IA-MANUAL-CONTENT-CONTRACT.md TASK_BASE=origin/coordination/m3-gpt-public-ia-manual-content-contract-assignment npm run check:scope` — PASS after commit; 10 changed files within lease.
- `node scripts/check-fuspi-identity.mjs` — NOT RUN: the task base does not contain this script. The task did not allow adding `scripts/**`; the two existing focused identity suites above passed as the closest available verification.

## Untested areas and risks

- This is a documentation-only contract. No browser or visual implementation was produced or evaluated.
- Database-backed suites were skipped because this docs-only worktree did not start a PostgreSQL test service; all non-database tests passed.
- Current runtime navigation and homepage renderer still reflect the pre-brief implementation. Do not treat this handoff as public UI completion.
- The richer menu tree may require explicit route, query-filter, and navigation-registry decisions before implementation.
- Institutional content, leadership identity, photos, statistics, accreditation, contacts, and public claims still require owner input and approval.

## Follow-ups

1. GPT contract task: reconcile HomeSection keys, structural seed defaults, navigation registry, route/query contracts, and empty-state rules with `docs/26-fuspi-public-ia-design-brief.md`.
2. Claude public UI task: implement the new editorial homepage and dedicated profile-family templates after the contract task merges.
3. DeepSeek CMS/QA task: complete manual-content CRUD/readiness validation, fixture-neutrality checks, and staging content crawl after contracts freeze.
4. Add or restore `scripts/check-fuspi-identity.mjs` through a separately scoped GPT/CI task so future manifests can run the named identity command directly.
