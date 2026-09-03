# Handoff — M4-GPT-LECTURER-ADMIN-ACADEMIC-EDITOR

- **Task ID:** M4-GPT-LECTURER-ADMIN-ACADEMIC-EDITOR
- **Branch:** `ai/gpt/m4-public-ia-menu-remap`
- **Base SHA:** `c6f556c`
- **Head SHA:** `f3cc14d`

## Summary

Connected the existing ADMIN lecturer edit page to the new academic-record
domain. ADMIN users can now add, update, and delete HKI records and teaching
assignments, including course code/name, program, SKS, academic year, term,
and semester. Each form uses the server action and scoped command validation.

## Files changed

- `src/app/[locale]/admin/dosen/[id]/edit/page.tsx`
- `src/components/admin/lecturer/lecturer-academic-records-actions.ts`
- `src/components/admin/lecturer/lecturer-academic-records-manager.tsx`
- `tests/m4/ui/admin-lecturer-academic-records.test.tsx`

## API/schema impact

No additional schema or API changes. The editor calls the ADMIN-only commands
and loader from `lecturer-academic-records.ts`.

## Verification

- `npm run lint` — passed with one pre-existing warning in `academic-topic-shell.tsx`.
- `npm run typecheck` — passed.
- Targeted UI/runtime tests — passed: 8 tests.
- `git diff --check` — passed.

## Untested areas, risks, and follow-ups

- A live browser session with a seeded ADMIN and migrated database was not run.
- Schedule file upload UI remains a follow-up; the backend import preview/commit
  endpoint is ready for a file-picker client.
