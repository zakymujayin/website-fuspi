# M4-GPT-PUBLIC-CONTENT-CONTRACT-CORRECTION — GPT handoff

- Branch: `ai/gpt/m4-public-content-contract-correction`
- Base: `24f6c32094db5f845acd43e993b37a07b2933fd2`
- Assignment head: `c697e3e7be3934a5dc043416b42163d1c9d7b110`
- Implementation head: `824aecbe35bc8abbcb9da2556934daf1c2194b03`

## Summary

Corrected the frozen DELETE command to require `expectedVersion`, nullable so
the runtime can distinguish versioned Service/Document/Event/FAQ from resources
that do not have a version column. The field is strict and mandatory; arbitrary
selectors remain rejected.

Files: `src/contracts/public-content.ts`, its focused test, and this handoff.
No schema, migration, runtime, route, dependency, environment, or UI impact.

## Verification

- focused contracts: PASS, 10/10.
- lint/typecheck: PASS.
- full unit: PASS, 67 files, 939/939.
- diff-check/scope-check: PASS, 2 implementation/test files before handoff.

## Follow-up

The domain must reject null versions for Service/Document/Event/FAQ, reject
non-null versions for unversioned resources, and claim the matching version
inside the same transaction before deletion.
