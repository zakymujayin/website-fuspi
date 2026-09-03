# Handoff: M4-GPT-PRODI-ACCREDITATION-CORRECTION

- task ID: `M4-GPT-PRODI-ACCREDITATION-CORRECTION`
- branch: `ai/gpt/m4-public-ia-menu-remap`
- base SHA: `b24437a`
- head SHA: `9a5b96b`

## Summary

Corrected the active FUSPI study-program accreditation contract and updated the local PostgreSQL data:

- IAT: `Unggul`
- IH: `B`
- AFI: `B`

The seed preserves the existing accreditation expiry dates and does not infer or modify validity dates.

## Files changed

- `prisma/seed.ts`
- `tests/m4/contracts/study-program-accreditation.test.ts`
- `coordination/ownership.yml`
- `coordination/tasks/M4-GPT-PRODI-ACCREDITATION-CORRECTION.md`

## API/schema/migration impact

No API, Prisma schema, or migration changes. The local database was updated with a transaction that changed only `StudyProgram.accreditation` for IAT, IH, and AFI.

## Verification

- `npx vitest run tests/m4/contracts/study-program-accreditation.test.ts` — passed (1 test)
- `npm run prisma:validate` — passed
- `npm run lint` — passed with one pre-existing warning in `src/components/public/academic-topic-shell.tsx`
- `npm run typecheck` — passed
- `npm run test` — passed (119 files, 1,411 tests)
- `git diff --check` — passed

## Risks and follow-ups

- The accreditation values are now correct in the seed and local database.
- Validity dates remain `2028-06-30` in the local database because no replacement dates were provided.
- Production/staging data must be updated through the authenticated admin CMS or its deployment data process.
