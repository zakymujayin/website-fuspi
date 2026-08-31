---
id: M4-GPT-FUSPI-TO-SILA-HANDOFF
milestone: M4
owner: gpt
base_branch: feat/lecturer-portal-complaint-booking
base_sha: d85e9f73f3a6b0614bc7942d7497feb83a765b7e
allowed_paths:
  - "coordination/tasks/M4-GPT-FUSPI-TO-SILA-HANDOFF.md"
  - "coordination/handoffs/M4-GPT-FUSPI-TO-SILA-HANDOFF-gpt.md"
  - ".env.example"
  - "docs/23-integrasi-sila-e-layanan.md"
  - "src/lib/auth/runtime/sila-handoff.ts"
  - "src/app/api/auth/sila/launch/route.ts"
  - "src/components/public/services-section.tsx"
  - "tests/platform/auth-bridge/sila-handoff.test.ts"
forbidden_paths:
  - "src/config/institution.ts"
  - "src/lib/ppks-support.ts"
  - "package.json"
  - "package-lock.json"
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "next-env.d.ts"
readonly_paths:
  - "docs/README.md"
  - "docs/06-autentikasi-role.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "/home/zhev/myproject/e-layanan/**"
contracts:
  - docs/06-autentikasi-role.md
  - docs/23-integrasi-sila-e-layanan.md
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-FUSPI-TO-SILA-HANDOFF.md TASK_BASE=d85e9f73f3a6b0614bc7942d7497feb83a765b7e npm run check:scope"
risk: critical
token_class: M
status: active
---

# M4 GPT FUSPI to SILA Handoff

Add the FUSPI-side handoff for staff/lecturer users who are already signed in
to FUSPI and click SILA from the homepage. The handoff must be short-lived,
signed server-side, disabled until configured, and must not share cookies,
database sessions, or passwords with SILA.
