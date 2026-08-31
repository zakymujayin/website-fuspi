---
id: M4-GPT-BOOKING-RBAC-SILA-READY
milestone: M4
owner: gpt
base_branch: feat/lecturer-portal-complaint-booking
base_sha: 0216f2838e45f9d1e669c81b0faea2d397dc80f7
allowed_paths:
  - "coordination/tasks/M4-GPT-BOOKING-RBAC-SILA-READY.md"
  - "coordination/handoffs/M4-GPT-BOOKING-RBAC-SILA-READY-gpt.md"
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "src/generated/prisma/**"
  - "src/contracts/auth.ts"
  - "src/features/booking/**"
  - "src/lib/auth/runtime/redirect.ts"
  - "src/proxy.ts"
  - "src/app/[locale]/admin/layout.tsx"
  - "src/app/[locale]/admin/page.tsx"
  - "src/app/[locale]/admin/peminjaman/**"
  - "src/app/api/admin/bookings/**"
  - "src/components/admin/admin-layout-shell.tsx"
  - "src/components/admin/admin-sidebar.tsx"
  - "src/components/admin/admin-sidebar-data.ts"
  - "src/components/admin/booking/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/security/public-booking-flow.integration.test.ts"
  - "tests/platform/lecturer-portal/lecturer-portal.test.ts"
  - "tests/m4/contracts/admin-foundation-contracts.test.ts"
  - "tests/m4/runtime/admin-foundation-transport.test.ts"
  - "tests/security/admin-foundation-adversarial.integration.test.ts"
forbidden_paths:
  - "src/config/institution.ts"
  - "src/lib/ppks-support.ts"
  - "package.json"
  - "package-lock.json"
readonly_paths:
  - "docs/README.md"
  - "docs/15-peminjaman-gedung-jadwal.md"
  - "docs/24-implementation-plan-multi-model.md"
acceptance_commands:
  - npm run prisma:validate
  - npm run prisma:generate
  - npm run lint
  - npm run typecheck
  - npm run test
  - "set -a && . ./.env && set +a && npx prisma migrate deploy"
  - "set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/public-booking-flow.integration.test.ts"
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-BOOKING-RBAC-SILA-READY.md TASK_BASE=0216f2838e45f9d1e669c81b0faea2d397dc80f7 npm run check:scope"
status: active
---

# M4 GPT Booking RBAC SILA Ready

Add explicit institutional roles for the booking disposition workflow while
keeping the login/session boundary provider-neutral for a future SILA SSO bridge.
