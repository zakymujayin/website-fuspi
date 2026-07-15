# Handoff — M2-GPT-OUTBOX-WORKER — GPT

- Branch: `ai/gpt/m2-outbox-worker`
- Base SHA: `aa048c3`
- Implementation head SHA: `b4c6a8f`

## Result

Implemented the PostgreSQL transactional-outbox delivery state machine:

- strict worker configuration with a bounded worker ID, batch size, five-attempt ceiling,
  stale-lock timeout, and bounded exponential backoff;
- atomic ordered claims through `FOR UPDATE SKIP LOCKED`, including stale `PROCESSING` lock
  recovery and one attempt increment per successful claim;
- ownership-checked terminal transitions: successful delivery becomes `SENT`, while failures
  become retryable `FAILED` rows until attempt five is exhausted;
- injected sender and repository boundaries so provider delivery remains separate from the
  database/concurrency contract;
- per-message failure isolation and a single persisted `DELIVERY_FAILED` classification,
  without logging or storing recipient/payload/provider exception details;
- deterministic policy tests and PostgreSQL integration tests for parallel workers, stale
  claims, terminal replay rejection, final-attempt exhaustion, and ownership mismatch.

No schema/migration, package, environment variable, SMTP/Nodemailer, template, cron/script,
route, admin UI, domain mutation, or logging change was added.

## Files changed

- `src/contracts/platform.ts`
- `src/lib/outbox/worker.ts`
- `tests/platform/outbox-worker.test.ts`
- `tests/platform/outbox-worker.integration.test.ts`
- `coordination/handoffs/M2-GPT-OUTBOX-WORKER-gpt.md`

## Contract/schema/migration impact

- Added the outbox worker configuration contract and delivery/repository interfaces.
- Reused the frozen PostgreSQL `NotificationOutbox` schema and existing enqueue contract.
- No Prisma schema, migration, generated client, dependency, lockfile, or env-contract change.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npx vitest run tests/platform/outbox-worker.test.ts` | PASS — 5 passed |
| `npm test` | PASS — 320 passed, 37 DB-gated skipped |
| `npm run test:integration` with an isolated migrated PostgreSQL database and test-only secrets | PASS — 37 passed |
| `npm run build` with documented build-only PostgreSQL/Auth/HMAC environment | PASS |
| `npm audit --audit-level=high` | PASS — exit 0; 0 High/Critical, 5 Moderate transitive advisories |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M2-GPT-OUTBOX-WORKER.md TASK_BASE=origin/coordination/m2-gpt-outbox-worker-assignment npm run check:scope` | PASS — 5 changed files within lease |

The first integration invocation inherited the deleted project's stale MariaDB URL and
failed the PostgreSQL protocol guard before any test body ran. No code was changed to bypass
that guard. A dedicated PostgreSQL database was created, the migration was applied, and the
complete 37-test integration suite then passed.

## Untested areas

- SMTP transport, TLS/provider authentication, ID/EN/AR template rendering, and provider
  response classification are intentionally outside this worker-state task.
- Cron/systemd scheduling and the authorized admin retry trigger remain deployment/UI tasks.
- Production multi-process behavior still requires staging evidence with production-like
  PostgreSQL topology and worker scheduling.

## Risks and follow-ups

- Database claiming prevents concurrent workers from sending the same live claim. No generic
  SMTP protocol can guarantee exactly-once delivery if a process crashes after provider
  acceptance but before the `SENT` update; the later provider adapter should pass the stable
  `idempotencyKey` where the provider supports deduplication.
- A stale timeout shorter than actual provider latency could allow reclaim while a slow
  worker is still sending. Deployment configuration must exceed the bounded send timeout.
- Attempt five retains `FAILED` plus `nextAttemptAt` for operator visibility, but the claim
  predicate permanently excludes it through `attempts < 5`.
- Five existing Moderate transitive advisories remain because automated fixes require
  breaking dependency downgrades.

## Requested shared changes

None. The next GPT contract task may add the SMTP adapter and scheduled runner on top of this
state machine without changing its claim/ownership guarantees.
