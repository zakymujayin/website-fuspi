# M4-GPT-PUBLIC-LINKS-THREE-PRODI Handoff

## Task
- Task ID: M4-GPT-PUBLIC-LINKS-THREE-PRODI
- Branch: feat/lecturer-portal-complaint-booking
- Base SHA: 84ac7f8f122d9db8e3abe9e16503dedc78ebe317
- Implementation head SHA: 8de7d838eae71d3cf2589a8c8a1d051b4fa52584

## Summary
- Updated public utility/service links:
  - SIAKAD: https://neosiakad.uinbanten.ac.id
  - PMB: https://pmb.uinbanten.ac.id/
  - PPID: https://fuspi-ppid.uinbanten.ac.id/
  - GKM: https://gkm-fuda.uinbanten.ac.id/
  - E-Learning: https://fuspi.uinbanten.ac.id/e-learning
  - SILA/E-Journal: https://fuspi.uinbanten.ac.id/e-layanan
- Replaced the placeholder FU mark with the committed UIN logo image asset.
- Changed the official active study-program contract from five programs to three: IAT, IH, AFI.
- Removed public-facing copy for the two additional programs and related research/community-service cards.
- Filtered public DB-backed prodi surfaces so stale rows for non-current programs are not rendered if old seed data remains.

## Files Changed
- Public shell/services/routes: `src/components/public/**`, selected `src/app/[locale]/(public)/**`.
- Contracts/config: `src/config/institution.ts`, `src/contracts/academic.ts`, `src/contracts/home-nav.ts`.
- Runtime filters: `src/features/home-nav/domain.ts`, `src/features/academic/people.ts`, `src/features/search/domain.ts`.
- Seed/messages/tests/E2E updated for the three-program contract and new links.

## API, Schema, Migration Impact
- No Prisma schema or migration changes.
- Public/admin academic and home-nav contracts now accept only IAT, IH, and AFI as official study-program codes.
- `prisma/seed.ts` now deactivates study-program rows whose code is not in `src/config/institution.ts`.

## Verification
- `npm run lint` PASS
- `npm run typecheck` PASS
- `npm run test` PASS: 115 files, 1388 tests
- `npm run prisma:validate` PASS
- `npm run build` PASS
- `npx playwright test e2e/experience/shell.spec.ts --project=chromium --workers=1` PASS: 11 tests
- `git diff --check` PASS
- `TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-LINKS-THREE-PRODI.md TASK_BASE=84ac7f8f122d9db8e3abe9e16503dedc78ebe317 npm run check:scope` PASS: 37 changed files within lease

## Untested Areas, Risks, Follow-ups
- Existing production CMS rows for services/quick links may still need admin review if they were edited after initial seed; code and fresh seed are aligned.
- No full Playwright suite was run; only the public shell smoke spec was run.
- GKM intentionally contains `gkm-fuda.uinbanten.ac.id` because the owner supplied that exact external URL.
