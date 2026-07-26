---
id: M3-CLAUDE-POST-PUBLICATION-ACTIONS
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 580c12d
allowed_paths:
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "src/components/admin/posts/post-publication-actions.tsx"
  - "src/components/admin/posts/post-publication-transitions.ts"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-publication-actions.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-PUBLICATION-ACTIONS-claude.md"
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
  - "src/contracts/post.ts"
  - "src/contracts/post-admin.ts"
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-editor-errors.ts"
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

# M3 Claude Post publication actions

Complete the Post lifecycle in the edit page: publish-now, schedule, return-to-draft, and archive.
The transport and API already support this via the `PUBLICATION` command
(`PostPublicationMutationInputSchema`); this is **presentation only** — no server change.

## Scope

1. A publication panel on `/[locale]/admin/posts/[postId]/edit` showing the current publication
   state (Draft / Published / Scheduled / Archived) and the actions valid from it.
2. Actions submit `{action: "PUBLICATION", payload: {intent, postId, expectedVersion, [publishedAt]}}`
   to the existing `POST /api/admin/posts`, same-origin, reusing the editor's failure-code mapping.
3. **SCHEDULE** requires a future datetime input; send it as an ISO string with offset.
4. Gate on `capabilities.publish` from the editor view; if false, render no publication actions.
5. Available intents per current status must mirror the frozen `ALLOWED_TRANSITIONS` in
   `src/contracts/post.ts` (DRAFT→publish/schedule/archive; PUBLISHED→schedule/return-to-draft/archive;
   ARCHIVED→return-to-draft). Mirror it locally with a comment pointing at the contract, exactly like
   `post-query.ts` mirrors the frozen query shape. The server remains the authority and rejects
   invalid transitions with `INVALID_STATE`, which the UI shows as a non-technical message.
6. On success, refresh so the panel reflects the new state. On `VERSION_CONFLICT`, show the reload
   message. Never render a raw code or stack.
7. ID/EN/AR labels; Arabic RTL. Logical direction utilities only. 40px control height.

## Out of scope

Delete (separate manifest), autosave, rich text, media/category/tag pickers. Do not change the
create page (draft-only by design). No new API route or server action.

## Verification

Unit-test the transition-mirroring (correct intents offered per status; none when
`capabilities.publish` is false) and that no raw failure code can reach the UI. Then lint,
typecheck, npm test, build. A single-page browser render check is enough; do not run the full e2e
directory locally.

## Stand-in note

Codex and DeepSeek out of usage limit (ADR-0002). Standing independence caveat applies; re-review on
return.
