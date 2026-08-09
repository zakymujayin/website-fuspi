# M4-GPT-CMS-SHARED-CONTRACTS — GPT handoff

## Identity

- Task: `M4-GPT-CMS-SHARED-CONTRACTS`
- Branch: `ai/gpt/m4-cms-shared-contracts`
- Manifest contract base: `63be1c2cb5ac4e9e20a270aafb9d16982d6ad928`
- Assignment/merge base: `8c48386`
- Implementation head: `2812da58798af11b589d5ba4751cde7638ad6f52`

## Summary

Added strict shared trust-boundary contracts for the remaining FUSPI CMS
backend without changing accepted Post/Page contracts:

- bounded identifier, search, pagination, page metadata and sort direction;
- duplicate-preserving query collection and normalization with explicit
  prototype-property rejection;
- ID-required unique locale sets, translation workflow provenance, and safe
  ID fallback metadata;
- unique contiguous zero-based reorder batches;
- canonical internal links and public HTTPS external links with traversal,
  encoded-control, bidi-control, credential and private-host rejection;
- safe public Media/PDF references without storage keys;
- bounded resource, governance and snapshot-free revision summaries; and
- strict serializable ADMIN mutation success and non-technical failure shapes.

## Files changed

- `src/contracts/cms.ts`
- `tests/m4/contracts/cms-shared-contracts.test.ts`
- `coordination/handoffs/M4-GPT-CMS-SHARED-CONTRACTS-gpt.md`

## API, schema, migration, and dependency impact

- Adds a shared TypeScript/Zod contract module only; no HTTP route is added.
- No Prisma schema, migration, generated code, runtime, dependency,
  configuration, UI, message, or existing contract change.
- Downstream resource contracts may compose these schemas but must retain
  resource-specific fields, statuses, authorization, and failure mappings.

## Verification

| Command | Exact result |
| --- | --- |
| `npx vitest run tests/m4/contracts/cms-shared-contracts.test.ts` | PASS — 1 file, 31/31 tests |
| `npm run lint` | PASS — exit 0 |
| `npm run typecheck` | PASS — exit 0 |
| `npm run test` | PASS — 56 files, 868/868 tests |
| `npm run build` with isolated development `DATABASE_URL` loaded | PASS — Next.js 16.2.10, 35/35 static pages |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-CMS-SHARED-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope` | PASS — 2 implementation files within lease before handoff |

The first focused run passed 25/26 and exposed that the object parser specially
handled `__proto__`; the collector was corrected to reject `__proto__`,
`constructor`, and `prototype` explicitly. The final focused result is 31/31.
The first build compiled and typechecked but could not collect Auth route data
because that shell lacked `DATABASE_URL`; the exact rerun with the isolated GPT
development database environment passed. `next-env.d.ts` regeneration from the
build was restored and is not part of the task.

## Risks and follow-ups

- These are composable primitives, not a generic CRUD engine. Each resource
  still needs a frozen resource contract and explicit domain/transport logic.
- HTTPS link validation blocks literal local/private hosts. Any future server-
  side link checker must additionally defend against DNS rebinding and private
  resolution at request time.
- Translation `STALE` may retain paired prior reviewer/timestamp provenance;
  `DRAFT` cannot. `REVIEWED`/`PUBLISHED` require complete review metadata.
- Public documents use the accepted public upload URL shape. Private and PPKS
  downloads require separate authorized transports and must never use this
  public view.
- No PostgreSQL integration test is necessary for this schema-only contract;
  downstream domain tasks must supply database evidence.
