---
id: M3-GPT-MEDIA-LIBRARY-BROWSE-QA-REVIEW
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: gpt
base_sha: ffd4f00
allowed_paths:
  - "coordination/reviews/M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA-gpt.md"
  - "coordination/handoffs/M3-GPT-MEDIA-LIBRARY-BROWSE-QA-REVIEW-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "playwright.config.ts"
  - "next.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/tasks/M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA.md"
  - "coordination/reviews/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA-deepseek.md"
  - "e2e/m3/admin-media-library-browse.spec.ts"
  - "e2e/auth/password-session.spec.ts"
  - "e2e/m3/public-post-experience.spec.ts"
  - "src/contracts/storage.ts"
  - "src/contracts/media-admin.ts"
  - "src/app/[locale]/admin/media/**"
  - "src/components/admin/media/**"
  - "prisma/schema.prisma"
depends_on:
  - M3-DEEPSEEK-MEDIA-LIBRARY-BROWSE-QA
contracts:
  - src/contracts/storage.ts
  - src/contracts/media-admin.ts
acceptance_commands:
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-MEDIA-LIBRARY-BROWSE-QA-REVIEW.md TASK_BASE=origin/coordination/m3-gpt-media-library-browse-qa-review-assignment npm run check:scope
risk: medium
token_class: M
status: assigned
---

# M3 GPT Media Library Browse QA Review

Perform one bounded, read-only review of DeepSeek QA head `ffd4f00` (spec/review commit `435eb69`)
for Claude candidate `dbdeda2`. Independently execute the Playwright spec against an isolated local
PostgreSQL cluster. Do not edit the E2E spec, product code, tests, messages, contracts, dependency,
schema, configuration, task status, lease, or milestone state.

Verify fixture values against frozen Storage/Media contracts, cross-project isolation, cleanup on
partial setup/assertion failure, session assertions, canonical-query semantics without assuming an
unimplemented redirect, locale labels, keyboard focus, axe tags, viewport coverage, and the exact
acceptance results claimed in the DeepSeek review/handoff.

Use severity Critical/High/Medium/Low. Verdict is `APPROVE` only if the required PostgreSQL-backed
Playwright and integration commands actually execute and pass. A written-but-unexecuted spec cannot
receive approval. Record exact failure counts/reproduction and bounded corrections. Finish with a
committed review/handoff and stop; do not fix the candidate or merge.
