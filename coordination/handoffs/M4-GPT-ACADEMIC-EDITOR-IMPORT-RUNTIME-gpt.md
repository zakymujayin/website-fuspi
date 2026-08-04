# M4-GPT-ACADEMIC-EDITOR-IMPORT-RUNTIME — GPT handoff

- Branch: `ai/gpt/m4-academic-editor-import-runtime`
- Base: `76bc4912262c521baeb5668e858d3fb1c4b70734`
- Implementation head: `574534501b3448ab145892a79b50302acc60b1b6`

## Summary

Implemented ADMIN-only editor detail loading for all six academic resources and
Lecturer/Staff import PREVIEW/COMMIT. Detail loading validates actor before ID
lookup and returns the frozen full editor contract with public-safe assets.
Import accepts only normalized strict rows, sanitizes/revalidates rich text,
checks public media, program relations and database identities, previews
without writes, and repeats validation inside one Serializable COMMIT
transaction. Audit and locale workflow rows are created with the batch.

## Files

- `src/features/academic/editor-import.ts`
- `src/app/api/admin/academic/editor/route.ts`
- `src/app/api/admin/academic/people/import/route.ts`
- three focused/unit/PostgreSQL/adversarial test files
- this handoff

No schema, migration, dependency, auth, shared contract, or env changes.

## Verification

- Focused unit: PASS 5/5.
- Focused PostgreSQL/adversarial: PASS 8/8.
- Full unit: PASS 63 files, 916/916.
- Full integration: PASS 32 files, 146/146.
- lint, typecheck, Prisma validate: PASS.
- production build: PASS, 41/41 static pages; editor/import routes registered.
- diff-check and scope-check: PASS, 6 implementation/test files before handoff.

## Behavior and residual risk

- PREVIEW never opens a write transaction.
- COMMIT creates every row or none; a preflight conflict returns row-level
  VALID/INVALID results with no IDs. P2002/P2034 races are normalized and never
  expose Prisma data.
- Import input is normalized JSON rather than arbitrary CSV column mappings;
  CSV parsing/presentation belongs to the UI boundary and must produce this
  strict contract.
- Browser/E2E UI remains outside this backend lease.
