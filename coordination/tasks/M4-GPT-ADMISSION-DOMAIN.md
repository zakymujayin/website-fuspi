---
id: M4-GPT-ADMISSION-DOMAIN
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: b6f8f2887f3196bc4c7632f1eac17695dd7faaef
allowed_paths:
  - "src/features/admission/**"
  - "src/app/api/admin/admission\/** src\/app\/api\/public/admission/**"
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
- src/features/admission/domain.ts
- src/app/api/admin/admission\/route.ts src\/app\/api\/public/admission/route.ts
