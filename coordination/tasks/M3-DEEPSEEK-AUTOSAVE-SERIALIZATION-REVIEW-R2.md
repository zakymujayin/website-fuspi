---
id: M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW-R2
milestone: M3
owner: deepseek
reviewer: human-owner
tester: deepseek
base_sha: f9acfc16642e523de4bbc81372c2f221b9eba56a
supersedes: M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW
quarantined_commit: 98e6256453e695f4871c3b7d8d9ebfad1dcf3e12
review_branch: ai/deepseek/m3-autosave-serialization-review-r2
verified_head: 7853ba2d00d2a06d7c3932527d837bac340fe44e
allowed_paths:
  - "coordination/reviews/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW-deepseek.md"
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
  - "coordination/tasks/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION.md"
  - "coordination/handoffs/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION-gpt.md"
  - "src/contracts/post-admin.ts"
  - "src/components/admin/posts/post-editor-shell.tsx"
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-publication-actions.tsx"
  - "src/components/admin/posts/post-delete-action.tsx"
  - "tests/m3/ui/admin-post-autosave.test.tsx"
  - "e2e/m3/admin-post-editor.spec.ts"
depends_on:
  - M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION
  - M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW-R2
contracts:
  - src/contracts/post-admin.ts
  - docs/04-panel-admin.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run test:integration
  - npm run build
  - "PLAYWRIGHT_BASE_URL=http://localhost:3004 npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --project=mobile --workers=1"
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW-R2.md TASK_BASE=f9acfc16642e523de4bbc81372c2f221b9eba56a npm run check:scope"
risk: high
token_class: M
status: complete
---

# M3 autosave mutation serialization review — R2 replacement

Replacement for the quarantined review `98e6256`, whose defect was an invalid
verdict: `APPROVED` was recorded while the review's own evidence table showed
`npm run test:integration` at 79/83 with 4 failures, against a manifest that
permits `APPROVED` only when all mandatory evidence passes.

Candidate under review: `f2ad281eb8885fe5df839fc2e16cf079a8a68524`.

## Correction requirements

1. Documentation-only branch with exactly one parent, based on `f9acfc1`.
2. The candidate must never be a parent or ancestor of the review branch.
3. Fresh, uniquely named PostgreSQL database, migrated from zero, never reused,
   dropped afterwards. Pre-flight must confirm
   `SELECT count(*) FROM "User" WHERE email LIKE 'm2-route-%@example.test'`
   returns 0.
4. `RUN_PLATFORM_DB_TESTS`, `AUTH_URL`, and the auth HMAC secrets must be
   exported and confirmed before any conclusion is drawn about the four R1
   integration failures. Those failures must be re-observed on a pristine
   database before being characterised. Labelling them "pre-existing" without
   that proof is not permitted.
5. Every acceptance command recorded with its literal exit code. `APPROVED`
   only if all exit 0 with no High/Critical finding, otherwise
   `CHANGES_REQUESTED`.
6. Banned cleanup: `git checkout -- .`, `git reset` to discard work,
   `git clean -fd`, force checkout.

## Escalation rule

`tests/security/auth-runtime/credentials-route.integration.test.ts` and
`tests/platform/ticket-enum-contract.integration.test.ts` belong to the GPT
platform/auth lane. If they still fail on a pristine, correctly configured
environment, DeepSeek may not approve and may not fix them. The verdict is
`CHANGES_REQUESTED` and the handoff must raise an explicit request for a new GPT
platform task quoting the failing test names and exit codes.

## Review content

Unchanged from the superseded manifest: verify the diff against the GPT
implementation manifest and handoff; inspect every acquire, release, success,
failure, unmount/navigation, and stale-token path for autosave, manual save,
publication, and delete, confirming no mutation can release another mutation's
lease or reuse a stale optimistic version; confirm controls are accessibly
disabled during a write without unnecessarily disabling non-mutating navigation;
verify the held-response E2E proves the server commits the autosave, no
competing request is sent before response release, and the next manual update
uses the advanced version.

## Outcome

Verdict `APPROVED`, agent-attested. Structural checks coordinator-verified and
passing. Reported `npm run test:integration` at 20 files / 83 tests passing on a
fresh database, against 79/83 in R1, which supports the environment explanation
recorded in `coordination/reviews/M3-DEEPSEEK-REVIEW-QUARANTINE.md` section 5.
No product code defect was found and no source change was made.
