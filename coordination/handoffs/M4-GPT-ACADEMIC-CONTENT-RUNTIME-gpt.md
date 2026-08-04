# M4-GPT-ACADEMIC-CONTENT-RUNTIME — GPT handoff

- Task: `M4-GPT-ACADEMIC-CONTENT-RUNTIME`
- Branch: `ai/gpt/m4-academic-content-runtime`
- Base: `dae198d7fd7cb3685488bdec2c0e40f2db260688`
- Implementation head: `032485539a5215898338d5d56d22189bfab20eb1`

## Summary

Implemented strict ADMIN CRUD/list and safe public queries for Research,
CommunityService, and Unit. Parent, translations, and lecturer relations mutate
atomically under Serializable transactions. Unit uses optimistic versions and
root/locale ContentRevision rows. All resources create ActivityLog records,
sanitize rich text with post-sanitize validation, and map failures to frozen
non-technical result codes.

Public results require PUBLISHED requested-locale or Indonesian fallback.
Units are additionally active-only. Projections never contain phone, lecturer
IDs, private identifiers, arbitrary selectors, or database errors.

## Files changed

- `src/features/academic/content.ts`
- `src/app/api/admin/academic/content/route.ts`
- `tests/m4/runtime/academic-content.test.ts`
- `tests/m4/runtime/academic-content.integration.test.ts`
- `tests/security/academic-content-adversarial.integration.test.ts`
- `coordination/handoffs/M4-GPT-ACADEMIC-CONTENT-RUNTIME-gpt.md`

## API/schema impact

- Added `GET/POST /api/admin/academic/content` for the frozen academic query and
  command schemas, restricted to RESEARCH, COMMUNITY_SERVICE, and UNIT.
- Exported `listPublicAcademicContent()` for public Server Component use.
- No schema, migration, contract, dependency, auth, root config, or env changes.

## Verification

Database commands used isolated `fuspi_dev_gpt`.

- Focused unit: PASS 5/5.
- Focused PostgreSQL/adversarial: PASS 7/7.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS 61 files, 906/906.
- `npm run test:integration`: PASS 30 files, 138/138.
- `npm run prisma:validate`: PASS.
- `npm run build`: PASS, 39/39 static pages and route registered.
- `git diff --check`: PASS.
- scope-check: PASS, 5 implementation/test files within lease before handoff.

## Risks and follow-ups

- The frozen admin view remains a summary projection and needs the same future
  GPT-owned typed editor-detail contract noted by the people-runtime handoff.
- Research and CommunityService have no parent version column; UPDATE requires
  `expectedVersion: null`. Unit requires its positive expected version.
- Optional EN/AR writes remain DRAFT; Indonesian is published with review
  metadata. A later translation-workflow slice can promote other locales.
- UI/browser coverage and public structured-data presentation remain outside
  this backend lease.
