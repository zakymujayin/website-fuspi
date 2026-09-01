# M4-GPT-LECTURER-PORTAL-MEDIA-UPLOAD Handoff

- Task: `M4-GPT-LECTURER-PORTAL-MEDIA-UPLOAD`
- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `d55ff7ef0b5b2488055b45c93bf8d2c96c400e12`
- Head SHA: `59a6bade0c698954d889e70b88ce8d425feead41`

## Summary

Implemented lecturer self-service profile media upload for `/portal-dosen`.
Lecturers can now upload their own public profile photo and CV PDF from the
profile form, then save the profile to attach the selected media to their public
lecturer page.

Server-side media attachment is now ownership- and type-checked: a lecturer
cannot attach media uploaded by another user, cannot attach a PDF as a photo,
and cannot attach an image as a CV.

## Files Changed

- `src/app/api/portal/lecturer/media/upload/route.ts`
  - Added a same-origin, authenticated upload endpoint for lecturer profile
    media.
- `src/features/lecturer-portal/media-upload.ts`
  - Added DOSEN-only media upload orchestration using the existing upload
    validator, staging, and persistence path.
- `src/features/lecturer-portal/domain.ts`
  - Added transaction-time validation for profile photo/CV media ownership and
    MIME type before updating `Lecturer.photoMediaId` or `Lecturer.cvMediaId`.
- `src/components/portal/profile-form.tsx`
  - Added profile media controls for photo and CV upload, localized status
    messages, clear actions, and hidden IDs bound to the saved profile action.
- `src/app/[locale]/portal-dosen/page.tsx`
  - Passes current media URLs/names and localized labels to the profile form.
- `src/contracts/lecturer-portal.ts`
  - Added the lecturer portal media upload response contract.
- `src/contracts/media.ts` and `src/lib/content/media-persistence.ts`
  - Extended trusted media creation/persistence to active `DOSEN` sessions that
    have completed password rotation.
- `messages/id.json`, `messages/en.json`, `messages/ar.json`
  - Added trilingual labels and upload messages.
- `tests/platform/lecturer-portal/lecturer-portal.test.ts`
  - Added upload response contract tests.
- `tests/security/lecturer-portal-adversarial.integration.test.ts`
  - Added adversarial PostgreSQL tests for profile media ownership and type
    validation.
- `coordination/tasks/M4-GPT-LECTURER-PORTAL-MEDIA-UPLOAD.md`
  - Added task manifest.

## API / Schema / Migration Impact

No Prisma schema or migration changes.

New internal API route:

- `POST /api/portal/lecturer/media/upload`
  - Multipart fields: `kind=PHOTO|CV`, `file=<File>`.
  - Requires same-origin request and an active `DOSEN` session with
    `mustChangePassword=false`.
  - Returns `LecturerPortalMediaUploadResponseSchema`.

The shared public media persistence helper now accepts `DOSEN` actors only for
own `MEDIA` create permissions already present in the RBAC matrix. The admin
media HTTP route remains admin/editor-only.

## Verification

- `npx vitest run tests/platform/lecturer-portal/lecturer-portal.test.ts`
  - Passed: 1 file, 19 tests.
- `set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/lecturer-portal-adversarial.integration.test.ts`
  - Initial sandbox run failed with `connect EPERM 127.0.0.1:5432`.
  - Escalated run passed: 1 file, 11 tests.
- `npm run lint`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run test`
  - Passed: 114 files, 1387 tests.
- `npm run build`
  - Passed. Build output includes `ƒ /api/portal/lecturer/media/upload`.
- Live browser verification with Playwright headless against
  `http://localhost:3001`
  - Created a synthetic `DOSEN` account linked to a synthetic lecturer profile.
  - Logged in via `/id/login?next=/id/portal-dosen`.
  - Reached `/id/portal-dosen`.
  - Verified the `Media profil`, `Unggah foto`, and `Unggah CV` controls.
  - Uploaded `/tmp/fuspi-lecturer-photo.webp` and `/tmp/fuspi-lecturer-cv.pdf`.
  - Saved the profile and observed `Tersimpan`.
  - DB check showed photo media owned by the synthetic lecturer user with
    `mimeType=image/webp` and CV media owned by the same user with
    `mimeType=application/pdf`.
  - Synthetic lecturer, user, and uploaded media rows were deleted afterward.
- `git diff --check`
  - Passed.

## Untested Areas / Risks / Follow-ups

- The upload route intentionally stores photo/CV as public media because these
  assets are rendered from public lecturer profiles. Sensitive lecturer
  documents should not use this route.
- The CV upload is available from the profile editor and saved to
  `Lecturer.cvMediaId`; verify the public lecturer template exposes the CV link
  according to the final content policy.
