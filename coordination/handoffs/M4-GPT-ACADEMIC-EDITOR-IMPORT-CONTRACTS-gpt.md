# M4-GPT-ACADEMIC-EDITOR-IMPORT-CONTRACTS — GPT handoff

- Branch: `ai/gpt/m4-academic-editor-import-contracts`
- Base: `8539029848b519cec3d8bf752cb601d26c7d43bf`
- Implementation head: `ae3f29b5c563eaed571d060698e7d786da3f8828`

## Summary

Added strict editor-detail contracts for all six v1 academic resources and a
bounded Lecturer/Staff import protocol. Editor details carry complete editable
input, workflow metadata, correct nullable/positive version semantics,
governance, and public-safe assets. Import supports PREVIEW or atomic COMMIT,
1–500 normalized rows, one resource per batch, unique row numbers and batch
identities, deterministic row results, coherent summaries, and formula-safe
labels.

## Files

- `src/contracts/academic-editor.ts`
- `tests/m4/contracts/academic-editor-contracts.test.ts`
- `coordination/handoffs/M4-GPT-ACADEMIC-EDITOR-IMPORT-CONTRACTS-gpt.md`

No schema, migration, dependency, runtime, route, auth, or env change.

## Verification

- Focused contracts: PASS 5/5.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS 62 files, 911/911.
- `npm run build` with isolated database env: PASS, 39/39 static pages.
- `git diff --check`: PASS.
- scope-check: PASS, 2 implementation/test files before handoff.

The first build attempt omitted `DATABASE_URL` and correctly stopped while
collecting Auth route data; rerunning with the required isolated environment
passed. This was environment invocation, not a product regression.

## Follow-up

The next runtime task must implement ADMIN detail loading plus import
PREVIEW/COMMIT. COMMIT must revalidate every row inside a Serializable
transaction and roll back the entire batch on any conflict. It must not accept
CSV formulas, arbitrary column mappings, partial commits, or untyped payloads.
