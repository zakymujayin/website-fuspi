# Handoff: M4-GPT-FACILITY-REVISION-FIX

- Task ID: M4-GPT-FACILITY-REVISION-FIX
- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: 8e29690
- Head SHA: commit containing this handoff

## Summary

Facility admin create/update rolled back with `UNAVAILABLE` because
`createContentRevision()` rejected `resourceType: "Facility"`. Added Facility
to the platform revision allowlist and covered it in the revision contract test.

## Files Changed

- `coordination/tasks/M4-GPT-FACILITY-REVISION-FIX.md`
- `coordination/handoffs/M4-GPT-FACILITY-REVISION-FIX-gpt.md`
- `src/lib/db/revision.ts`
- `tests/platform/revision-outbox.test.ts`

## API, Schema, Migration Impact

- No API shape changes.
- No Prisma schema changes.
- No migration changes.
- Platform revision policy now permits the existing CMS resource type
  `Facility`.

## Verification

- Manual DB probe: `executeFacilityCommand(... CREATE ...)` returned
  `{"ok":true,"id":"cmswnfo510000q57nqioidi72","version":1}`; probe
  `Facility`, `ContentRevision`, and `ActivityLog` records were cleaned up.
- `npx vitest run tests/platform/revision-outbox.test.ts tests/m4/runtime/facility-domain.test.ts`
  passed: 2 files, 11 tests.
- `npm run prisma:validate` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run test` passed: 90 files, 1147 tests.

## Risks and Follow-ups

- Local database migration history is diverged: database has
  `20260811052302_add_site_setting_logo`, while this branch has
  `20260817043000_add_facility_home_section_key` unapplied. Do not run
  `prisma migrate dev` until Claude logo migration is reconciled into the
  branch or the database is intentionally reset.
- Local database `HomeSectionKey` enum does not yet contain `FACILITY`, so
  homepage section seeding/config for facilities still needs migration
  reconciliation. Facility row CRUD itself is fixed.
