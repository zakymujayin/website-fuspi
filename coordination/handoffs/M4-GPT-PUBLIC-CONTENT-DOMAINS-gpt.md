# M4-GPT-PUBLIC-CONTENT-DOMAINS handoff

- Task: `M4-GPT-PUBLIC-CONTENT-DOMAINS`
- Branch: `ai/gpt/m4-public-content-domains`
- Base branch: `integration/m4-features`
- Base SHA: `36633f26a4e3607c4ae1bed15541a3546bbd3e3d`
- Implementation head SHA: `f49f84aed0f2cf5aa6c6749316eeb2cbef6c5133`
- Model: GPT

## Summary

Implemented the complete frozen domain backend for Service, Partnership,
Scholarship, Achievement, StudentActivity, Document, Album, Event, FAQ, and
Testimonial. The implementation provides strict ADMIN list/detail and
create/update/delete/reorder boundaries, trusted public list/detail queries,
and formula-safe Partnership CSV rows.

All writes validate and sanitize before mutation, run in serializable
transactions, enforce public image/PDF references and relations, record audit
events, and create revisions for versioned resources. Versioned reorder
operations increment versions, write revisions, and audit atomically. Public
queries enforce publication, consent, active/expiry state, safe assets/links,
and ID-first locale fallback without returning governance or storage metadata.

## Files changed

- `src/features/public-content/shared.ts`
- `src/features/public-content/administration.ts`
- `src/features/public-content/admin-query.ts`
- `src/features/public-content/admin-detail.ts`
- `src/features/public-content/public-query.ts`
- `src/features/public-content/public-list.ts`
- `src/features/public-content/export.ts`
- `tests/m4/runtime/public-content-administration.test.ts`
- `tests/m4/runtime/public-content-public-query.test.ts`
- `tests/m4/runtime/public-content-loaders.test.ts`
- `tests/m4/runtime/public-content-domains.integration.test.ts`
- `tests/security/public-content-adversarial.integration.test.ts`
- `coordination/handoffs/M4-GPT-PUBLIC-CONTENT-DOMAINS-gpt.md`

## API, schema, migration impact

- No HTTP/RSC transport or browser route was added; those paths were outside
  this task lease.
- No contract, Prisma schema, migration, dependency, environment contract, or
  shared configuration changed.
- The implementation consumes the frozen `src/contracts/public-content.ts`
  contract and the two previously accepted schema corrections.

## Verification

Environment-backed commands used the isolated `fuspi_dev_gpt` PostgreSQL
database with `.env.local` sourced.

- `npx vitest run tests/m4/runtime/public-content*.test.ts --exclude '**/*.integration.test.ts'`
  - PASS: 3 files, 18/18 tests.
- `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/public-content*.integration.test.ts tests/security/public-content*.integration.test.ts`
  - PASS: 2 files, 10/10 tests.
- `npm run lint`
  - PASS, no issues.
- `npm run typecheck`
  - PASS.
- `npm run test`
  - PASS: 71 files, 958/958 tests.
- `npm run test:integration`
  - PASS: 38 files, 169/169 tests.
- `npm run prisma:validate`
  - PASS, schema valid.
- `npm run build`
  - PASS: production compile and 41/41 static pages; generated route list clean.
- `git diff --check`
  - PASS.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-CONTENT-DOMAINS.md TASK_BASE=origin/integration/m4-features npm run check:scope`
  - PASS; all changed paths are within the active lease.
- `next-env.d.ts`
  - Restored after build and unchanged.

## Tested behaviors

- All ten resources: create, update, admin detail, public detail, public list,
  and delete against PostgreSQL.
- Version conflict and version invalidation during versioned reorder.
- Transactional parent/translation/relation/audit/revision behavior.
- Public image/PDF validation and private image rejection before write.
- PUBLISHED ID fallback for EN requests across all ten public details.
- Hidden, expired, untranslated, unsafe, and missing detail non-disclosure.
- Existing-versus-missing mutation non-disclosure for EDITOR, PETUGAS, and
  SATGAS_PPKS.
- Strict selector-injection rejection with unchanged parent, translations,
  audit, and revisions.
- CSV formula-prefix escaping and Jakarta-date filename generation.
- Slug-specific P2002 mapping without mislabeling translation uniqueness.
- Cleanup leaves no task-created content, media, user, audit, or revision rows.

## Untested areas, risks, and follow-ups

- HTTP/RSC transport, CSRF enforcement, browser UI, Playwright, and axe are not
  part of this domain-only task and require their own leased transport/UI tasks.
- A Document stores immutable public PDF metadata while its editor input is
  reconstructed by matching the original Media `storageKey`. The later orphan
  cleanup task must treat Document storage keys as live references so the
  source Media row is not removed while the Document remains editable.
- Public list summaries intentionally return `null` rather than truncating
  sanitized rich HTML into malformed markup; detail responses retain the full
  sanitized description.

## Requested contract or dependency change

None.
