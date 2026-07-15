---
id: M2-GPT-OUTBOX-WORKER
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 9eb7eda
allowed_paths:
  - "src/contracts/platform.ts"
  - "src/lib/outbox/**"
  - "tests/platform/outbox-worker.test.ts"
  - "tests/platform/outbox-worker.integration.test.ts"
  - "coordination/handoffs/M2-GPT-OUTBOX-WORKER-gpt.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/features/**"
  - "src/lib/auth/**"
  - "src/lib/security/**"
  - "src/lib/storage/**"
  - "src/proxy.ts"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/lib/db/client.ts"
  - "src/lib/outbox/enqueue.ts"
depends_on:
  - M2-GPT-CRYPTO-HMAC-PRIMITIVES
contracts:
  - docs/13-celah-fitur-keamanan-operasional.md
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-OUTBOX-WORKER.md TASK_BASE=origin/coordination/m2-gpt-outbox-worker-assignment npm run check:scope
risk: high
token_class: M
status: merged
---

# M2 GPT Transactional Outbox Worker

Implement the concurrency-safe delivery state machine behind `NotificationOutbox`. SMTP,
templates, routes, and deployment scheduling remain separate tasks.

## Required implementation

1. Add strict worker configuration and delivery-envelope contracts: bounded worker ID and
   batch size, positive lock timeout, maximum five attempts, and bounded exponential backoff.
2. Atomically claim eligible `PENDING`/retryable `FAILED` rows using PostgreSQL row locks with
   `SKIP LOCKED`. Recover stale `PROCESSING` locks, increment attempts exactly once per claim,
   and never claim `SENT` or exhausted rows.
3. Complete or fail a claim only when its `lockedBy` still matches. Success sets `SENT`,
   `sentAt`, and clears lock/error fields. Failure schedules bounded exponential retry, clears
   the lock, and leaves attempt five permanently exhausted.
4. Expose an injected sender boundary and a batch processor. A send failure must not abort
   other claimed messages. Do not log recipient, payload, ciphertext, provider response, or
   technical exception; persist only a generic bounded failure classification.
5. Preserve enqueue idempotency. Reprocessing a `SENT` row or running parallel workers must
   not send the same claimed row twice during normal processing. Document the unavoidable
   crash-after-provider-acceptance boundary for the later SMTP/provider task.
6. Add deterministic unit tests for state transitions/backoff and PostgreSQL integration
   tests for parallel claims, stale-lock recovery, ownership checks, successful terminal
   state, retry scheduling, and attempt exhaustion.

This task must not add Nodemailer/SMTP, scripts/cron, admin retry UI, API routes, schema or
migration changes, environment variables, email templates, logging, or domain mutations.
