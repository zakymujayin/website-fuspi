# Handoff — M4-GPT-PPKS-QUERY-ISOLATION

- Task: `M4-GPT-PPKS-QUERY-ISOLATION`
- Branch: `ai/gpt/m4-ppks-query-isolation`
- Milestone branch: `integration/m4-features`
- Task branch base: `b6e7bbd081daf79f7f57c094d1c9daaab62c601f`
- Frozen M3 source base: `a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0`
- Head SHA tested: `49152751e9135bc119ec86353cecb81b8f424377`
- Verdict: **INDEPENDENT REVIEW PASSED — READY FOR COORDINATOR QUEUE**

## Summary

Added and hardened the single server-side ticket query boundary for M4. The
boundary now:

- accepts a session token and revalidates the exact database session on every
  operation, including current expiry, revocation, user activation, role, and
  forced-password-change state;
- derives either the non-PPKS or PPKS scope from the frozen permission matrix
  using the actual operation (`VIEW` or `EXPORT`);
- applies the category filter at SQL query level before selecting ticket data;
- permits only `SATGAS_PPKS` to select and decrypt PPKS case content;
- records case-revealing PPKS list/detail/search/export reads in
  `TicketAccessLog`, authenticated denied direct-ID attempts as denied case
  logs, and non-case count/aggregate access once in `ActivityLog`;
- computes PPKS count and status aggregates in PostgreSQL without selecting
  case IDs and without writing false per-case `VIEW allowed=true` evidence;
- returns the same safe `NOT_FOUND` shape for forbidden and nonexistent
  records and for PPKS versus nonexistent tracking probes;
- exposes only strict Zod projections without ciphertext, nonce, tag, key
  version, storage key, token hash, raw token, or technical exception;
- fails closed if a serialized protected envelope is mistakenly stored in a
  general-ticket text column.

The shared ticket contract now explicitly freezes the per-field storage
convention: each PPKS text column stores an independent serialized AES-256-GCM
envelope. Legacy row-level nonce/tag/key-version columns are not used by this
convention. PPKS reply AAD is bound to both ticket ID and reply ID, preventing
cross-ticket ciphertext rebinding.

## Review correction

Claude reviewed the prior head `f1486c25709dfcef9868b66cd3f0c6e8c06b4229`
as `CHANGES_REQUESTED`. The blocking finding was valid: PPKS aggregate and
count operations selected all case IDs and wrote misleading per-case
`VIEW allowed=true` logs. That implementation was also O(N). DeepSeek's prior
adversarial retest passed the same old head but did not detect this semantic
audit defect, so that earlier PASS is superseded.

This correction also addresses the review's non-blocking hardening findings:

- export scope uses `EXPORT`, not reused `VIEW` authorization;
- arbitrary projection-only caps were removed or widened so historical rows
  are not made unreadable by write-time constraints;
- the exact database session is revalidated rather than trusting a reusable
  session snapshot;
- the per-field persisted-envelope convention is now an explicit shared
  contract;
- reply ciphertext is authenticated against its parent ticket as well as its
  own reply ID.

## Files changed

- `src/contracts/ticket.ts`
- `src/features/tickets/query-isolation.ts`
- `src/lib/tickets/protected-fields.ts`
- `tests/m4/tickets/ticket-contract.test.ts`
- `tests/m4/tickets/query-isolation.authorization.test.ts`
- `tests/m4/tickets/query-isolation.integration.test.ts`
- `coordination/handoffs/M4-GPT-PPKS-QUERY-ISOLATION-gpt.md`

## API, schema, migration, dependency, and configuration impact

- New internal server API: `createTicketQueryBoundary(...)`.
- Query methods accept `{sessionToken}` and perform database session
  validation internally; callers must not pass cached session snapshots.
- New strict ticket query/result, persisted-envelope, and general-text
  contracts plus PPKS field sealing/opening helpers.
- `sealPpksReplyBody` and `openPpksReplyBody` require both `ticketId` and
  `replyId` for authenticated context binding.
- No route, UI, RSC transport, download handler, or notification surface.
- No Prisma schema, migration, generated client, dependency, lockfile, auth,
  proxy, environment contract, root config, or navigation change.
- Existing legacy row-level crypto columns remain frozen. Future PPKS writers
  must store one serialized envelope per protected text column and leave the
  legacy row-level nonce/tag/key-version convention unused.

