---
id: M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING
milestone: M2
owner: gpt
base_branch: feat/lecturer-portal-complaint-booking
base_sha: 5ea8ec17b11632c353e754621800db27da0e579d
allowed_paths:
  - "coordination/tasks/M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING.md"
  - "coordination/handoffs/M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING-gpt.md"
  - "src/components/auth/password-change-form.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m2/ui/password-change-form.test.tsx"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/lib/auth/runtime/password.ts"
  - "src/lib/auth/runtime/session.ts"
  - "src/lib/auth/runtime/cookie.ts"
  - "src/lib/auth/runtime/csrf.ts"
readonly_paths:
  - "src/app/api/auth/password/route.ts"
  - "src/contracts/auth.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "docs/06-autentikasi-role.md"
  - "docs/20-test-acceptance-go-live.md"
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING.md TASK_BASE=5ea8ec17b11632c353e754621800db27da0e579d npm run check:scope"
risk: high
token_class: S
status: active
---

# M2 GPT Auth Password Change Client Hardening

Fix the password-change client flow so a successful password rotation provides a
visible success status and follows the server-issued redirect with a fresh document
navigation after the replacement session cookie is issued.

Do not change password policy, password hashing, session revocation, cookie naming,
or auth server contracts in this corrective task.
