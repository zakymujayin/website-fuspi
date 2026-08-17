# Handoff: M4-GPT-MIGRATION-STATS-CORRECTION

- Task ID: M4-GPT-MIGRATION-STATS-CORRECTION
- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: 706f56c
- Head SHA: commit containing this handoff

## Summary

Reconciled local Prisma migration history by adding a no-op compatibility
migration for Claude's recorded `20260811052302_add_site_setting_logo`. The
actual SiteSetting logo/favicon DDL remains consolidated in
`20260810002000_home_video_facility_site_media`, so this avoids duplicate ALTER
TABLE statements on fresh databases while matching existing local history.

Restored homepage statistics centering by returning the section layout to the
approved flex-wrap centered pattern with stable item widths.

## Files Changed

- `coordination/tasks/M4-GPT-MIGRATION-STATS-CORRECTION.md`
- `coordination/handoffs/M4-GPT-MIGRATION-STATS-CORRECTION-gpt.md`
- `prisma/migrations/20260811052302_add_site_setting_logo/migration.sql`
- `src/components/public/stats-section.tsx`

## API, Schema, Migration Impact

- No API changes.
- Added a no-op Prisma migration directory for history compatibility.
- Applied pending migration `20260817043000_add_facility_home_section_key` to
  the local database with `npx prisma migrate deploy`.
- Ran idempotent seed so `HomeSectionKey.FACILITY` has a visible seeded
  `HomeSection` row.

## Verification

- `npx prisma migrate status` reported database schema is up to date after
  deploy.
- `npm run prisma:seed` passed.
- DB probe confirmed `HomeSectionKey` includes `FACILITY` and seeded
  `HomeSection` exists with `isVisible: true`, `itemLimit: 4`.
- `npm run prisma:validate` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npx vitest run tests/platform/revision-outbox.test.ts tests/m4/contracts/home-nav-contracts.test.ts tests/m4/runtime/facility-domain.test.ts`
  passed: 3 files, 20 tests.
- `npm run test` passed: 90 files, 1147 tests.

## Risks and Follow-ups

- `npm run build` was not repeated in this correction. Earlier build attempts
  in this environment were blocked by `next/font/google` fetching Google Fonts,
  not by route/type errors.
