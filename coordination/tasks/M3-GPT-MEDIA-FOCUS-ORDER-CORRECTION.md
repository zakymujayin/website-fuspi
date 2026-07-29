---
id: M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION
milestone: M3
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: f8a40ebe5b0279d08f45864863f2642f56dedeae
allowed_paths:
  - "e2e/m3/admin-media-library-browse.spec.ts"
  - "coordination/handoffs/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
readonly_paths:
  - "AGENTS.md"
  - "coordination/reviews/M3-CLAUDE-INDEPENDENT-REVIEW-gpt.md"
  - "src/app/[locale]/admin/media/page.tsx"
  - "src/components/admin/media/media-upload.tsx"
  - "src/components/admin/media/media-filter-nav.tsx"
depends_on:
  - M3-GPT-CLAUDE-INDEPENDENT-REVIEW
contracts:
  - docs/17-komponen-ui-detail.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - "PLAYWRIGHT_BASE_URL=http://localhost:3004 npx playwright test e2e/m3/admin-media-library-browse.spec.ts --project=chromium --project=mobile --workers=1"
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION.md TASK_BASE=origin/coordination/m3-review-corrections npm run check:scope"
risk: low
token_class: S
status: merged
---

# M3 Media Library focus-order correction

Correct the stale keyboard assertion identified by the independent M3 Claude review. The upload
form now precedes the media filters in DOM order, so the test must prove the real focus sequence
rather than expecting the first filter immediately after the skip link.

## Required work

1. Inspect every focusable upload control rendered before the filter navigation.
2. Update only the keyboard test to Tab through those controls in DOM order, asserting each
   meaningful control and its visible focus indicator before reaching the first filter.
3. Preserve the existing skip-link, filter, locale, RTL, viewport, and axe assertions.
4. Do not weaken the check to an arbitrary Tab loop, programmatic focus, or a count-only assertion.
5. Run the exact Chromium + mobile command with one worker and record the full result.

No product source change is authorized. If the observed order is inaccessible, stop and request a
Claude UI correction task instead of encoding an inaccessible order into the test.
