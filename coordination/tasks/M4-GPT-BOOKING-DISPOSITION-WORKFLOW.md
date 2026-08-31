---
id: M4-GPT-BOOKING-DISPOSITION-WORKFLOW
milestone: M4
owner: gpt
base_branch: feat/lecturer-portal-complaint-booking
allowed_paths:
  - "coordination/tasks/M4-GPT-BOOKING-DISPOSITION-WORKFLOW.md"
  - "coordination/handoffs/M4-GPT-BOOKING-DISPOSITION-WORKFLOW-gpt.md"
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "src/generated/prisma/**"
  - "src/features/booking/**"
  - "src/components/public/booking/**"
  - "src/components/admin/booking/**"
  - "src/app/[locale]/(public)/peminjaman/ajukan/page.tsx"
  - "src/app/[locale]/admin/peminjaman/**"
  - "src/app/api/admin/bookings/**"
  - "src/app/api/public/bookings/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/security/public-booking-flow.integration.test.ts"
forbidden_paths:
  - "src/config/institution.ts"
  - "src/lib/ppks-support.ts"
  - "package.json"
  - "package-lock.json"
readonly_paths:
  - "docs/README.md"
  - "docs/15-peminjaman-gedung-jadwal.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "src/lib/storage/**"
  - "src/lib/auth/**"
  - "src/contracts/**"
acceptance_commands:
  - npm run prisma:validate
  - npm run prisma:generate
  - npm run lint
  - npm run typecheck
  - npm run test
  - "set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/public-booking-flow.integration.test.ts"
  - npm run build
status: active
---

# M4-GPT-BOOKING-DISPOSITION-WORKFLOW

## Owner

- Model: GPT
- Lane: platform/contracts, Prisma, booking workflow, storage/privacy, admin authorization
- Branch: `feat/lecturer-portal-complaint-booking`

## Context

The room/facility borrowing flow must reflect the campus manual process:

1. Student or student organization submits a formal application letter.
2. General affairs staff validates the letter and disposes it to the dean.
3. The dean forwards the request to vice dean or head of administration for follow-up.
4. Availability is checked so approved room/facility usage never overlaps.
5. The request is approved, rejected, revised, or cancelled with a durable history.

## Allowed Paths

- `coordination/tasks/M4-GPT-BOOKING-DISPOSITION-WORKFLOW.md`
- `coordination/handoffs/M4-GPT-BOOKING-DISPOSITION-WORKFLOW-gpt.md`
- `prisma/schema.prisma`
- `prisma/migrations/**`
- `src/generated/prisma/**`
- `src/features/booking/**`
- `src/components/public/booking/**`
- `src/app/[locale]/(public)/peminjaman/ajukan/page.tsx`
- `src/components/admin/booking/**`
- `src/app/[locale]/admin/peminjaman/**`
- `src/app/api/admin/bookings/**`
- `src/app/api/public/bookings/**`
- `messages/id.json`
- `messages/en.json`
- `messages/ar.json`
- `tests/security/public-booking-flow.integration.test.ts`

## Readonly Paths

- `docs/README.md`
- `docs/15-peminjaman-gedung-jadwal.md`
- `docs/24-implementation-plan-multi-model.md`
- `src/lib/storage/**`
- `src/lib/auth/**`
- `src/contracts/**`

## Forbidden Paths

- `src/config/institution.ts`
- `src/lib/ppks-support.ts`
- `package.json`
- `package-lock.json`

## Acceptance Commands

```bash
npm run prisma:validate
npm run prisma:generate
npm run lint
npm run typecheck
npm run test
set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run tests/security/public-booking-flow.integration.test.ts
```
