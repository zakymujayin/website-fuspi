---
id: M4-GPT-PPKS-BOOKING-ADOPTION-HARDENING
milestone: M4
title: Adopt cross-lane complaint, PPKS, booking, auth, and lecturer-import hardening
risk: critical
writer_model: gpt
reviewer_model: owner
tester_model: gpt
base_branch: main
base_sha: 10e00330e59764268bb223023b2883d08ac77680
depends_on:
  - M4-CLAUDE-LECTURER-PROFILE-PAGES
  - M4-GPT-PPKS-QUERY-ISOLATION
  - M4-GPT-BOOKING-DOMAIN
  - M4-GPT-ACADEMIC-EDITOR-IMPORT-RUNTIME
spec_refs:
  - docs/README.md
  - docs/06-autentikasi-role.md
  - docs/09-fitur-cms-editor.md
  - docs/14-sistem-tiket-pengaduan-ppks.md
  - docs/15-peminjaman-gedung-jadwal.md
  - docs/24-implementation-plan-multi-model.md
  - coordination/handoffs/M4-CLAUDE-LECTURER-PROFILE-PAGES-claude.md
  - coordination/prompts/M4-GPT-PPKS-PLATFORM-CONTINUATION.md
allowed_paths:
  - ".env.example"
  - "package.json"
  - "package-lock.json"
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "prisma/seed.ts"
  - "src/app/[locale]/admin/layout.tsx"
  - "src/app/[locale]/admin/impor-dosen/page.tsx"
  - "src/app/[locale]/admin/peminjaman/**"
  - "src/app/[locale]/admin/pengaduan/ppks/**"
  - "src/app/[locale]/(public)/dosen/**"
  - "src/app/[locale]/(public)/peminjaman/**"
  - "src/app/[locale]/(public)/pengaduan/**"
  - "src/app/[locale]/(public)/pengaduan/ppks/**"
  - "src/app/[locale]/portal-dosen/**"
  - "src/app/api/admin/ppks/**"
  - "src/app/api/admin/bookings/**"
  - "src/app/api/admin/rooms/**"
  - "src/app/api/public/bookings/**"
  - "src/app/api/public/tickets/route.ts"
  - "src/components/admin/admin-sidebar-data.ts"
  - "src/components/admin/booking/**"
  - "src/components/admin/lecturer-import/**"
  - "src/components/admin/ppks/**"
  - "src/components/portal/**"
  - "src/components/public/booking/**"
  - "src/components/public/nav-items.test.ts"
  - "src/components/public/complaint/**"
  - "src/components/public/ppks/**"
  - "src/config/institution.ts"
  - "src/config/institution.test.ts"
  - "src/config/ppks-support.ts"
  - "src/contracts/**"
  - "src/features/academic/lecturer-account-provisioning.ts"
  - "src/features/academic/lecturer-csv-import.ts"
  - "src/features/booking/**"
  - "src/features/lecturer-portal/**"
  - "src/features/tickets/**"
  - "src/lib/auth/**"
  - "src/lib/outbox/templates.ts"
  - "src/lib/storage/**"
  - "src/lib/tickets/**"
  - "src/test/fixtures.test.ts"
  - "src/test/identity-contracts.test.ts"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/platform/**"
  - "tests/security/**"
  - "coordination/handoffs/M4-CLAUDE-LECTURER-PROFILE-PAGES-claude.md"
  - "coordination/prompts/M4-GPT-PPKS-PLATFORM-CONTINUATION.md"
  - "coordination/tasks/M4-GPT-PPKS-BOOKING-ADOPTION-HARDENING.md"
  - "coordination/handoffs/M4-GPT-PPKS-BOOKING-ADOPTION-HARDENING-gpt.md"
readonly_paths:
  - "AGENTS.md"
  - "docs/**"
  - "coordination/ownership.yml"
forbidden_paths:
  - "src/generated/**"
contracts:
  - src/contracts/auth.ts
  - src/contracts/academic.ts
  - src/contracts/ticket.ts
  - src/contracts/storage.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm run test
  - "set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/"
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PPKS-BOOKING-ADOPTION-HARDENING.md TASK_BASE=main npm run check:scope"
token_class: L
status: active
---

## Intent

Adopt the cross-lane branch into the GPT/platform lane and close the verified
security and workflow gaps before any other lane rebases: PPKS attachments,
content-free PPKS notifications, booking staff decisions, requester
cancellation, centralized route role decisions, XLSX import support, and the
five-program FUSPI study-program contract.

## Acceptance Criteria

- PPKS intake accepts optional encrypted PDF/image attachments and stores only
  ciphertext under `PPKS_PRIVATE_DIR`.
- PPKS attachment download is available only to `SATGAS_PPKS` and records
  `TicketAccessLog.action = ATTACHMENT_DOWNLOAD` before returning bytes.
- PPKS intake enqueues a content-free sensitive outbox notification when a
  configured Satgas recipient exists; no report text, identity, token, or
  attachment name enters the email payload.
- PPKS intake fails closed when HMAC/encryption secrets are missing.
- Booking approval, rejection, and staff cancellation call `executeBookingCommand`;
  public requester cancellation is token-gated.
- Protected-route decisions can encode role requirements centrally rather than
  every layout cloning the same check.
- `src/config/institution.ts` and academic contracts agree on the five v1 study
  programs, in order: IAT, IH, AFI, SAA, TASPI.
- Lecturer import supports XLSX through an explicit dependency or documents a
  deliberate contract deferral in code and handoff.
- The full security integration suite exits successfully with `.env` loaded.

## Handoff Requirements

Use `coordination/handoffs/TEMPLATE.md` and commit it with the task.
