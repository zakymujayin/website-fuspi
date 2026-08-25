# Handoff — M4-GPT-POST-COVER-PICKER-FIX — gpt

- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: 4455a2c1ccb7e145d13a6bcc5abae7d3edd482da
- Head SHA: see branch HEAD (`git rev-parse HEAD`) after final commit

## Result

The post editor cover picker now uses the stable `/uploads` fallback whenever
`UPLOAD_PUBLIC_URL` is not set. This keeps the edit page's existing cover
preview and the picker's media list from failing due to an empty public upload
base in local or staging runtime.

## Files changed

- `src/app/[locale]/admin/posts/new/page.tsx`
- `src/app/[locale]/admin/posts/[postId]/edit/page.tsx`
- `src/app/api/admin/media/route.ts`
- `tests/m3/ui/admin-post-cover-picker.test.tsx`
- `coordination/tasks/M4-GPT-POST-COVER-PICKER-FIX.md`

## API/schema/migration impact

- No schema or migration changes.
- No API shape changes. `/api/admin/media` keeps returning the same admin media
  list response; only its default upload base changed from empty string to
  `/uploads` when `UPLOAD_PUBLIC_URL` is absent.

## Verification

| Command | Result |
|---|---|
| `npx vitest run tests/m3/ui/admin-post-cover-picker.test.tsx tests/m3/ui/admin-post-editor.test.tsx` | Passed, 2 files / 54 tests |
| `git diff --check` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test` | Passed, 92 files / 1156 tests |

## Untested areas

- Browser-level click flow was not run with Playwright against a seeded media
  library.

## Risks and follow-ups

- If production intentionally requires an absolute CDN upload URL, keep
  `UPLOAD_PUBLIC_URL` set there. The fallback is for local/staging resilience
  and uses the existing public `/uploads` route contract.

## Requested contract/dependency changes

- None.
