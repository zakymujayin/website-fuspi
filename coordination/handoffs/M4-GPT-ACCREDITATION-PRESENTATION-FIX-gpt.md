# Handoff: M4-GPT-ACCREDITATION-PRESENTATION-FIX

- task ID: `M4-GPT-ACCREDITATION-PRESENTATION-FIX`
- branch: `ai/gpt/m4-public-ia-menu-remap`
- base SHA: `7ed31f6`
- head SHA: `0c6a8ac`

## Summary

- Removed the extra dark accreditation welcome banner from the public page.
- Renamed the program-list section heading to `Program Studi` so the page does not repeat `Akreditasi` unnecessarily.
- Kept all four accreditation fields visible for every program. Missing values now show the localized generic CMS empty state instead of disappearing.

## Verification

- `npx vitest run tests/m4/runtime/academic-accreditation.test.ts tests/m4/ui/accreditation-page.test.tsx` — passed (5 tests)
- `npm run typecheck` — passed
- `npm run lint` — passed with one pre-existing warning in `src/components/public/academic-topic-shell.tsx`
- `git diff --check` — passed

## Follow-up

The local CMS still has no official decree number for the three programs. Enter each number at `/id/admin/program-studi`, then save; the public page will show it after revalidation.
