---
id: M3-CLAUDE-MEDIA-BATCH-PDF-UPLOAD
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 28230b5
allowed_paths:
  - "src/components/admin/media/media-upload.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-media-upload.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-MEDIA-BATCH-PDF-UPLOAD-claude.md"
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
contracts:
  - src/contracts/media-admin.ts
depends_on:
  - M3-CLAUDE-MEDIA-UPLOAD
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

# M3 Claude Media batch + PDF upload

Extend the single-image upload to the full contract: 1–20 images (CMS_IMAGE) with per-file alt/
decorative, or exactly one PDF (PUBLIC_PDF, no accessibility metadata). Same route, presentation only.

## Scope

1. A policy toggle in the existing panel: **Images** (CMS_IMAGE, 1–20) vs **PDF** (PUBLIC_PDF, 1).
2. Images mode: multi-file input (`accept="image/webp"`, multiple); one alt + decorative control per
   selected file; enforce ≤20 files, each ≤5 MB, and the alt/decorative rule per file.
3. PDF mode: single file (`accept="application/pdf"`, ≤20 MB); no alt/decorative (the PUBLIC_PDF
   intent requires empty alt + non-decorative).
4. Build the frozen metadata: `{policy, uploadCount, intents:[…]}` with one intent per file, and one
   `files` entry per file, in order. Post same-origin to `/api/admin/media/upload`.
5. On `{ok:true, items:[…]}` clear + `router.refresh()`; map failure codes to translated copy; the
   server stays the authority (magic bytes, per-file size, count). No raw code in the UI.
6. Preserve the existing single-image behaviour as the 1-file case. ID/EN/AR, RTL, logical utils.

## Out of scope

Drag-and-drop, edit-alt-after-upload, mixed image+PDF in one submit (the contract forbids it), client
webp conversion.

## Verification

Unit-test: metadata/intents assembly for N images and for a PDF; per-file + count + type/size
validation; PDF requires empty alt; no raw code. Lint/typecheck/npm test/build. Single-page browser
check: upload two webp images with alts → both rows in DB; upload one PDF → row in DB. Do not run the
full e2e directory locally.

## Stand-in note

Codex/DeepSeek out of usage limit (ADR-0002). Standing independence caveat; re-review on return.
