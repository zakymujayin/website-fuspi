---
id: M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT
milestone: M4
owner: gpt
base_branch: feat/lecturer-portal-complaint-booking
base_sha: 3a7fc8e905b38c0a081212f2a9c52ec864defb65
allowed_paths:
  - "coordination/tasks/M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT.md"
  - "coordination/handoffs/M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT-gpt.md"
  - "src/app/[locale]/(auth)/login/page.tsx"
  - "src/app/api/auth/password/route.ts"
  - "src/lib/auth/runtime/redirect.ts"
  - "tests/platform/lecturer-portal/lecturer-portal.test.ts"
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
  - "docs/22-calon-mahasiswa-akademik-discoverability.md"
  - "docs/24-implementation-plan-multi-model.md"
contracts:
  - docs/06-autentikasi-role.md
  - docs/22-calon-mahasiswa-akademik-discoverability.md
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - npx vitest run tests/platform/lecturer-portal/lecturer-portal.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT.md TASK_BASE=3a7fc8e905b38c0a081212f2a9c52ec864defb65 npm run check:scope"
risk: high
token_class: S
status: active
---

# M4 GPT Lecturer Portal Login Redirect

Ensure every successful lecturer authentication path lands in the lecturer self-service portal, including active-session visits to `/login` and the mandatory temporary-password rotation flow.
