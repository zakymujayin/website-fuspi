# M4-GPT-ACADEMIC-PUBLIC-DETAIL-RUNTIME — GPT handoff

- Branch: `ai/gpt/m4-academic-public-detail-runtime`
- Base: `ba61d2f3aa1687578af1f36948d691ab9d3b1d88`
- Implementation head: `c2e59eec509de62b72453eaffb34fa4d990aa992`

## Summary

Implemented the trusted public academic detail query for StudyProgram,
Lecturer, Staff, Research, CommunityService, and Unit. The runtime validates a
strict resource/slug/locale query before database access, resolves only a
PUBLISHED requested locale or PUBLISHED Indonesian fallback, active-filters
applicable records and related lecturers, sanitizes rich text, and validates
legacy URLs plus public media/PDF metadata against frozen contracts.

Absent, inactive, unpublished, or unsafe records share `NOT_FOUND`; database
failures share `UNAVAILABLE`. Public output structurally excludes phone, NIP,
NIDN, ownership/workflow fields, checksums, and private storage keys.

Files changed:

- `src/features/academic/public-detail.ts`
- `tests/m4/runtime/academic-public-detail.test.ts`
- `tests/m4/runtime/academic-public-detail.integration.test.ts`
- `tests/security/academic-public-detail-adversarial.integration.test.ts`
- this handoff

## API, schema, and migration impact

Exports `getPublicAcademicDetail` and `AcademicPublicDetailDatabase` for trusted
Server Component callers. No route handler, Prisma schema, migration,
dependency, auth, shared contract, environment, or UI change.

## Verification

- `npx vitest run tests/m4/runtime/academic-public-detail.test.ts`: PASS, 1 file, 5/5.
- Focused PostgreSQL runtime plus adversarial suites: PASS, 2 files, 9/9.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS, 65 files, 926/926.
- `npm run test:integration`: PASS, 34 files, 155/155.
- `npm run prisma:validate` with the isolated GPT database environment: PASS.
- `npm run build`: PASS, compilation/typecheck and 41/41 static pages.
- `git diff --check`: PASS.
- task scope check: PASS, 4 implementation/test files within lease before handoff.

## Untested areas, risks, and follow-up

No HTTP route or UI currently consumes this trusted query; those layers remain
outside this task. URL and stored-content validation deliberately fail closed,
so malformed legacy public records remain hidden until corrected in admin data.
The eventual public pages must call this module server-side and must not weaken
its output contract or re-query private academic fields.
