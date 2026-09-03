# Handoff: M4-GPT-ACCREDITATION-PRESENTATION-FIX

- task ID: `M4-GPT-ACCREDITATION-PRESENTATION-FIX`
- branch: `ai/gpt/m4-public-ia-menu-remap`
- base SHA: `7ed31f6`
- head SHA: `c3bd5f6`

## Summary

- Removed the extra dark accreditation welcome banner from the public page.
- Renamed the program-list section heading to `Program Studi` so the page does not repeat `Akreditasi` unnecessarily.
- Kept all four accreditation fields visible for every program. Missing values now show the localized generic CMS empty state instead of disappearing.
- Changed each program card header from gray to the shared `bg-navy-800` table-header color, with white text and brass numbering for contrast.
- Hid the original certificate filename from the public accreditation page while keeping the certificate card label as the PDF link.
- Removed `originalName` from the public page query because it is no longer needed for presentation.

## API/schema impact

- None. This is a public presentation/query-shape change only; certificate storage, upload validation, and the admin picker are unchanged.

## Verification

- `npx vitest run tests/m4/runtime/academic-accreditation.test.ts tests/m4/ui/accreditation-page.test.tsx` — passed (7 tests, including the filename-visibility regression check)
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run test` — passed (124 files, 1425 tests)
- `git diff --check` — passed

## Follow-up

The local CMS still has no official decree number for the three programs. Enter each number at `/id/admin/program-studi`, then save; the public page will show it after revalidation.
