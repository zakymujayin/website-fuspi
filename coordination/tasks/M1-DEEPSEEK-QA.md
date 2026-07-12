---
id: M1-DEEPSEEK-QA
milestone: M1
owner: deepseek
reviewer: gpt
tester: claude
base_sha: planning-baseline-v1
allowed_paths:
  - "tests/foundation/**"
  - "src/test/**"
  - "e2e/foundation/**"
  - "coordination/handoffs/M1-DEEPSEEK-QA-deepseek.md"
forbidden_paths:
  - "prisma/**"
  - "package.json"
  - "package-lock.json"
  - "src/app/globals.css"
  - "src/components/ui/**"
depends_on: []
contracts:
  - docs/06-autentikasi-role.md
  - docs/12-multibahasa-rtl.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
risk: medium
token_class: M
status: ready
---

# M1 DeepSeek QA

Create synthetic foundation fixtures, a threat-test inventory, locale/RTL negative cases, and database integration-test design without changing schema or dependencies. Tests that require the GPT migration must be prepared but marked pending until that contract merges.
