---
id: M3-CLAUDE-POST-AUTOSAVE
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 9171a6d
allowed_paths:
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "src/components/admin/posts/post-editor-shell.tsx"
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-editor-payload.ts"
  - "src/components/admin/posts/post-publication-actions.tsx"
  - "src/components/admin/posts/post-delete-action.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-autosave.test.tsx"
  - "tests/m3/ui/admin-post-editor.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-AUTOSAVE-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "src/contracts/post-admin.ts"
  - "src/components/admin/posts/post-editor-errors.ts"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-EDITOR-BASIC
  - M3-CLAUDE-POST-PUBLICATION-ACTIONS
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run build
  - git diff --check
risk: high
token_class: L
status: ready
---

# M3 Claude Post autosave

Add 30-second draft autosave to the Post editor (edit mode), the carried M3 evidence item. The
transport already handles the frozen `AUTOSAVE` command (`ADMIN_POST_AUTOSAVE_INTERVAL_MS = 30000`).
Presentation only.

## The correctness problem this must solve

The form, publication actions, and delete each receive `expectedVersion` independently from the
server page. Autosave bumps the version, which would make the other actions stale (`VERSION_CONFLICT`
on publish/delete after an autosave). **Lift the version into a shared client owner.**

## Scope

1. `PostEditorShell` (client): owns `version` state (seeded from the view) and renders the publication
   actions, the editor form, and the delete action, passing the **current** `version` to all three
   and an `onVersionChange` callback that any successful mutation calls. The edit page renders the
   shell instead of the three components directly.
2. Autosave in the form (edit mode only): when the draft is dirty, every
   `ADMIN_POST_AUTOSAVE_INTERVAL_MS` send the frozen `AUTOSAVE` command
   (`{intent:"AUTOSAVE_DRAFT", postId, expectedVersion, …mutable fields}`) same-origin; on success call
   `onVersionChange(newVersion)`, mark clean, and show a "saved" status; on `VERSION_CONFLICT` stop
   autosaving and show the reload message. Use refs for the latest draft/version to avoid stale
   closures. Flush cleanly on unmount; never autosave while a manual submit is in flight.
3. A visible, polite autosave status (idle / saving / saved-at-time / conflict), `aria-live`.
4. Manual save, publish/schedule/archive/return-to-draft, and delete all read the **shared** version,
   so a manual save or publish **after** an autosave uses the bumped version and does not conflict.
5. ID/EN/AR, RTL, logical utils.

## Verification

Unit: `buildAutosavePayload` uses the passed version + intent AUTOSAVE_DRAFT; failure mapping. Update
`admin-post-editor.test.tsx` for any prop changes. Lint/typecheck/npm test/build. Single-page browser
check (the load-bearing one): edit a draft, let autosave fire, confirm the draft persisted and the
version bumped in the DB, then **manually save and confirm it succeeds (no VERSION_CONFLICT)** —
proving the shared-version design.

## Stand-in note

Codex/DeepSeek out of usage limit (ADR-0002). **Highest-risk stateful task; re-review by Codex.**
