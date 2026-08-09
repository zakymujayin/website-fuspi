# M4-GPT-ACADEMIC-PUBLIC-DETAIL-CONTRACTS — GPT handoff

- Branch: `ai/gpt/m4-academic-public-detail-contracts`
- Base: `7cae3f12531f2028fd0c0ba7277b39a1e8bf6f18`
- Implementation head: `fbe39cb9dd21d9215fdc36eaa0951d4a39152832`

## Summary

Added strict slug+locale detail query and discriminated public detail results
for all six academic resources. The contracts include complete visible page
content, safe media/PDF/link views, locale-resolution metadata, program/person
references, and structurally exclude phone, NIP, NIDN, ownership/workflow,
private storage metadata, arbitrary selectors, and technical errors.

Files: `src/contracts/academic-public.ts`, focused contract tests, and this
handoff. No schema, migration, runtime, dependency, auth, or env changes.

## Verification

- Focused contracts: PASS 5/5.
- Full unit: PASS 64 files, 921/921.
- lint/typecheck: PASS.
- production build: PASS 41/41 static pages.
- diff-check/scope-check: PASS, 2 implementation/test files before handoff.

## Follow-up

The runtime must resolve only a PUBLISHED requested locale or PUBLISHED ID
fallback, require active StudyProgram/Lecturer/Staff/Unit records, filter
related lecturers independently, validate every legacy URL/asset through these
schemas, and return identical NOT_FOUND for absent versus unpublished slugs.
