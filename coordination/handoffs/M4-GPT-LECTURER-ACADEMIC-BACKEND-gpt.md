# Handoff — M4-GPT-LECTURER-ACADEMIC-BACKEND

- **Task ID:** M4-GPT-LECTURER-ACADEMIC-BACKEND
- **Branch:** `ai/gpt/m4-public-ia-menu-remap`
- **Base SHA:** `26640d7d8f9f1f17fc3bf951d0dd28f98cb0a3e2`
- **Head SHA:** `c6f556c`

## Summary

Added persistence and ADMIN-only domain operations for lecturer intellectual
property and teaching assignments. Teaching schedule imports support bounded
CSV/JSON input, preview, stable lecturer resolution by ID or NIDN, duplicate
reporting, atomic Serializable commit/upsert, audit logging, and public-path
revalidation. The public lecturer detail query now renders the persisted HKI
and teaching records.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260904150000_add_lecturer_hki_teaching_assignments/migration.sql`
- `src/contracts/lecturer-academic.ts`
- `src/features/academic/lecturer-academic-records.ts`
- `src/app/api/admin/academic/lecturer-records/route.ts`
- `src/app/[locale]/(public)/dosen/[id]/page.tsx`
- `tests/m4/contracts/lecturer-academic-contracts.test.ts`
- `tests/m4/runtime/lecturer-academic-records.test.ts`

## API/schema impact

The migration adds `LecturerIntellectualProperty`, `LecturerTeachingAssignment`,
`IntellectualPropertyType`, and `TeachingTerm`. `POST /api/admin/academic/lecturer-records`
accepts HKI/teaching CRUD commands plus `IMPORT_PREVIEW` and `IMPORT_COMMIT`.
All writes require an active ADMIN session, same-origin requests, validated
stable identifiers, and scoped relation IDs.

## Verification

- `npm run prisma:validate` — passed.
- `npm run lint` — passed with one pre-existing warning in `academic-topic-shell.tsx`.
- `npm run typecheck` — passed.
- `npm run test` — passed: 130 files, 1,444 tests.
- `npm run build` — passed: Next.js 16.2.10 compiled and generated all routes.
- `git diff --check` — passed.

## Untested areas, risks, and follow-ups

- A live database migration and browser upload were not run in this workspace.
- The import transport currently accepts bounded JSON containing CSV text or
  normalized rows; a browser file picker can be layered on without changing
  the domain contract.
- The academic course catalog still uses its existing catalog source; the
  teaching-assignment records are available for the lecturer profile and
  import workflow.
