---
id: M4-GPT-PRIVACY-DOMAIN
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: b6f8f2887f3196bc4c7632f1eac17695dd7faaef
allowed_paths:
  - "src/features/privacy/**"
  - "src/app/api/admin/privacy\/** src\/app\/api\/public/privacy/**"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/lib/db/**"
  - "src/contracts/**"
risk: high
token_class: L
status: merged
---

Implemented domain logic and API routes.

Files:
- src/features/privacy/domain.ts
- src/app/api/admin/privacy\/route.ts src\/app\/api\/public/privacy/route.ts
