---
id: M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW-R2
milestone: M3
owner: deepseek
reviewer: human-owner
tester: deepseek
base_sha: f9acfc16642e523de4bbc81372c2f221b9eba56a
supersedes: M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW
quarantined_commit: b55e5f34b1e7135265725bf6f7855059706179d7
review_branch: ai/deepseek/m3-media-focus-order-review-r2
verified_head: bf0275527e36a1032f6a96a62ade7c47f5aa0ed2
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
  - "coordination/reviews/M3-DEEPSEEK-REVIEW-QUARANTINE.md"
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
  - "TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW-R2.md TASK_BASE=f9acfc16642e523de4bbc81372c2f221b9eba56a npm run check:scope"
risk: medium
token_class: S
status: complete
---

# M3 media focus order review — R2 replacement

Replacement for the quarantined review `b55e5f3`, whose defect was structural:
two parents, with a final tree that dropped the candidate's own fix to
`e2e/m3/admin-media-library-browse.spec.ts`. Merging it would have marked
candidate `8b8b35d` as an ancestor without carrying the fix.

Candidate under review: `8b8b35d5ed3206fe01fa2c198376554746044010`.

## Correction requirements

1. Documentation-only branch with exactly one parent, based on `f9acfc1`.
2. The candidate must never be a parent or ancestor of the review branch.
3. Fresh, uniquely named PostgreSQL database, migrated from zero, never reused,
   dropped afterwards.
4. Every acceptance command recorded with its literal exit code. `APPROVED`
   only if all exit 0 with no High/Critical finding, otherwise
   `CHANGES_REQUESTED`.
5. The 84/84 result may be reported only after actually re-running the suite.
   Copying it from the quarantined review is not permitted.
6. Banned cleanup: `git checkout -- .`, `git reset` to discard work,
   `git clean -fd`, force checkout. Unwind the evidence merge with
   `git merge --abort`; remove build artifacts with `rm -rf .next`.

## Review content

Unchanged from the superseded manifest: confirm the diff touches only the
authorized keyboard test and handoff; confirm the explicit focus sequence covers
skip link, both policy buttons, image file input, upload button, and first
filter link in rendered DOM order; reject an arbitrary Tab loop, count-only
check, programmatic focus, conditional skip-link waiver, or focus styling
asserted only from a CSS class; confirm each focused control is asserted with a
computed visible focus indicator.

## Outcome

Verdict `APPROVED`, agent-attested. Structural checks coordinator-verified and
passing. See `coordination/reviews/M3-DEEPSEEK-REVIEW-QUARANTINE.md` sections 2
and 3 for the authoritative head and verification record, and section 6 for the
outstanding handoff SHA correction.
