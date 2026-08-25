# M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX — GPT Handoff

## Task

- Task ID: M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX
- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: ee0c930c780e67130c37e8bd35ea647268edd6a1
- Head SHA: containing commit

## Summary

- Fixed Admin Media Library loading when `UPLOAD_PUBLIC_URL` is unset by using the same `/uploads` local fallback as the picker/API path.
- Allowed WebP files whose browser MIME is empty or `application/octet-stream`, while preserving server-side magic-byte validation.
- Sanitized UI-submitted WebP filenames with extra dots before multipart submission so common WhatsApp names are accepted by the strict storage validator.
- Added a per-item delete action with confirmation dialog and stable, translated failure messages.

## Files Changed

- `coordination/tasks/M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX.md`
- `coordination/handoffs/M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX-gpt.md`
- `messages/ar.json`
- `messages/en.json`
- `messages/id.json`
- `src/app/[locale]/admin/media/page.tsx`
- `src/app/api/admin/media/upload/route.ts`
- `src/components/admin/media/media-delete-action.tsx`
- `src/components/admin/media/media-item-card.tsx`
- `src/components/admin/media/media-upload.tsx`
- `tests/m3/ui/admin-media-library-browse.test.tsx`
- `tests/m3/ui/admin-media-upload.test.tsx`

## API, Schema, Migration Impact

- No schema or migration changes.
- No new endpoint. The delete UI uses existing `POST /api/admin/media` with `{action: "DELETE"}`.
- Upload route behavior now normalizes browser-empty WebP MIME to `image/webp` only when the submitted filename ends in `.webp`.

## Verification

- `npx vitest run tests/m3/ui/admin-media-upload.test.tsx tests/m3/ui/admin-media-library-browse.test.tsx tests/m3/runtime/media-admin-transport.test.ts` — passed, 3 files / 73 tests.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `git diff --check` — passed.
- `npm run test` — passed, 93 files / 1162 tests.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX.md TASK_BASE=ee0c930c780e67130c37e8bd35ea647268edd6a1 npm run check:scope` — passed, 12 changed files within lease.

## Untested Areas, Risks, Follow-ups

- Did not run a browser/manual upload because the automated suite covered route/client validation and the admin grid affordance.
- Delete is intentionally blocked by the existing backend when media is still referenced by content.
- Environment still must provide valid absolute `UPLOAD_DIR`, `UPLOAD_PRIVATE_DIR`, and `PPKS_PRIVATE_DIR` for real uploads/deletes; this change only adds the public URL fallback used for loading previews.
