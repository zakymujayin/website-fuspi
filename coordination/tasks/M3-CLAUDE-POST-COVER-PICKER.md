---
id: M3-CLAUDE-POST-COVER-PICKER
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: f9c8f3f
allowed_paths:
  - "src/app/[locale]/admin/posts/new/page.tsx"
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-editor-payload.ts"
  - "src/components/admin/posts/post-editor-view.ts"
  - "src/components/admin/posts/post-cover-picker.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-cover-picker.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-COVER-PICKER-claude.md"
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
  - "src/contracts/media-admin.ts"
  - "src/contracts/post-admin.ts"
  - "src/app/api/admin/media/route.ts"
  - "src/components/admin/media/media-thumbnail.tsx"
contracts:
  - src/contracts/post-admin.ts
  - src/contracts/media-admin.ts
depends_on:
  - M3-CLAUDE-POST-EDITOR-BASIC
  - M3-CLAUDE-MEDIA-LIBRARY-BROWSE
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run build
  - git diff --check
risk: medium
token_class: L
status: ready
---

# M3 Claude Post cover picker

The editor round-trips `coverMediaId` but cannot set or change it. Add a cover picker that reads the
Media Library (`GET /api/admin/media?kind=IMAGE`) so an author can choose or clear the cover image.
Presentation only — no server/contract/API change.

## Scope

1. `coverMediaId` graduates from the untouched `carried` set into the editable `PostEditorDraft`.
   Category and tags stay in `carried` (no pickers yet).
2. A `PostCoverPicker` client component: shows the current cover (thumbnail + alt), a "choose" action
   that lists images from `GET /api/admin/media?kind=IMAGE` (same-origin) with the existing pagination
   shape, select-to-set, and a "clear" action (sets null). Both create and edit pages get it.
3. On edit, initialise from `view.cover` (already a safe `PublicMediaView`) so the current cover shows
   without a refetch; on create it starts empty.
4. Submit path unchanged: the create/update payload's `coverMediaId` now comes from the draft. The
   server validates cover ownership/existence and returns `MEDIA_INVALID` on a bad reference — surface
   it via the editor's existing failure mapping; never render a raw code.
5. Reuse Media presentation (next/image via the existing thumbnail component/pattern; semantic tokens).
   ID/EN/AR, Arabic RTL, logical direction utilities, 40px controls, overlay needs an accessible title.

## Out of scope

Uploading new media from the editor (separate manifest), category/tag pickers, multi-image galleries.

## Correctness note

The edit round-trip guarantee still holds for category and tags (carried untouched). Cover is now
intentionally editable, so its "preserve on unrelated edit" behaviour is replaced by "reflects what
the picker shows" — cover the new behaviour in a test (editing only the title keeps the
picker's current coverMediaId, which defaults to the loaded value).

## Verification

Unit-test: coverMediaId flows from draft into both payloads; clear → null; select → id; the picker
renders current cover and is gated behind an accessible dialog/title. Lint/typecheck/npm test/build.
Single-page browser check: open editor, pick a cover, save, confirm `coverMediaId` persisted; clear,
save, confirm null. Do not run the full e2e directory locally.

## Stand-in note

Codex/DeepSeek out of usage limit (ADR-0002). Standing independence caveat; re-review on return.
