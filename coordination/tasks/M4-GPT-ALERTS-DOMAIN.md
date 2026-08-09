---
id: M4-GPT-ALERTS-DOMAIN
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: b6f8f2887f3196bc4c7632f1eac17695dd7faaef
allowed_paths:
  - "src/features/alerts/**"
  - "src/app/api/admin/alerts\/** src\/app\/api\/public/alerts/**"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/lib/db/**"
  - "src/contracts/**"
risk: medium
token_class: L
status: merged
---

Implemented domain logic and API routes.

Files:
- src/features/alerts/domain.ts
- src/app/api/admin/alerts\/route.ts src\/app\/api\/public/alerts/route.ts
