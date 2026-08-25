# M4-GPT-HOME-SETTINGS-CONTROLLED-FORM-FIX — GPT Handoff

## Task

- Task ID: M4-GPT-HOME-SETTINGS-CONTROLLED-FORM-FIX
- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: 21acd89e5295eac4100d79ca32b63478164f0e3c
- Head SHA: containing commit

## Summary

- Converted Admin Home Settings text inputs and textareas from uncontrolled `defaultValue` usage to controlled state with `value` and `onChange`.
- Kept submit payload generation on the same `SITE_SETTING` contract while reading from stable React state instead of DOM defaults.
- Added a `key` on `SiteSettingEditorForm` based on the singleton `version` so a successful save remounts the form with the latest `expectedVersion`.
- Keyed the translation field group by active locale so Base UI field state is reset cleanly when switching language tabs, while the entered values remain in component state.
- Added a contract/source guard to prevent `defaultValue` from returning to this form.

## Files Changed

- `coordination/tasks/M4-GPT-HOME-SETTINGS-CONTROLLED-FORM-FIX.md`
- `coordination/handoffs/M4-GPT-HOME-SETTINGS-CONTROLLED-FORM-FIX-gpt.md`
- `src/app/[locale]/admin/beranda/pengaturan/page.tsx`
- `src/components/admin/home-nav/site-setting-editor-form.tsx`
- `tests/m4/contracts/home-nav-contracts.test.ts`

## API, Schema, Migration Impact

- No schema or migration changes.
- No endpoint changes.
- No command payload shape change; the client still submits the existing `SITE_SETTING` update contract.

## Verification

- `npx tsc --noEmit --pretty false` — passed.
- `npx vitest run tests/m4/contracts/home-nav-contracts.test.ts` — passed, 1 file / 11 tests.
- `git diff --check` — passed.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed, 93 files / 1167 tests.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-HOME-SETTINGS-CONTROLLED-FORM-FIX.md TASK_BASE=21acd89e5295eac4100d79ca32b63478164f0e3c npm run check:scope` — passed, 5 changed files within lease.

## Untested Areas, Risks, Follow-ups

- Browser save was not automated with an authenticated Playwright session. The warning source was removed from the form by eliminating uncontrolled Base UI text controls.
- If the page was open during hot reload, the browser can show one transient React warning about switching from uncontrolled to controlled. A full refresh loads only the controlled form.

## Requested Contract/Dependency Changes

- None.
