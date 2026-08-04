# M4-GPT-BACKEND-V1-INVENTORY — GPT handoff

## Identity

- Task: `M4-GPT-BACKEND-V1-INVENTORY`
- Branch: `ai/gpt/m4-backend-v1-inventory`
- Manifest base: `ffb0e6cc6d44bf8462692f00e62d81e913eb509c`
- Assignment base: `438331e`
- Inventory implementation head: `3d3024cb39e4ea0a51179d9c1bffd5ba4dd33c67`

## Summary

Audited the complete documented FUSPI v1 backend boundary against the actual
Prisma schema/migrations, seed, contracts, domain/library implementation, HTTP
routes, test inventory, and accepted milestone evidence.

The durable inventory distinguishes accepted, partial, schema-only, and
operational-gate capabilities. It records that the repository has 112 Prisma
models but only Auth, Post, Media, Page, selected platform primitives, and
Ticket/PPKS read isolation have substantial runtime implementation today.

Created an ordered backend-first roadmap of 40 bounded inventory, contract,
domain, transport, security, operations, acceptance, and final frontend-
contract tasks. The roadmap excludes Course/Curriculum, SILA API/SSO, PMB
workflows, historical import, and newsletter campaigns from v1.

## Files changed

- `coordination/reviews/M4-BACKEND-V1-INVENTORY-gpt.md`
- `coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md`
- `coordination/handoffs/M4-GPT-BACKEND-V1-INVENTORY-gpt.md`

## API, schema, migration, and dependency impact

- None. This task is read-only analysis plus governance documentation.
- Existing migrations were not edited.
- No runtime, dependency, environment, UI, fixture, or generated file changed.

## Verification

| Command | Result |
| --- | --- |
| `test -s coordination/reviews/M4-BACKEND-V1-INVENTORY-gpt.md` | PASS |
| `test -s coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md` | PASS |
| `git diff --check` | PASS after Markdown whitespace correction |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-BACKEND-V1-INVENTORY.md TASK_BASE=origin/integration/m4-features npm run check:scope` | PASS — 2 inventory files within lease before handoff |

Evidence inventory commands also counted 112 models, 33 translation models, 37
enums, 9 API route files, 11 contract files, 5 feature files, 44 library
TypeScript files, 81 test files, and 12 E2E files on the assignment base.

## Risks and follow-ups

- The roadmap is deliberately large but each coding task remains bounded; it
  must not be implemented as a single unreviewable branch.
- Schema availability must not be used as proof that a workflow exists.
- PPKS, booking concurrency, privacy exports, private storage, and VPS restore
  retain immediate evidence gates even though general reviews are batched.
- Institutional PPKS policy/contact approval, official content, production
  secrets, SMTP, storage paths, DNS/TLS, and VPS backup evidence remain human or
  environment go-live gates; implementation must use safe configurable defaults
  without inventing them.
- The next coding task is `M4-GPT-CMS-SHARED-CONTRACTS`, followed by ADMIN user
  and taxonomy completion. Claude may finish Page ADMIN UI but should not begin
  additional modules until their accepted backend contracts exist.
