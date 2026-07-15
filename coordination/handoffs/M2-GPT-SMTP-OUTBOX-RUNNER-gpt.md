# Handoff — M2-GPT-SMTP-OUTBOX-RUNNER — GPT

- Branch: `ai/gpt/m2-smtp-outbox-runner`
- Base SHA: `3b5961a`
- Implementation head SHA: `04ca7eb`

## Result

Connected the transactional outbox worker to a hardened SMTP adapter and one-shot runner:

- strict Zod parsing for SMTP, TLS mode, credentials, sender, bounded timeouts, worker ID,
  batch, lock timeout, and retry/backoff environment values;
- Nodemailer SMTP transport with certificate verification, TLS 1.2 minimum, mandatory
  STARTTLS when implicit TLS is disabled, bounded connection/greeting/socket timeouts, and
  file/URL access disabled;
- allowlisted `content-review-due` rendering in ID/EN/AR with text and minimal escaped HTML,
  correct Arabic RTL, recipient validation, and generic rejection of unknown/encrypted mail;
- provider errors collapse to one generic delivery error and flow back to the existing worker
  so its database retry state remains authoritative;
- `npm run outbox:process` processes exactly one bounded batch, emits aggregate counters only,
  disconnects Prisma in `finally`, and reports configuration/database failures generically.

No real SMTP email was sent. No schema/migration, cron/systemd, route, admin UI, domain
mutation, sensitive-payload decryption, or frozen worker/enqueue change was added.

## Files changed

- `package.json`
- `package-lock.json`
- `.env.example`
- `src/contracts/platform.ts`
- `src/lib/outbox/smtp.ts`
- `src/lib/outbox/templates.ts`
- `scripts/process-outbox.ts`
- `tests/platform/outbox-smtp.test.ts`
- `coordination/handoffs/M2-GPT-SMTP-OUTBOX-RUNNER-gpt.md`

## Contract/schema/migration impact

- Added the SMTP/runner environment contract and documented its example values.
- Added patched Nodemailer `9.0.3` as the runtime alias `fuspi-nodemailer`, with compatible
  type definitions. The alias prevents collision with Auth.js's unused optional Nodemailer 7
  peer while keeping the outbox runtime above the current High advisory range.
- No Prisma schema, migration, generated client, auth configuration, or route change.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npx vitest run tests/platform/outbox-smtp.test.ts tests/platform/outbox-worker.test.ts` | PASS — 14 passed |
| `npm test` | PASS — 329 passed, 37 DB-gated skipped |
| `npm run test:integration` with isolated migrated PostgreSQL and test-only secrets | PASS — 37 passed |
| `npm run build` with documented build-only PostgreSQL/Auth/HMAC environment | PASS |
| `npm ci --dry-run` | PASS; package and lockfile synchronized |
| `npm ls nodemailer fuspi-nodemailer` | PASS; only isolated `fuspi-nodemailer@9.0.3` runtime |
| `npm audit --audit-level=high` | PASS — exit 0; 0 High/Critical, 5 Moderate transitive advisories |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M2-GPT-SMTP-OUTBOX-RUNNER.md TASK_BASE=origin/coordination/m2-gpt-smtp-runner-assignment npm run check:scope` | PASS — 9 changed files within lease |

The initially selected Nodemailer 7 line immediately produced a High advisory with no fixed
7.x release. Direct Nodemailer 9 fixed the advisory but conflicted with Auth.js's unused
optional 7.x peer. The final package uses a runtime alias for patched 9.0.3; both `npm ls` and
clean-install dry-run now pass without installing the vulnerable optional peer.

## Untested areas

- Real SMTP connectivity, credentials, SPF/DKIM/DMARC, provider timeout behavior, and actual
  ID/EN/AR delivery require the production-like staging SMTP gate.
- Cron/systemd scheduling every five minutes and the authorized admin fallback trigger remain
  separate deployment/admin tasks.
- Only the platform `content-review-due` template is registered. Domain tasks must add their
  own reviewed templates through a new manifest before enqueueing them.

## Risks and follow-ups

- The runner deliberately rejects encrypted payloads. A later sensitive-domain contract must
  decrypt in memory and render a content-free notification without exposing PPKS data.
- SMTP transport cannot guarantee exactly-once delivery after provider acceptance followed by
  process crash; the stable database idempotency contract and provider deduplication remain the
  mitigation documented by the worker task.
- Production lock timeout must remain longer than SMTP timeout plus bounded processing time.
- Five existing Moderate transitive advisories remain because automated fixes require
  breaking dependency downgrades.

## Requested shared changes

None. Deployment must provide the documented SMTP/worker environment values and schedule the
one-shot command every five minutes after a real SMTP staging test succeeds.
