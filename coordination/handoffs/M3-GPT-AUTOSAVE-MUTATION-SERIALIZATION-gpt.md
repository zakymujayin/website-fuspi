# Handoff — M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION — GPT

- Branch: `ai/gpt/m3-autosave-mutation-serialization`
- Base SHA: `62a8459e242a4618191af261c9d38df949efebda`
- Implementation SHA: `973f20f077fa68d97dafaa0c80cc97146769a5cd`

## Result

Post editor writes are serialized by one tokenized lease owned by `PostEditorShell`. Autosave,
manual save, publication transitions, and delete cannot overlap. A successful request advances the
shared version ref synchronously before releasing its token, and a stale request cannot release a
newer mutation's lock.

The existing autosave browser case now creates a deterministic overlap window: the server commits
autosave while the browser response is held, competing mutation controls remain disabled, no second
request is sent, and manual save proceeds with the advanced version after release.

## Files changed

- `src/components/admin/posts/post-editor-shell.tsx`
- `src/components/admin/posts/post-editor-form.tsx`
- `src/components/admin/posts/post-publication-actions.tsx`
- `src/components/admin/posts/post-delete-action.tsx`
- `tests/m3/ui/admin-post-autosave.test.tsx`
- `e2e/m3/admin-post-editor.spec.ts`

## Contract/schema/migration impact

None. The frozen Post transport payloads and server authorization remain unchanged. No dependency,
schema, migration, message, API route, or shared contract changed.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 49 files, 738 tests |
| `npx prisma migrate deploy` on isolated `fuspi_test_gpt_autosave` | PASS — 2 migrations |
| `npm run test:integration` on isolated `fuspi_test_gpt_autosave` | PASS — 20 files, 83 tests |
| `npm run build` | PASS; carried Turbopack NFT warning remains |
| Editor Playwright, Chromium + mobile, one worker | PASS — 30/30 |
| `git diff --check` | PASS |
| Task scope check against `origin/coordination/m3-review-corrections` | PASS — 6 files |

The browser run used `PLAYWRIGHT_BASE_URL=http://localhost:3004` and the safe local media base
`UPLOAD_PUBLIC_URL=/uploads`. An absolute local `http://` media base is rejected by the existing
transport URL contract and is not a product regression from this task.

## Untested areas

No additional browser engine beyond the task's Chromium desktop and Pixel 7 mobile projects.

## Risks and follow-ups

- DeepSeek must independently review the token ownership/release paths and replay the held-response
  browser case.
- The existing build warning remains owned by `M3-GPT-BUILD-TRACING-WARNING`; this task did not
  change tracing or storage.
- The synthetic cover row intentionally has no backing image file, so Next.js logs non-fatal image
  decode messages during the editor suite; assertions still pass.

## Requested shared changes

None.
