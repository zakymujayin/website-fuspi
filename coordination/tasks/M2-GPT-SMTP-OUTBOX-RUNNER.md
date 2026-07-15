---
id: M2-GPT-SMTP-OUTBOX-RUNNER
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 4432fb0
allowed_paths:
  - "package.json"
  - "package-lock.json"
  - ".env.example"
  - "src/contracts/platform.ts"
  - "src/lib/outbox/smtp.ts"
  - "src/lib/outbox/templates.ts"
  - "scripts/process-outbox.ts"
  - "tests/platform/outbox-smtp.test.ts"
  - "coordination/handoffs/M2-GPT-SMTP-OUTBOX-RUNNER-gpt.md"
forbidden_paths:
  - ".env"
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
  - "src/lib/db/client.ts"
  - "src/lib/outbox/enqueue.ts"
  - "src/lib/outbox/worker.ts"
depends_on:
  - M2-GPT-OUTBOX-WORKER
contracts:
  - docs/01-arsitektur.md
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
  - TASK_MANIFEST=coordination/tasks/M2-GPT-SMTP-OUTBOX-RUNNER.md TASK_BASE=origin/coordination/m2-gpt-smtp-runner-assignment npm run check:scope
risk: high
token_class: M
status: ready
---

# M2 GPT SMTP Adapter and Outbox Runner

Connect the frozen transactional-outbox worker to a strict SMTP transport and a cron-safe,
single-batch command. Do not change the worker claim/state machine.

## Required implementation

1. Add pinned Nodemailer 7 and compatible type definitions. Parse SMTP and runner environment
   through strict Zod contracts: host, port, secure boolean, credentials, sender, bounded
   connection/socket timeout, and safe worker ID/batch/lock/backoff settings.
2. Create an injected Nodemailer transport adapter with TLS certificate verification,
   connection/socket timeout, no logger/debug mode, and STARTTLS required when `secure=false`.
3. Validate recipients again at delivery. Render only an explicit allowlist of templates in
   ID/EN/AR, escape all interpolated values, provide text and minimal HTML, and reject unknown
   templates or encrypted payloads with one generic error. Never place PPKS content, tokens,
   storage keys, ciphertext, technical errors, or raw idempotency keys into message headers or
   bodies.
4. Add a one-shot `npm run outbox:process` runner that constructs Prisma, SMTP sender, and the
   existing worker; processes one bounded batch; prints aggregate counts only; disconnects in
   `finally`; and exits non-zero with a generic message on configuration/database failure.
5. Ensure provider failure is returned to the existing worker so the database retry/backoff
   state remains authoritative. Do not retry inside Nodemailer.
6. Add mock-transport tests for TLS/timeout configuration, ID/EN/AR rendering, escaping,
   unknown/sensitive rejection, recipient validation, aggregate-only runner result shape, and
   provider failure propagation. No network SMTP test belongs in the repository suite.

This task must not add cron/systemd files, admin retry UI, domain templates, routes, schema or
migrations, sensitive-payload decryption, provider-specific APIs, logging of mail data, or
changes to the frozen worker/enqueue modules.
