# M4-GPT-HOME-NAV-SCHEMA-CORRECTION handoff

- Task: `M4-GPT-HOME-NAV-SCHEMA-CORRECTION`
- Branch: `ai/gpt/m4-home-nav-schema-correction`
- Base SHA: `e9dd1c46571c1fa6198559ee6df1787263709501`
- Branch merge-base SHA: `1bf5bae9e6ed4c74195a8782be0c32703fa9bb67`
- Implementation head SHA: `d22123370802c8699c147549a001e4c062139a64`
- Model: GPT

## Summary

Added one immutable, additive PostgreSQL migration and matching Prisma schema
correction for all four gaps identified by the accepted Home/Nav contract:

- `INTRO` and `SERVICE` in `HomeSectionKey`;
- nullable `Statistic.suffix`;
- nullable `SiteSetting.videoPosterMediaId` with a restrictive Media relation;
- a restrictive `MenuItem.pageId` relation to Page.

Both new foreign keys are indexed. Existing rows and accepted migrations are
unchanged. No seed content was introduced.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260804214500_home_nav_schema_correction/migration.sql`
- `tests/m4/schema/home-nav-schema-correction.test.ts`
- `tests/m4/schema/home-nav-schema-correction.integration.test.ts`
- `coordination/handoffs/M4-GPT-HOME-NAV-SCHEMA-CORRECTION-gpt.md`

## API, schema, migration impact

- Additive enum values: `HomeSectionKey.INTRO`, `HomeSectionKey.SERVICE`.
- Additive nullable columns: `Statistic.suffix`,
  `SiteSetting.videoPosterMediaId`.
- Additive indexes and restrictive foreign keys for MenuItem→Page and
  SiteSetting→poster Media.
- Prisma Client generation succeeds. Generated files remain ignored by the
  repository and were not committed.
- No contract, dependency, route, domain, configuration, or UI changed.

## Verification

Commands used the isolated `fuspi_dev_gpt` PostgreSQL database.

- `npm run prisma:validate` — PASS.
- `npm run prisma:generate` — PASS, Prisma Client 7.8.0 generated.
- `npx prisma migrate deploy` — PASS; migration applied successfully.
- `npx vitest run tests/m4/schema/home-nav-schema-correction.test.ts`
  - PASS: 1 file, 3/3 tests.
- `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/schema/home-nav-schema-correction.integration.test.ts`
  - PASS: 1 file, 3/3 tests.
- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm run test` — PASS: 73 files, 970/970 tests.
- `npm run test:integration` — PASS: 39 files, 172/172 tests.
- `git diff --check` — PASS.
- Scope check — PASS: 4 implementation files within lease before handoff.

## PostgreSQL proof

- Statistic suffix and SiteSetting poster relation round-trip successfully.
- Both new enum values cast successfully without creating public content.
- Deleting a Page referenced by MenuItem fails with Prisma `P2003`, while the
  Page remains present; cleanup succeeds after removing the MenuItem.
- Task-created user, Media, Page, MenuItem, Statistic, and SiteSetting rows are
  removed in `afterAll`.

## Untested areas, risks, and follow-ups

- The migration assumes existing non-null `MenuItem.pageId` values reference
  real Page rows. The isolated database migration succeeded; deployment
  preflight should run a dangling-reference query before production deploy.
- PUBLIC poster validation, tree cycle/depth rules, revision/audit, and
  homepage snapshot behavior belong to `M4-GPT-HOME-NAV-DOMAINS`.

## Requested contract or dependency change

None. The accepted `src/contracts/home-nav.ts` contract is now representable by
Prisma and the Home/Nav domain task can start.
