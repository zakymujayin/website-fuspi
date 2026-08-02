---
id: M4-GPT-PPKS-QUERY-ISOLATION
milestone: M4
owner: gpt
reviewer: claude
tester: deepseek
base_branch: integration/m4-features
base_sha: a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0
allowed_paths:
  - "src/contracts/ticket.ts"
  - "src/features/tickets/**"
  - "src/lib/tickets/**"
  - "tests/m4/tickets/**"
  - "coordination/handoffs/M4-GPT-PPKS-QUERY-ISOLATION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/proxy.ts"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/14-sistem-tiket-pengaduan-ppks.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "prisma/schema.prisma"
  - "src/contracts/auth.ts"
  - "src/contracts/operations.ts"
  - "src/lib/auth/**"
  - "src/lib/audit/**"
  - "src/lib/security/**"
  - "src/lib/sla/ticket.ts"
  - "src/lib/storage/**"
depends_on:
  - M3-GPT-PROCESS-RECONCILIATION-AND-EXIT
contracts:
  - prisma/schema.prisma
  - src/contracts/auth.ts
  - src/contracts/operations.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - "RUN_PLATFORM_DB_TESTS=true npm test"
  - npm run test:integration
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PPKS-QUERY-ISOLATION.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: critical
token_class: L
status: merged
---

# M4 GPT PPKS query isolation

Establish the single server-side query/authorization boundary for ticket data
before any PPKS route, UI, export, dashboard, or notification surface is built.
The existing schema and M2 crypto/storage/SLA primitives are frozen.

## Acceptance criteria

1. Every PPKS read authorizes the active session and `SATGAS_PPKS` role before
   selecting or decrypting sensitive fields.
2. Non-Satgas callers cannot infer a PPKS record through list, detail, count,
   aggregate, search, tracking token, export projection, error text, or timing-
   obvious alternate result shapes.
3. Authorized PPKS reads create the required access audit record; denied reads
   do not create misleading success audit records.
4. Shared strict Zod schemas validate every input/output boundary and expose no
   ciphertext, nonce, tag, key version, storage key, raw token, or technical
   exception.
5. General-ticket behavior remains available to its authorized roles without
   broadening PPKS access.
6. PostgreSQL-backed adversarial tests cover every role, direct-ID IDOR,
   cross-record scope, nonexistent-versus-forbidden equivalence, aggregate
   leakage, audit completeness, and decryption-after-authorization ordering.

No route or UI is part of this task. Commit the required handoff and stop.
