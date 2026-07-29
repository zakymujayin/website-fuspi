---
id: M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW
milestone: M3
owner: deepseek
reviewer: human-owner
tester: deepseek
base_sha: 62a8459e242a4618191af261c9d38df949efebda
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
  - "TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-correction-reviews npm run check:scope"
risk: high
token_class: M
status: assigned
---

# M3 independent review of autosave mutation serialization

Independently review
`origin/ai/gpt/m3-autosave-mutation-serialization` at candidate head
`f2ad281eb8885fe5df839fc2e16cf079a8a68524`. This is a read-only review: do not
fix product source, tests, configuration, dependencies, contracts, or schema.

## Required review

1. Verify the candidate diff against the GPT implementation manifest and its handoff.
2. Inspect every acquire, release, success, failure, unmount/navigation, and stale-token path for
   autosave, manual save, publication, and delete. Confirm no mutation can release another
   mutation's lease or reuse a stale optimistic version.
3. Confirm controls are accessibly disabled while a write is active, without disabling
   non-mutating navigation unnecessarily.
4. Verify the held-response E2E proves that the server commits the autosave, no competing request
   is sent before response release, and the next manual update uses the advanced version.
5. Re-run every acceptance command with an isolated local PostgreSQL database and DeepSeek-owned
   upload directories.
6. Record exact commands, counts, candidate SHA, findings by severity, and one verdict:
   `APPROVED` only if all mandatory evidence passes with no High/Critical finding; otherwise
   `CHANGES_REQUESTED`.

Start the review branch from the coordination assignment. To execute candidate code without adding
it to the documentation-only review diff, use a clean non-committing merge of the exact candidate,
run the evidence, then abort that merge before creating the review documents. Never commit or push
candidate source from the DeepSeek review branch.
