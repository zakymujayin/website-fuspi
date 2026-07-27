---
id: M3-CLAUDE-MEDIA-UPLOAD
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 945cb20
allowed_paths:
  - "src/app/[locale]/admin/media/page.tsx"
  - "src/components/admin/media/media-upload.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-media-upload.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-MEDIA-UPLOAD-claude.md"
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
  - "src/app/api/admin/media/upload/route.ts"
  - "src/components/admin/media/media-state-notice.tsx"
contracts:
  - src/contracts/media-admin.ts
depends_on:
  - M3-CLAUDE-MEDIA-LIBRARY-BROWSE
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

# M3 Claude Media upload (single image)

Add single-image upload to the Media Library, completing the loop upload → picker → cover. The API
`POST /api/admin/media/upload` already exists (multipart, CMS_IMAGE policy). Presentation only.

## Scope

1. An upload panel on `/[locale]/admin/media`: a file input (`accept="image/webp"`), an alt-text
   field, a "decorative" toggle, and a submit.
2. Build multipart `FormData`: `metadata` = JSON
   `{policy:"CMS_IMAGE", uploadCount:1, intents:[{policy:"CMS_IMAGE", alt, isDecorative}]}`, and one
   `files` entry. POST same-origin to `/api/admin/media/upload`.
3. Client-side, before sending: require a webp file; require alt when not decorative and empty alt
   when decorative (mirror `validateAccessibility` / the metadata refine); enforce the 5 MB image
   limit. The server remains the authority (magic-byte check, `VALIDATION_FAILED`/`UPLOAD_FAILED`).
4. On `{ok:true, items:[{index, mediaId}]}` → clear the form and `router.refresh()` so the new image
   appears in the grid. On failure map the frozen `AdminMediaTransportFailureCodeSchema` codes to
   translated, non-technical copy; never render a raw code.
5. ID/EN/AR, Arabic RTL, logical direction utilities, 40px controls, accessible labels/status.

## Out of scope

Batch (multi-file) upload, PDF upload, drag-and-drop, editing alt after upload, client-side image
conversion to webp. Each is its own manifest.

## Verification

Unit-test the multipart/metadata assembly and the alt/decorative + webp/size client validation, and
that no raw failure code reaches the UI. Lint/typecheck/npm test/build. Single-page browser check:
upload a small webp, confirm ok + the grid refreshes and the row exists in the DB. Do not run the
full e2e directory locally.

## Stand-in note

Codex/DeepSeek out of usage limit (ADR-0002). Standing independence caveat; re-review on return.
