# HANDOFF — M1-GPT-PLATFORM

- Task: `M1-GPT-PLATFORM`
- Branch: `ai/gpt/m1-platform`
- Base SHA: `553ed1b` (`integration/m0-foundation` after Claude + DeepSeek)
- Implementation SHA: `d154cb0`
- Owner: GPT Platform
- Reviewer/tester requested: DeepSeek
- Status: ready for review; not merged

## Summary

- Froze the v1 Prisma 7 schema and added governance coverage for Post, Page, StudyProgram, Service, Unit, Document, FAQ, Event, Room, and SiteSetting.
- Added `STALE` translation/governance states, alert audience/incident workflow, privacy/retention/accessibility fields, deterministic revision scope, and encrypted outbox envelope fields.
- Added two production migrations: complete initial schema and the final glossary translation-workflow correction.
- Seed now assigns the synthetic ADMIN as content owner for SiteSetting and all five FUSPI study programs; local MySQL authentication compatibility is enabled only for loopback hosts.
- Added typed Zod contracts and database primitives for revision, audit, outbox, and Prisma MariaDB adapter creation.
- Added recursive audit redaction, revision secret rejection, plaintext outbox sensitive-key rejection, size/serialization limits, and database uniqueness tests.

## Schema and migration impact

- New deployment must run `prisma migrate deploy` before application code.
- `ContentRevision` uniqueness uses non-null `scopeKey` (`root` or locale), avoiding MySQL/MariaDB nullable-unique ambiguity.
- Ordinary outbox messages use JSON; sensitive messages require ciphertext + nonce + tag + key version and store no plaintext payload.
- Auth, PPKS crypto, booking concurrency, retention execution, and outbox worker remain M2 work; this task only establishes their storage/contracts.

## Verification evidence

Commands passed:

- `npm run prisma:format`
- `npm run prisma:validate`
- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm test`: 86 passed, 2 database tests skipped in the ordinary unit run
- `RUN_PLATFORM_DB_TESTS=true npx vitest run tests/platform/platform-db.integration.test.ts --environment node`: 2 passed
- `npm run ci:merge`: passed, including production build
- Empty `fuspi_m1_verify` database: both migrations applied with `prisma migrate deploy`; migration status clean
- Seed executed twice: counts remained User 1, StudyProgram 5, StudyProgramTranslation 5, HomeSection 13, Statistic 3, QuickLink 6, HomeSlider 1, SiteSetting 1, Category 2
- Study-program order remained `IAT,IH,AFI,SAA,TASPI`; zero StudyProgram rows lacked `contentOwnerId`

## Files changed

- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/migrations/**`
- `src/contracts/platform.ts`
- `src/lib/db/**`, `src/lib/audit/**`, `src/lib/outbox/**`
- `tests/platform/**`

## Risks and follow-ups

- Database execution evidence is from isolated **MySQL 8.0.46**, which validates Prisma provider compatibility but is not proof of Hostinger MariaDB behavior. Repeat empty deploy, double seed, JSON/enum/index inspection, and transaction tests on an isolated MariaDB staging database before closing Hostinger feasibility.
- The migration user received global DDL rights only while Prisma created a local shadow database; those rights were revoked afterward. Production migration credentials must be separate and least-privileged.
- `CODEOWNERS` still contains the placeholder GitHub handle until the repository owner supplies the actual maintainer account/team.
- No production data, real email, secret, tracking token, or PPKS fixture was used.
