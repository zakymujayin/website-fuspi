---
id: M3-CLAUDE-POST-DELETE
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 5d19240
allowed_paths:
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "src/components/admin/posts/post-delete-action.tsx"
  - "src/components/ui/alert-dialog.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-delete.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-DELETE-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "src/contracts/post-admin.ts"
  - "src/components/admin/posts/post-editor-errors.ts"
  - "src/components/admin/posts/post-publication-actions.tsx"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-EDITOR-BASIC
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run build
  - git diff --check
risk: medium
token_class: M
status: ready
---

# M3 Claude Post delete

Add delete to the Post edit page, completing admin CRUD. The transport/API already support the
frozen `DELETE` command (`AdminPostDeletePayloadSchema`, `executeAdminPostCommand`,
`capabilities.delete`). Presentation only — no server change.

## Scope

1. A destructive "delete" affordance on `/[locale]/admin/posts/[postId]/edit`, gated on
   `capabilities.delete`.
2. It MUST require explicit confirmation before deleting (a modal with an accessible title, per
   AGENTS.md overlay rule). Use `npx shadcn@latest add alert-dialog` — it builds on the already
   installed `@base-ui/react`; confirm no dependency change.
3. Confirm submits `{action:"DELETE", payload:{postId, expectedVersion}}` to `POST /api/admin/posts`,
   same-origin, reusing the editor's failure-code mapping. On `VERSION_CONFLICT` show the reload
   message (stale delete must not silently succeed).
4. On success, navigate to `/admin/posts` (locale-aware router) and refresh.
5. ID/EN/AR labels, Arabic RTL, logical direction utilities, 40px controls. No raw code in the UI.

## Out of scope

Bulk delete, undo/restore, list-level delete. Do not change create/publication behaviour.

## Verification

Unit-test the command shape, the capability gate (no affordance when `capabilities.delete` is
false), and failure mapping. Lint/typecheck/npm test/build. A single-page browser check of the
confirm→delete→navigate flow is enough; do not run the full e2e directory locally.

## Stand-in note

Codex/DeepSeek out of usage limit (ADR-0002). Standing independence caveat; re-review on return.
