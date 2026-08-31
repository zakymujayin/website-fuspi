---
id: M4-GPT-SILA-SSO-BRIDGE
milestone: M4
owner: gpt
base_branch: feat/lecturer-portal-complaint-booking
base_sha: fdf1669eb9afb16c146c471d0f6652e9ff9f8bc0
allowed_paths:
  - "coordination/tasks/M4-GPT-SILA-SSO-BRIDGE.md"
  - "coordination/handoffs/M4-GPT-SILA-SSO-BRIDGE-gpt.md"
  - ".env.example"
  - "docs/23-integrasi-sila-e-layanan.md"
  - "src/contracts/auth.ts"
  - "src/lib/auth/runtime/sila-sso.ts"
  - "src/app/api/auth/sila/start/route.ts"
  - "src/app/api/auth/sila/callback/route.ts"
  - "src/app/[locale]/(auth)/login/page.tsx"
  - "src/components/auth/login-form.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/platform/auth-bridge/sila-sso.test.ts"
forbidden_paths:
  - "src/config/institution.ts"
  - "src/lib/ppks-support.ts"
  - "package.json"
  - "package-lock.json"
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
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
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-SILA-SSO-BRIDGE.md TASK_BASE=fdf1669eb9afb16c146c471d0f6652e9ff9f8bc0 npm run check:scope"
risk: critical
token_class: M
status: active
---

# M4 GPT SILA SSO Bridge

Implement the FUSPI-side SSO bridge for a future official SILA OIDC provider.
The bridge must stay disabled until explicit server-side SILA SSO environment
variables are configured. Do not infer the SILA public domain, share
databases/sessions/secrets, or auto-provision FUSPI privileges from a client
claim.
