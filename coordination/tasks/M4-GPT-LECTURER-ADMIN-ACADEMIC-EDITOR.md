---
id: M4-GPT-LECTURER-ADMIN-ACADEMIC-EDITOR
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: c6f556c
allowed_paths:
  - "src/app/[locale]/admin/dosen/[id]/edit/page.tsx"
  - "src/components/admin/lecturer/lecturer-academic-records-actions.ts"
  - "src/components/admin/lecturer/lecturer-academic-records-manager.tsx"
  - "tests/m4/ui/admin-lecturer-academic-records.test.tsx"
  - "coordination/tasks/M4-GPT-LECTURER-ADMIN-ACADEMIC-EDITOR.md"
  - "coordination/handoffs/M4-GPT-LECTURER-ADMIN-ACADEMIC-EDITOR-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "src/generated/**"
  - "src/components/ui/**"
  - "src/app/globals.css"
  - "coordination/ownership.yml"
depends_on:
  - M4-GPT-LECTURER-ACADEMIC-BACKEND
contracts:
  - src/contracts/lecturer-academic.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
risk: medium
token_class: M
status: complete
---

# Admin lecturer academic editor

Connect the existing ADMIN lecturer edit page to HKI and teaching-assignment
CRUD actions backed by the lecturer academic domain contract.
