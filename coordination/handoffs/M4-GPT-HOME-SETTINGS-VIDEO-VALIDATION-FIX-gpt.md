# M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX — GPT Handoff

## Task

- Task ID: M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX
- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: f10ccc34f460f5d1810650616f2f5d0f5fa11657
- Head SHA: containing commit

## Summary

- Preserved `logoMediaId` and `faviconMediaId` in the Admin Home Settings form payload so changing the FUSPI profile video no longer fails the strict site setting contract because unchanged singleton media IDs were omitted.
- Returned the same singleton media IDs from the site setting detail loader so the client form can submit a complete update payload.
- Added translated `AdminHomeNav.errors.*` messages for shared mutation failures in ID, EN, and AR, including `VALIDATION_FAILED`, so the UI does not show raw i18n keys.
- Added contract tests covering the required singleton media identifiers and translated mutation error keys.

## Files Changed

- `coordination/tasks/M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX.md`
- `coordination/handoffs/M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX-gpt.md`
- `messages/ar.json`
- `messages/en.json`
- `messages/id.json`
- `src/components/admin/home-nav/site-setting-editor-form.tsx`
- `src/features/home-nav/admin-detail.ts`
- `tests/m4/contracts/home-nav-contracts.test.ts`

## API, Schema, Migration Impact

- No schema or migration changes.
- No endpoint changes.
- The existing `SITE_SETTING` update payload remains the same contract; the client now submits the required nullable media identifier fields.

## Verification

- Local DB contract check for `getHomeNavAdminDetail(..., "SITE_SETTING", "singleton")` followed by `SiteSettingInputSchema` and `HomeNavAdminCommandSchema` parsing — passed with `detailOk`, `inputOk`, and `commandOk` all `true`.
- `npx vitest run tests/m4/contracts/home-nav-contracts.test.ts` — passed, 1 file / 11 tests.
- `git diff --check` — passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed, 93 files / 1167 tests.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX.md TASK_BASE=f10ccc34f460f5d1810650616f2f5d0f5fa11657 npm run check:scope` — passed, 8 changed files within lease.

## Untested Areas, Risks, Follow-ups

- Browser-level save was not run with Playwright. The server-side command contract was reproduced directly against the local database and now accepts the unchanged setting payload.
- Video URLs still must pass the existing public HTTPS URL contract; raw iframe embeds, `http://`, localhost, and private IP hosts remain rejected intentionally.

## Requested Contract/Dependency Changes

- None.