## Verification

All database commands used the isolated local database `fuspi_dev_gpt`. No
staging or production database was contacted.

- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `npm run prisma:validate` — PASS; schema valid.
- `RUN_PLATFORM_DB_TESTS=true npm test` — PASS, 51 files and 742 tests.
- `npm run test:integration` — PASS, 21 files and 89 PostgreSQL tests.
- `npm run build` — PASS, production build generated 34/34 static pages.
- `git diff --check` and diff-to-base check — PASS.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-PPKS-QUERY-ISOLATION.md TASK_BASE=origin/integration/m4-features npm run check:scope`
  — PASS, 7 changed files within the lease.
- Focused unit evidence:
  `npx vitest run tests/m4/tickets/ticket-contract.test.ts tests/m4/tickets/query-isolation.authorization.test.ts`
  — PASS, 2 files and 4 tests.
- Focused PostgreSQL evidence:
  `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/tickets/query-isolation.integration.test.ts`
  — PASS, 6 adversarial tests.

## Adversarial evidence

PostgreSQL-backed coverage includes:

- ADMIN, EDITOR, PETUGAS, and SATGAS_PPKS;
- active, expired, inactive, revoked, missing, and malformed sessions;
- direct-ID cross-category IDOR and record-scope denial;
- byte-for-byte equivalent public results for forbidden and nonexistent IDs;
- non-PPKS-only list, count, search, export, and tracking behavior;
- SATGAS-only PPKS list, detail, count, search, and decrypted export;
- SQL-side aggregate output without record ID, number, or protected field;
- collection-level audit evidence without false per-case success logs;
- operation-specific export authorization;
- tracking-token equivalence for PPKS and nonexistent ticket numbers;
- resolver-call proof that no key is requested before authorization;
- tampered-envelope and cross-category envelope failure with safe results;
- reply-envelope rejection after parent-ticket rebinding;
- recursive checks that output keys contain no protected storage/crypto/token
  fields.

## Untested areas, risks, and follow-ups

- This task intentionally does not implement public PPKS reporter tracking,
  reply mutation, attachment byte download, routes, UI, email, or
  notifications. Those require later bounded GPT tasks; this boundary fails
  closed for PPKS public tracking in the meantime.
- Count and aggregate audits use one `ActivityLog` record with
  `VIEW_SENSITIVE` and no case identifier. Any future dedicated aggregate
  audit action or model requires a separate GPT-owned schema/contract task.
- General-ticket legacy content fields remain plaintext under their historical
  column names. Later writers must preserve the non-envelope convention and
  the SQL category guard.
- Independent review is complete as recorded below. This branch has not been
  merged into `integration/m4-features` or `main`.

## Independent review closure

Both independent reviews targeted exact review head
`2db6d67bfe260f0be7ac440b24afa8bdc70599d3`; no source commit followed it.

- Claude security/process re-review: **APPROVED**. Claude explicitly confirmed
  that the prior false per-case aggregate `VIEW allowed=true` defect is
  resolved, reproduced every acceptance command including 21/21 integration
  files and 89/89 tests, and ran five additional PostgreSQL probes covering
  collection audit semantics, password-change sessions, forged legacy session
  snapshots, and denied direct-ID equivalence.
- DeepSeek adversarial retest: **PASS**. The focused contract tests passed 4/4,
  focused PostgreSQL tests passed 6/6, and an independently written 12-case
  adversarial suite passed 12/12.
- DeepSeek's first full integration report recorded 86/89 because the review
  shell omitted two unrelated auth test secrets. A coordinator rerun initially
  exposed one synthetic PPKS fixture and associated audit rows left by the
  temporary adversarial suite. Only the exact synthetic marker was removed
  from the isolated `fuspi_dev_deepseek_ppks_review` database; no source or
  shared environment was changed. With the review worktree's database
  credentials and complete test secrets, the exact same review head then
  passed 21/21 integration files and 89/89 tests.
- The review build generated an uncommitted `next-env.d.ts` path change in the
  detached review worktree. It is not part of this branch or integration
  candidate.

The task therefore satisfies technical acceptance and is queueable by the
coordinator. Worker policy still forbids merging this branch into
`integration/m4-features` or `main` from this task worktree.
