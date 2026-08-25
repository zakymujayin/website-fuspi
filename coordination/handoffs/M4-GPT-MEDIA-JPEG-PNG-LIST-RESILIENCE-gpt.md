# M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE — GPT Handoff

## Task

- Task ID: M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE
- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: 38bcf2abcc0d83c30365d25118e423ca36a39e35
- Head SHA: containing commit

## Summary

- Expanded Admin Media image upload to accept JPG, JPEG, PNG, and WebP in the browser UI, matching the existing storage contract that rewrites valid images to WebP.
- Kept client-submitted filenames safe while preserving the original image extension, so the storage validator can still compare declared MIME, detected MIME, and extension correctly.
- Normalized empty/octet-stream browser MIME values for JPG/JPEG/PNG/WebP uploads in the upload route based on the sanitized file extension.
- Made `listAdminMedia` parse rows individually and skip legacy invalid public media rows instead of returning a whole-page `UNAVAILABLE` state.

## Files Changed

- `coordination/tasks/M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE.md`
- `coordination/handoffs/M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE-gpt.md`
- `messages/ar.json`
- `messages/en.json`
- `messages/id.json`
- `src/app/api/admin/media/upload/route.ts`
- `src/components/admin/media/media-upload.tsx`
- `src/lib/content/media-admin-transport.ts`
- `tests/m3/runtime/media-admin-transport.test.ts`
- `tests/m3/ui/admin-media-upload.test.tsx`

## API, Schema, Migration Impact

- No schema or migration changes.
- No new endpoint.
- Upload route accepts the same trusted image classes already supported by `validateAndTransformUpload`: JPEG, PNG, and WebP.

## Verification

- `npx vitest run tests/m3/ui/admin-media-upload.test.tsx tests/m3/ui/admin-media-library-browse.test.tsx tests/m3/runtime/media-admin-transport.test.ts` — passed, 3 files / 76 tests.
- `git diff --check` — passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed, 93 files / 1165 tests.
- Local DB loader check with `listAdminMedia(..., "/uploads")` — returned `ok: true`, 19 visible valid items from 42 public media rows; invalid legacy PDF rows no longer break the page.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE.md TASK_BASE=38bcf2abcc0d83c30365d25118e423ca36a39e35 npm run check:scope` — passed, 10 changed files within lease.

## Untested Areas, Risks, Follow-ups

- Did not delete any user media records directly. The UI now exposes delete for valid listed media and the backend still blocks referenced media.
- The five local legacy PDF media rows use non-contract `documents/...` storage keys and PDF accessibility metadata, so they are skipped by the Media Library rather than shown for deletion.
- If those legacy PDFs must be removed, use a separate cleanup task or database maintenance step after confirming they are not referenced by document/content records.
