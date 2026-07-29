---
id: M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW
milestone: M3
owner: deepseek
reviewer: human-owner
tester: deepseek
base_sha: 62a8459e242a4618191af261c9d38df949efebda
allowed_paths:
  - "coordination/reviews/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "coordination/tasks/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION.md"
  - "coordination/handoffs/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION-gpt.md"
  - "src/app/[locale]/admin/media/page.tsx"
  - "src/components/admin/media/media-upload.tsx"
  - "src/components/admin/media/media-filter-tabs.tsx"
  - "e2e/m3/admin-media-library-browse.spec.ts"
depends_on:
  - M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION
contracts:
  - docs/17-komponen-ui-detail.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - "PLAYWRIGHT_BASE_URL=http://localhost:3004 npx playwright test e2e/m3/admin-media-library-browse.spec.ts --project=chromium --project=mobile --workers=1"
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-correction-reviews npm run check:scope"
risk: medium
token_class: S
status: assigned
---

# M3 independent review of Media Library focus order

Independently review
`origin/ai/gpt/m3-media-focus-order-correction` at candidate head
`8b8b35d5ed3206fe01fa2c198376554746044010`. This is a read-only review: do not
fix product source, tests, configuration, dependencies, messages, or schema.

## Required review

1. Verify the candidate diff changes only the authorized keyboard test and handoff.
2. Inspect the rendered DOM order and confirm the explicit sequence covers the skip link, both
   policy buttons, image file input, upload button, and first filter link.
3. Reject an arbitrary Tab loop, count-only check, programmatic focus, conditional skip-link waiver,
   or focus styling assertion based only on the presence of a CSS class.
4. Confirm each focused control is asserted and the indicator proof uses computed visible styling.
5. Re-run the exact 84-case Chromium + mobile suite with one worker, an isolated local PostgreSQL
   database, and DeepSeek-owned upload directories.
6. Record exact commands, counts, candidate SHA, findings by severity, and one verdict:
   `APPROVED` only if all mandatory evidence passes with no High/Critical finding; otherwise
   `CHANGES_REQUESTED`.

Start the review branch from the coordination assignment. To execute candidate code without adding
it to the documentation-only review diff, use a clean non-committing merge of the exact candidate,
run the evidence, then abort that merge before creating the review documents. Never commit or push
candidate test/source files from the DeepSeek review branch.
