# Handoff: M4-GPT-ACCREDITATION-CMS-REDESIGN

- task ID: `M4-GPT-ACCREDITATION-CMS-REDESIGN`
- branch: `ai/gpt/m4-public-ia-menu-remap`
- base SHA: `d594836`
- head SHA: pending commit

## Summary

The public `/akademik/akreditasi` page now reads active IAT, IH, and AFI records
from `StudyProgram` instead of `dummyAccreditations`. The faculty accreditation
block was removed because no official faculty record exists. The page has a
new editorial layout with one focused card per program, conditional facts, and
an explicit certificate empty state.

The existing `/admin/program-studi/<id>/edit` editor now manages accreditation
grade, agency, decree number, expiry, and one public PDF certificate. The PDF
picker uploads through the existing authenticated public-PDF media pipeline.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260904120000_add_study_program_accreditation_details/migration.sql`
- `src/contracts/academic.ts`
- `src/contracts/academic-public.ts`
- `src/features/academic/people.ts`
- `src/features/academic/public-detail.ts`
- `src/app/[locale]/(public)/akademik/akreditasi/page.tsx`
- `src/app/[locale]/admin/program-studi/[id]/edit/page.tsx`
- `src/app/api/admin/academic/people/route.ts`
- `src/components/admin/academic/program-certificate-picker.tsx`
- `src/components/admin/academic/program-studi-editor-form.tsx`
- `src/components/admin/academic/program-studi-types.ts`
- accreditation contract/runtime/UI tests
- `coordination/ownership.yml`

## API/schema/migration impact

Added nullable `StudyProgram.accreditationAgency`,
`StudyProgram.accreditationDecreeNumber`, and
`StudyProgram.accreditationCertificateMediaId`, with a public `Media` relation
for validated PDF certificates. No existing accreditation expiry values were
changed. The local PostgreSQL database applied the migration successfully.
Successful admin mutation revalidates `/akademik/akreditasi` for all locales.

## Verification

- `npx prisma validate` — passed
- `npx prisma generate` — passed
- `npx prisma migrate deploy` — passed; migration applied locally
- targeted accreditation and academic contract tests — passed (15 tests)
- `npm run test` — passed (122 files, 1,417 tests)
- `npm run lint` — passed with one pre-existing warning in `src/components/public/academic-topic-shell.tsx`
- `npm run typecheck` — passed
- `npm run build` — passed for ID/EN/AR routes
- `git diff --check` — passed

## Risks and follow-ups

- Certificate files are public PDFs by design; admins should upload only official public certificates.
- Existing dummy academic arrays remain for other academic topic pages, but this page no longer imports accreditation dummy data.
- The public page shows only fields supplied in CMS and does not invent faculty accreditation data.
