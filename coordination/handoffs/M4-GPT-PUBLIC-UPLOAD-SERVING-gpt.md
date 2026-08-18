# M4-GPT-PUBLIC-UPLOAD-SERVING Handoff

## Task

- Task ID: M4-GPT-PUBLIC-UPLOAD-SERVING
- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: e951a79
- Head SHA: 96738fb
- Status: review

## Summary

Added a public read-only `/uploads/[...path]` route that serves committed PUBLIC
uploads from `UPLOAD_DIR`. The route validates the requested path with
`StorageKeySchema`, resolves it inside the configured public storage root, rejects
symlinks/path traversal, and returns immutable cache headers for hashed `.webp`
and `.pdf` files.

This fixes local dev 404s for uploaded files that exist on disk, because admin
upload stores files in `UPLOAD_DIR` while rendered media URLs use `/uploads/...`.

## Files Changed

- `coordination/tasks/M4-GPT-PUBLIC-UPLOAD-SERVING.md`
- `coordination/handoffs/M4-GPT-PUBLIC-UPLOAD-SERVING-gpt.md`
- `src/app/uploads/[...path]/route.ts`
- `tests/m3/runtime/public-upload-route.test.ts`

## API, Schema, Migration Impact

- No Prisma schema change.
- No migration change.
- No database write.
- Adds public `GET` and `HEAD` route handlers for `/uploads/{storageKey}`.

## Verification

- `npx vitest run tests/m3/runtime/public-upload-route.test.ts` passed: 1 file, 3 tests.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run prisma:validate` passed.
- `npm run test` passed: 92 files, 1154 tests.
- `git diff --check` passed.

## Local Data Finding

The local DB also has seven stale PUBLIC image media records whose files are not
present under `/tmp/fuspi-public`. Those rows still return 404 until local DB/file
state is reconciled. Referenced stale rows include the singleton site logo, four
partner logos, and `column-1.webp` used by two seeded KOLOM posts.

## Untested Areas and Risks

- Did not mutate or clean local database media rows.
- Did not add range request support; this route is for normal image/PDF serving.

## Follow-Ups

- Reconcile stale local media records or regenerate their files from seed data.
- Consider an operator tool to audit media records whose files are missing.
