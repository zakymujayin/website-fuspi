# Handoff — M4-GPT-PPKS-QUERY-ISOLATION

- Task: `M4-GPT-PPKS-QUERY-ISOLATION`
- Branch: `ai/gpt/m4-ppks-query-isolation`
- Milestone branch: `integration/m4-features`
- Task branch base: `b6e7bbd081daf79f7f57c094d1c9daaab62c601f`
- Frozen M3 source base: `a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0`
- Tested implementation head: `dbd6ce06da42bfce8beb8151838cbb56a3eb0c97`
- Verdict: **READY FOR INDEPENDENT REVIEW**

## Summary

Added the single server-side ticket query boundary for M4. The boundary:

- validates a database-session result, expiry, password-change state, current
  user activation, and current database role before ticket access;
- derives either the non-PPKS or PPKS scope from the frozen permission matrix;
- applies the category filter at SQL query level before selecting ticket data;
- permits only `SATGAS_PPKS` to select and decrypt PPKS content;
- records allowed PPKS list/detail/count/search/aggregate/export reads and
  authenticated denied direct-ID attempts in `TicketAccessLog`;
- returns the same safe `NOT_FOUND` shape for forbidden and nonexistent
  records and for PPKS versus nonexistent tracking probes;
- exposes only strict Zod projections without ciphertext, nonce, tag, key
  version, storage key, token hash, raw token, or technical exception;
- keeps ADMIN/PETUGAS general-ticket reads and the explicitly permitted PPKS
  aggregate available without granting PPKS detail access.

PPKS fields use independent serialized AES-256-GCM envelopes bound to ticket
ID plus field name. PPKS replies use a separately bound reply envelope. This
avoids nonce/tag reuse while keeping the frozen Prisma schema unchanged.

## Files changed

- `src/contracts/ticket.ts`
- `src/features/tickets/query-isolation.ts`
- `src/lib/tickets/protected-fields.ts`
- `tests/m4/tickets/ticket-contract.test.ts`
- `tests/m4/tickets/query-isolation.integration.test.ts`
- `coordination/handoffs/M4-GPT-PPKS-QUERY-ISOLATION-gpt.md`

## API, schema, migration, dependency, and configuration impact

- New internal server API: `createTicketQueryBoundary(...)`.
- New strict ticket query/result contracts and PPKS field sealing/opening
  helpers.
- No route, UI, RSC transport, download handler, or notification surface.
- No Prisma schema, migration, generated client, dependency, lockfile, auth,
  proxy, environment contract, root config, or navigation change.
- The existing legacy ticket crypto columns remain frozen. New PPKS query
  code neither returns them nor relies on a shared nonce/tag.

## Verification

All database commands used the local isolated database `fuspi_dev_gpt`.
No staging or production database was contacted.

- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm run prisma:validate` — PASS after loading the existing local test
  environment; schema valid.
- `RUN_PLATFORM_DB_TESTS=true npm test` — PASS, 50 files and 741 tests.
- `npm run test:integration` — PASS, 21 files and 88 PostgreSQL tests.
- `npm run build` — PASS, production build compiled and generated 34/34
  static pages with no warning.
- `git diff --check` — PASS.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-PPKS-QUERY-ISOLATION.md TASK_BASE=origin/integration/m4-features npm run check:scope`
  — PASS, 5 implementation/test files within the lease before this handoff.
- Focused unit evidence:
  `npx vitest run tests/m4/tickets/ticket-contract.test.ts` — PASS, 3 tests.
- Focused PostgreSQL evidence:
  `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/tickets/query-isolation.integration.test.ts`
  — PASS, 5 adversarial tests.

Two environment-precondition attempts were intentionally retained in the
working record:

1. `npm run prisma:validate` initially stopped because this task worktree has
   no `DATABASE_URL`. It passed after the existing local test environment was
   loaded and the database name was overridden and verified as
   `fuspi_dev_gpt`.
2. The first full integration attempt supplied only `DATABASE_URL`, so the
   pre-existing authentication route tests stopped on absent HMAC test
   variables. The exact suite passed after the complete existing local test
   environment was loaded, still with the verified isolated database
   override. No source change was required for either precondition.

## Adversarial evidence

PostgreSQL-backed coverage includes:

- ADMIN, EDITOR, PETUGAS, and SATGAS_PPKS;
- active, expired, inactive, and malformed session states;
- direct-ID cross-category IDOR and record-scope denial;
- byte-for-byte equivalent public results for forbidden and nonexistent IDs;
- non-PPKS-only list, count, search, export, and tracking behavior;
- SATGAS-only PPKS list, detail, count, search, and decrypted export;
- fixed-shape aggregate output without record ID, number, or protected field;
- allowed and denied audit completeness with no false success record;
- tracking-token equivalence for PPKS and nonexistent ticket numbers;
- resolver-call proof that no key is requested before authorization;
- tampered envelope failure with a safe public result;
- recursive checks that output keys contain no protected storage/crypto/token
  fields.

## Untested areas, risks, and follow-ups

- This task intentionally does not implement public PPKS reporter tracking,
  reply, attachment byte download, routes, UI, email, or notifications. Those
  require later bounded GPT tasks; this boundary fails closed for PPKS public
  tracking in the meantime.
- PPKS aggregate and count reads create one access-log row per matching case
  so every accessed record is auditable. A later scale review may introduce a
  separate aggregate-audit model only through a schema contract task.
- General-ticket legacy content fields are projected under safe public names;
  later general-ticket write/query tasks must retain the SQL category guard.
- Any future PPKS writer must use the provided per-field sealing helpers.
  Writing plaintext or a shared nonce/tag convention is not compatible with
  this boundary.
- Independent Claude review and DeepSeek adversarial retest are still
  required before coordinator integration. This branch has not been merged
  into `integration/m4-features` or `main`.
