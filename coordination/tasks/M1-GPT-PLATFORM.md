---
id: M1-GPT-PLATFORM
milestone: M1
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: planning-baseline-v1
allowed_paths:
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/db/**"
  - "src/lib/audit/**"
  - "src/lib/outbox/**"
  - "tests/platform/**"
  - "coordination/handoffs/M1-GPT-PLATFORM-gpt.md"
forbidden_paths:
  - "src/app/globals.css"
  - "src/components/ui/**"
  - "messages/**"
depends_on: []
contracts:
  - docs/02-database-schema.md
  - docs/20-test-acceptance-go-live.md
  - docs/21-tata-kelola-privasi-alert.md
acceptance_commands:
  - npm run prisma:format
  - npm run prisma:validate
  - npm run typecheck
  - npm test
risk: high
token_class: L
status: ready
---

# M1 GPT Platform

Review the canonical v1 schema against docs 02, create the initial migration only against an isolated MariaDB database, make seed execution demonstrably idempotent, and add typed platform contracts/primitives for revision, audit, and outbox. Do not implement Auth/PPKS/booking security core yet.
