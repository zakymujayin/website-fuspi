---
id: M1-CLAUDE-EXPERIENCE
milestone: M1
owner: claude
reviewer: gpt
tester: deepseek
base_sha: planning-baseline-v1
allowed_paths:
  - "src/app/[locale]/(public)/**"
  - "src/components/public/**"
  - "src/components/ui/**"
  - "src/app/globals.css"
  - "messages/**"
  - "e2e/experience/**"
  - "coordination/handoffs/M1-CLAUDE-EXPERIENCE-claude.md"
forbidden_paths:
  - "prisma/**"
  - "package.json"
  - "package-lock.json"
  - "src/proxy.ts"
depends_on: []
contracts:
  - docs/03-design-system.md
  - docs/12-multibahasa-rtl.md
  - docs/17-komponen-ui-detail.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:e2e
risk: medium
token_class: L
status: ready
---

# M1 Claude Experience

Build the accessible public shell primitives and final design tokens for FUSPI in ID/EN/AR, including Arabic typography, logical CSS, responsive behavior, focus states, and reduced motion. Use typed mocks; do not change data/security contracts or dependencies.
