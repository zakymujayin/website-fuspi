---
id: M2-GPT-TICKET-ENUM-CONTRACT-CORRECTION
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: c6edfbd
allowed_paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/20260715193000_correct_ticket_enums/**"
  - "src/generated/prisma/**"
  - "src/contracts/operations.ts"
  - "tests/platform/ticket-enum-contract.test.ts"
  - "tests/platform/ticket-enum-contract.integration.test.ts"
  - "coordination/handoffs/M2-GPT-TICKET-ENUM-CONTRACT-CORRECTION-gpt.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "src/app/**"
  - "src/components/**"
  - "src/features/**"
  - "src/lib/**"
  - "src/proxy.ts"
readonly_paths:
  - "docs/02-database-schema.md"
  - "docs/14-sistem-tiket-pengaduan-ppks.md"
  - "prisma/migrations/20260714182351_init_postgresql/migration.sql"
depends_on:
  - M2-GPT-ANNUAL-SEQUENCE-SLA
contracts:
  - docs/02-database-schema.md
  - docs/14-sistem-tiket-pengaduan-ppks.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run prisma:validate
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-TICKET-ENUM-CONTRACT-CORRECTION.md TASK_BASE=origin/coordination/m2-gpt-ticket-enum-assignment npm run check:scope
risk: high
token_class: M
status: merged
---

# M2 GPT Ticket Enum Contract Correction

Correct the migrated Ticket enums that still contain pre-plan inventory values. The normative
contracts are the final Ticket definitions in docs 02 and 14.

## Required implementation

1. Correct `ComplaintCategory` to exactly `AKADEMIK`, `KEMAHASISWAAN`, `SARANA`,
   `PELECEHAN_SEKSUAL`, `LAINNYA`.
2. Correct `TicketPriority` to exactly `RENDAH`, `SEDANG`, `TINGGI`, `URGENT`, defaulting to
   `SEDANG`.
3. Correct `TicketStatus` to exactly `BARU`, `DIVERIFIKASI`, `DIPROSES`,
   `MENUNGGU_PELAPOR`, `SELESAI`, `DITOLAK`.
4. Add a corrective PostgreSQL migration; never edit the merged initial migration. Preserve
   legacy rows deterministically: FASILITAS -> SARANA, LAYANAN/KEUANGAN -> LAINNYA,
   NORMAL -> SEDANG, and DARURAT -> URGENT, and DITUTUP -> DITOLAK.
5. Regenerate Prisma output and bind the SLA priority Zod contract to the generated enum so
   schema and runtime cannot drift silently again.
6. Add unit and PostgreSQL catalog/default tests for exact enum values. No Ticket workflow,
   routes, UI, seed data, or unrelated schema correction belongs in this task.
