---
id: M4-GPT-HEADER-LCP-IMAGE-FIX
milestone: M4
title: Fix header logo LCP loading hint
risk: low
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 5197cd7
depends_on: []
allowed_paths:
  - src/components/public/image-with-fallback.tsx
  - src/components/public/identity-badges.tsx
  - tests/m4/ui/header-lcp-image.test.ts
  - coordination/tasks/M4-GPT-HEADER-LCP-IMAGE-FIX.md
  - coordination/handoffs/M4-GPT-HEADER-LCP-IMAGE-FIX-gpt.md
  - coordination/ownership.yml
readonly_paths:
  - node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - messages/**
  - src/components/ui/**
  - src/app/globals.css
acceptance_commands:
  - npx vitest run tests/m4/ui/header-lcp-image.test.ts tests/m4/ui/site-logo-header.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-HEADER-LCP-IMAGE-FIX.md TASK_BASE=5197cd7 npm run check:scope"
status: active
---

# Header LCP image fix

The configured header identity logos are visible above the fold. Mark their
validated media images as eager while leaving content images below the fold on
the default lazy behavior.
