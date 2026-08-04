# M4-GPT-ACADEMIC-PEOPLE-RUNTIME — GPT handoff

- Task: `M4-GPT-ACADEMIC-PEOPLE-RUNTIME`
- Branch: `ai/gpt/m4-academic-people-runtime`
- Base: `53511af2d1a02b5bb231e89765acabe3e8b8badf`
- Implementation head: `c13dd9dcf091a367fc838403f9c5571a2fe12df8`
- Owner: GPT

## Summary

Implemented the PostgreSQL runtime for the frozen v1 academic people slice:
StudyProgram, Lecturer, and Staff. The slice provides strict ADMIN list/command
transport plus safe public query functions. It enforces ADMIN session state,
bounded same-origin JSON transport, strict Zod inputs, canonical five-program
identity/order, transactions, StudyProgram optimistic locking/revisions,
audit events, sanitized rich text, PUBLIC image/PDF references, atomic locale
replacement, relation validation, and reference-safe deletion.

The public projection is active-only and translation-publication-aware with ID
fallback. It contains only the contract fields and never includes phone, NIP,
NIDN, storage key, checksums, private media, inactive rows, or database errors.

## Files changed

- `src/features/academic/people.ts`
- `src/app/api/admin/academic/people/route.ts`
- `tests/m4/runtime/academic-people.test.ts`
- `tests/m4/runtime/academic-people.integration.test.ts`
- `tests/security/academic-people-adversarial.integration.test.ts`
- `coordination/handoffs/M4-GPT-ACADEMIC-PEOPLE-RUNTIME-gpt.md`

## API, schema, and migration impact

- Added `GET /api/admin/academic/people` with strict query parameters:
  `resource`, `page`, `pageSize`, `search`, `direction`, `active`, and optional
  `studyProgramId`.
- Added `POST /api/admin/academic/people` for the frozen
  `AcademicCommandSchema` CREATE/UPDATE/DELETE commands for StudyProgram,
  Lecturer, and Staff.
- Exported `listPublicAcademicPeople()` for locale-aware Server Component/public
  route consumption without exposing an additional HTTP API.
- No Prisma schema, migration, dependency, root configuration, shared contract,
  auth, or environment-contract changes.

## Invariants and decisions

- StudyProgram accepts only canonical IAT, IH, AFI, SAA, and TASPI identity
  pairs/order. An existing program cannot change code; canonical programs are
  deactivated instead of deleted.
- StudyProgram UPDATE requires its schema-provided `expectedVersion`; revisions
  are written for root and each supplied locale in the same transaction.
- Lecturer and Staff have no parent version column in the frozen Prisma/academic
  contract, so their command `expectedVersion` must remain `null`.
- An active record publishes its required Indonesian translation with complete
  review metadata; optional EN/AR writes remain DRAFT until a later translation
  workflow task promotes them.
- Lecturer delete returns `IN_USE` when linked to research, community service,
  or posts. The command transaction uses PostgreSQL Serializable isolation.
- A referenced academic image must be a valid PUBLIC WebP with accessible media
  metadata. A referenced program document must be a published PUBLIC PDF with a
  published Indonesian translation and a contract-valid public URL.

## Verification

All database commands used the isolated `fuspi_dev_gpt` database.

- `npx vitest run tests/m4/runtime/academic-people.test.ts`
  - PASS: 1 file, 5/5 tests.
- `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/academic-people.integration.test.ts tests/security/academic-people-adversarial.integration.test.ts`
  - PASS: 2 files, 10/10 tests; repeated after final production changes.
- `npm run lint`
  - PASS.
- `npm run typecheck`
  - PASS.
- `npm run test`
  - PASS: 60 files, 901/901 tests.
- `npm run test:integration`
  - PASS: 28 files, 131/131 tests.
- `npm run prisma:validate`
  - PASS: schema valid.
- `npm run build`
  - PASS: production build, 38/38 static pages; new admin route registered.
- `git diff --check origin/integration/m4-features...HEAD`
  - PASS.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-ACADEMIC-PEOPLE-RUNTIME.md TASK_BASE=origin/integration/m4-features npm run check:scope`
  - PASS: 5 implementation/test files within lease before this handoff.
- PostgreSQL cleanup probe after repeated focused and full integration runs:
  - PASS: 0 residual StudyProgram, Lecturer, Staff, Document, Media, or User
    fixtures matching this task's markers.

## Untested areas and follow-ups

- No browser/UI test is included; this is a backend task and the UI lane has not
  yet consumed the endpoint.
- The frozen `AcademicAdminViewSchema` is deliberately a summary projection
  (workflow/governance/assets) and does not carry every editable field. A new
  GPT-owned contract task is required before a full academic editor/detail UI;
  do not invent an untyped detail payload in the Claude lane.
- Public route composition and structured-data presentation remain Claude UI
  work after the corresponding public route lease is opened.
- Research, CommunityService, and Unit are rejected by this endpoint and remain
  in the next backend runtime task.

## Risk

Residual risk is medium: the implemented server/database behavior is covered,
but the frozen admin contract needs a separate typed editor-detail projection
before the UI can support complete editing. No security-sensitive finding is
open in this slice.
