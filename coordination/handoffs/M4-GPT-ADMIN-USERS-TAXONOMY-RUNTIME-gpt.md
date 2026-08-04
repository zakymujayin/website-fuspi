# M4-GPT-ADMIN-USERS-TAXONOMY-RUNTIME — GPT handoff

- Branch: `ai/gpt/m4-admin-users-taxonomy-runtime`
- Base: `bc087587f72177bd69c70e30c3a8f0dff21eaa93`
- Assignment base: `7776217`
- Implementation: `d24b31dd3352f054616c8e8e66ec8360f5772eae`

## Delivered

Implemented ADMIN-only PostgreSQL runtime and no-store HTTP routes for User and
Category/Tag administration. Includes bounded duplicate-aware queries, CSRF,
bounded JSON, bcrypt cost 12, forced password change, self/last-ADMIN safety,
Serializable User updates, optimistic `updatedAt`, session revocation, audit,
atomic taxonomy translations, safe conflict mapping, usage counts and
referenced-delete protection.

Files are the six production/test paths in the task manifest plus this handoff.
No schema, migration, dependency, existing contract, auth, UI, or message
change.

## Verification

- focused unit: PASS, 10/10;
- focused PostgreSQL/adversarial: PASS, 7/7;
- full unit: PASS, 58 files / 887 tests;
- full PostgreSQL integration: PASS, 26 files / 121 tests;
- lint and typecheck: PASS;
- Prisma validation: PASS;
- production build: PASS, 37/37 static pages with both new API routes;
- diff check and scope check: PASS, 6 implementation files within lease.

The first focused integration run had one test-only locale ordering assumption;
it was corrected to assert the locale set because Prisma enum order is not a
business ordering contract. Final database run is green. Build-regenerated
`next-env.d.ts` was restored.

## Follow-up

The next backend wave freezes academic-directory contracts. UI is intentionally
not included. VPS/SMTP/restore and institutional PPKS approvals remain later
go-live gates.
