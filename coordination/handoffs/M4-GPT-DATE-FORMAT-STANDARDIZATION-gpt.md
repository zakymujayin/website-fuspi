# Handoff — M4-GPT-DATE-FORMAT-STANDARDIZATION

- **Task ID:** M4-GPT-DATE-FORMAT-STANDARDIZATION
- **Branch:** `ai/gpt/m4-public-ia-menu-remap`
- **Base SHA:** `745a28e`
- **Implementation head SHA:** `7f1d76c`

## Summary

Standardized user-facing dates across public and admin pages to `dd/mm/yyyy`.
Timestamp displays use `dd/mm/yyyy HH:mm` in `Asia/Jakarta`. A shared helper
now prevents locale-specific `mm/dd/yyyy` output from reappearing.

## Files changed

- `src/lib/format/date.ts`
- Public post, content card, booking, complaint, academic, album, agenda,
  scholarship, activity, partnership, achievement, announcement, and column
  displays.
- Admin post/page/media/booking/PPKS date displays.
- Existing formatter tests and `tests/m4/ui/date-format-standardization.test.ts`.

## Contract and data impact

No database, API, or storage format changes. ISO values remain unchanged for
machine-readable attributes, exports, internal date keys, and native HTML date
inputs.

## Verification

- `npm run lint` — passed; one pre-existing warning in `academic-topic-shell.tsx`.
- `npm run typecheck` — passed.
- `npm run test` — passed: 132 files, 1,448 tests.
- `npm run build` — passed: Next.js 16.2.10 compiled and generated 357 pages.
- `git diff --check` — passed.

## Untested areas

- No live browser locale smoke test was run; formatter tests cover Jakarta
  timezone rollover and exact day/month/year ordering.
