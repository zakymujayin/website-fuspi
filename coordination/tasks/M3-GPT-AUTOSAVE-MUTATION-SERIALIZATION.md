---
id: M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION
milestone: M3
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: f8a40ebe5b0279d08f45864863f2642f56dedeae
allowed_paths:
  - "src/components/admin/posts/post-editor-shell.tsx"
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-publication-actions.tsx"
  - "src/components/admin/posts/post-delete-action.tsx"
  - "tests/m3/ui/admin-post-autosave.test.tsx"
  - "tests/m3/ui/admin-post-editor.test.tsx"
  - "e2e/m3/admin-post-editor.spec.ts"
  - "coordination/handoffs/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "messages/**"
readonly_paths:
  - "AGENTS.md"
  - "coordination/reviews/M3-CLAUDE-INDEPENDENT-REVIEW-gpt.md"
  - "src/contracts/post-admin.ts"
  - "src/components/admin/posts/post-editor-errors.ts"
depends_on:
  - M3-GPT-CLAUDE-INDEPENDENT-REVIEW
  - M3-CLAUDE-POST-AUTOSAVE
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
  - "TASK_MANIFEST=coordination/tasks/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION.md TASK_BASE=origin/coordination/m3-review-corrections npm run check:scope"
risk: high
token_class: M
status: merged
---

# M3 Post autosave mutation serialization

Prevent the editor from starting two writes with the same optimistic version. Today autosave avoids
an active manual submit, but manual save, publication, or delete can still begin while autosave is
already awaiting its response.

## Required behavior

1. `PostEditorShell` owns one shared mutation-busy state or an equivalent page-level serialization
   primitive used by autosave, manual save, publication transitions, and delete.
2. Starting any mutation atomically blocks every other mutation surface until that request settles.
3. Autosave still skips while another mutation is active, and manual save/publication/delete cannot
   start while autosave is active. Cancel/navigation controls must not initiate a write.
4. The successful mutation updates or refreshes the shared optimistic version before another write
   becomes available. Existing non-disclosing error and `VERSION_CONFLICT` behavior stays intact.
5. Buttons expose their disabled state accessibly; no new copy or message key is required.
6. Add a deterministic overlapping-request test using a deferred response. Prove a second mutation
   is not sent while autosave is unresolved, then prove it can proceed using the advanced version
   after autosave resolves.
7. Preserve 30-second autosave, ID/EN/AR, RTL, editor navigation, and all publication/delete flows.

Do not change the frozen transport contract or solve this by swallowing `VERSION_CONFLICT`.
