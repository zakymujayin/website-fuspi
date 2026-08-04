# M4-GPT-PUBLIC-CONTENT-SCHEMA-CORRECTION — GPT handoff

- Branch: `ai/gpt/m4-public-content-schema-correction`
- Manifest base: `3adc1f1dd729b7ce7b2da656f27011cb5813f4b7`
- Assignment base: `4c49e331a3d5cf149b3e2cd5817b6326f1a065e6`
- Implementation head: `eb5daf956e1adbab8871367cb189504fd3315f9f`

## Summary

Added the minimum durable B2 fields required before public-content contracts
can be frozen: Service icon; Partnership country/order and optional Document
evidence; Scholarship optional Document; Achievement optional public image;
and Testimonial graduation year plus explicit publication-consent timestamp.

The corrective migration is additive. Existing testimonials without durable
consent evidence are retained but changed to private, new testimonials default
private, and PostgreSQL prevents visible testimonials without consent. Evidence
documents and achievement images use restrictive foreign keys so referenced
public assets cannot be deleted.

Files changed:

- `prisma/schema.prisma`
- `prisma/migrations/20260804194500_public_content_schema_correction/migration.sql`
- `tests/m4/schema/public-content-schema.test.ts`
- `tests/m4/schema/public-content-schema.integration.test.ts`
- this handoff

Generated Prisma output was regenerated successfully but remains repository-
ignored by the established project configuration.

## API, schema, migration, and dependency impact

One new immutable PostgreSQL migration and corresponding Prisma relations and
fields. No API, runtime, dependency, auth, environment, UI, seed, or existing
migration change.

## Verification

- `npm run prisma:validate`: PASS.
- `npm run prisma:generate`: PASS.
- isolated GPT `npx prisma migrate deploy`: PASS, applied the new migration.
- focused structural schema tests: PASS, 3/3.
- focused PostgreSQL schema/constraint tests: PASS, 3/3.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS, 66 files, 929/929.
- `npm run test:integration`: PASS, 35 files, 158/158.
- `npm run build`: PASS, compilation/typecheck and 41/41 static pages.
- `git diff --check`: PASS.
- scope check: PASS, 4 implementation/test files within lease before handoff.
- both previously accepted migration files: byte-unchanged.

## Untested areas, risks, and follow-up

No B2 contract or domain runtime is included here. The next contract task must
require consent for every visible testimonial, validate the new relations as
PUBLIC image/PDF assets, and retain safe support for legacy external evidence
URLs without exposing storage keys. Disabling visibility for unconsented legacy
testimonials is intentional fail-closed behavior and may require an admin to
record fresh consent before publication.
