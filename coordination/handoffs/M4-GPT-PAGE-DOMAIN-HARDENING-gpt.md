# M4-GPT-PAGE-DOMAIN-HARDENING — GPT handoff

## Identity

- Task: `M4-GPT-PAGE-DOMAIN-HARDENING`
- Branch: `ai/gpt/m4-page-domain-hardening`
- Base branch: `main`
- Base SHA: `a459ab1571418bc0e65ce9b54f62648be30d3607`
- Implementation commit: recorded in Git after this handoff is committed

## Summary

Closed the remaining Page domain gaps from the DeepSeek Page CRUD review:

- Page mutations now reject `mustChangePassword` ADMIN sessions at the domain
  boundary, not only at the transport boundary.
- `TITLE_ASC` list reads now run the raw ID query, row fetch, and count inside
  one `RepeatableRead` transaction.
- Page list/detail projection now uses `_count.children` for `hasChildren`
  instead of loading every child ID.
- Unique constraint mapping now returns `SLUG_CONFLICT` only when the Prisma
  P2002 signal points at slug, including wrapped transaction/adapter errors.
  Other unique errors remain generic `INTERNAL_ERROR`.
- Runtime Page transport unit mocks were updated to match the new `_count`
  query projection.

## Files changed

- `src/features/content/pages/mutations.ts`
- `src/features/content/pages/queries.ts`
- `tests/m4/content/pages/page-mutations.test.ts`
- `tests/m4/content/pages/page-mutations.integration.test.ts`
- `tests/m4/runtime/page-admin-transport.test.ts`
- `coordination/tasks/M4-GPT-PAGE-DOMAIN-HARDENING.md`
- `coordination/handoffs/M4-GPT-PAGE-DOMAIN-HARDENING-gpt.md`

## API, schema, and dependency impact

- No schema, migration, dependency, shared contract, route handler, UI, message,
  proxy, or env-contract change.
- No FUSPI identity/configuration change.
- No secrets were printed from `.env`; env was loaded only to run local database
  verification.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 73 files, 973/973 tests |
| `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/content/pages` with `/home/zhev/myproject/website-fuspi/.env` loaded | PASS — 1 file, 18/18 tests |
| `npm run prisma:validate` with `/home/zhev/myproject/website-fuspi/.env` loaded | PASS |
| `npm run build` without env | FAIL — expected shell configuration failure: `DATABASE_URL is required to create a Prisma client` while collecting `/api/auth/[...nextauth]` page data |
| `npm run build` with `/home/zhev/myproject/website-fuspi/.env` loaded | PASS — Next.js 16.2.10, 41/41 static pages |
| `git diff --check` | PASS |

Additional database evidence:

- Loading `/home/zhev/myproject/fuspi-deepseek/.env.local` failed PostgreSQL
  authentication for user `zhev`; no secrets printed.
- Full `npm run test:integration` with root `.env` connected to PostgreSQL but
  failed outside this Page hardening scope: academic/public-content integration
  tests hit stale/local DB state such as missing `version` columns on
  `StudentActivity`, `Partnership`, and `Testimonial`, plus canonical study
  program unique-code collisions. The focused Page integration suite passed.

## Untested areas, risks, and follow-ups

- Full integration requires a migrated, isolated database before it can be used
  as a reliable cross-module gate in this checkout.
- The broad Post-domain `isUniqueConstraintError` helper still maps every P2002
  to `SLUG_CONFLICT`; that is a separate Post hardening task if desired.
- This branch was not pushed to remote.
