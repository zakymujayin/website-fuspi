---
id: M4-GPT-TICKET-WORKFLOW
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: b6f8f2887f3196bc4c7632f1eac17695dd7faaef
allowed_paths:
  - "src/features/tickets/**"
  - "src/app/api/admin/tickets/workflow\/** src\/app\/api\/public/tickets/**"
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
- src/features/tickets/workflow.ts
- src/app/api/admin/tickets/workflow\/route.ts src\/app\/api\/public/tickets/route.ts
