# M4-GPT-PAGE-BACKEND — GPT handoff

## Identity

- Task: `M4-GPT-PAGE-BACKEND`
- Branch: `ai/gpt/m4-page-backend`
- Manifest contract base: `30368e45f9b13c7b33b856eb25a73be36b8ac537`
- Assignment/merge base: `362c69bd9f2f5b338d19c4658791a91037874ba0`
- Implementation head: `4d217a512cb0b545aafc41dda90ff22e1c8b9cb3`

## Summary

Implemented the production Page administration backend against the frozen Page
admin and domain contracts:

- `GET /api/admin/pages` with strict, duplicate-aware query normalization;
- `POST /api/admin/pages` with same-origin CSRF, fatal UTF-8 decoding, and a
  streamed 1 MiB JSON-body limit;
- `GET /api/admin/pages/[pageId]` with awaited Next.js 16 route params;
- active database-backed ADMIN session enforcement, including expiry,
  inactivity, role, and `mustChangePassword` rejection before Page access;
- CREATE, UPDATE, PUBLICATION, and DELETE delegation to the accepted Page
  domain mutations;
- safe PUBLIC hero-media projection without storage metadata;
- deterministic non-technical errors and HTTP statuses;
- explicit `Cache-Control: no-store` on every response; and
- success-only ID/EN/AR admin and public Page revalidation.

## Files changed

- `src/features/content/pages/admin-transport.ts`
- `src/app/api/admin/pages/route.ts`
- `src/app/api/admin/pages/[pageId]/route.ts`
- `tests/m4/runtime/page-admin-transport.test.ts`
- `tests/m4/runtime/page-admin-transport.integration.test.ts`
- `tests/security/admin-page-transport-adversarial.integration.test.ts`
- `coordination/handoffs/M4-GPT-PAGE-BACKEND-gpt.md`

## Contract, schema, and dependency impact

- API implementation added for the already-frozen Page admin contract.
- No contract, Prisma schema, migration, generated client, dependency, root
  configuration, auth, proxy, UI, locale-message, or public-route change.
- No sensitive storage key, database error, session data, or private media
  representation is returned by the transport.

## Verification

All database commands used the isolated GPT development database. Commands were
run on implementation head `4d217a512cb0b545aafc41dda90ff22e1c8b9cb3`.

| Command | Exact result |
| --- | --- |
| `npx vitest run tests/m4/runtime/page-admin-transport.test.ts` | PASS — 1 file, 13/13 tests |
| `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/page-admin-transport.integration.test.ts tests/security/admin-page-transport-adversarial.integration.test.ts` | PASS — 2 files, 7/7 tests |
| `npm run lint` | PASS — exit 0 |
| `npm run typecheck` | PASS — exit 0 |
| `npm run test` | PASS — 55 files, 837/837 tests |
| `npm run test:integration` | PASS — 24 files, 114/114 tests |
| `npm run prisma:validate` | PASS — schema valid |
| `npm run build` | PASS — Next.js 16.2.10, 35/35 static pages; both Page API routes present |
| `git diff --check origin/integration/m4-features...HEAD` | PASS — exit 0 before handoff |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-PAGE-BACKEND.md TASK_BASE=origin/integration/m4-features npm run check:scope` | PASS — 6 implementation files within lease before handoff |

The first unsourced `npm run prisma:validate` invocation reported a missing
`DATABASE_URL`. Re-running the command with the isolated database environment
loaded passed. This was shell configuration, not a schema or code failure.
`next build` regenerated the usual `next-env.d.ts` route-types reference; that
generated working-tree change was restored and is not part of this task.

## Coverage highlights

- Every invalid session state is rejected before the Page domain/database.
- Existing and missing Page identifiers are indistinguishable to unauthorized
  roles.
- Duplicate and hostile queries and hostile command bodies fail without Page,
  revision, or activity-log mutations.
- All four commands, optimistic conflict, rollback, safe hero-media behavior,
  unexpected failures, status mapping, no-store, and success-only revalidation
  are covered.
- PostgreSQL integration fixtures use marker-unique data and clean up their
  Page, revision, activity, translation, media, and synthetic actor rows.

## Untested areas and follow-ups

- A real-browser ADMIN cookie/CSRF round trip and Page form interaction belongs
  to the combined Claude UI integration/E2E pass after both production lanes
  are integrated. Route behavior itself is unit-tested, while transport and
  domain behavior are exercised against PostgreSQL.
- The public Page renderer is intentionally outside this backend lease. The
  backend already revalidates the frozen public path shape
  `/{locale}/halaman/{slug}` after successful mutations.
- `UPLOAD_PUBLIC_URL` must be configured when an editor response includes a
  PUBLIC hero asset; invalid public-media configuration fails closed.
- Previously accepted low-priority Page-domain observations are unchanged; this
  task did not reopen or modify the frozen Page domain implementation.

Per the project owner's revised delivery process, this backend is not requesting
an isolated micro-review. Review is batched with the completed Claude Page UI
after integration of the full production Page slice.
