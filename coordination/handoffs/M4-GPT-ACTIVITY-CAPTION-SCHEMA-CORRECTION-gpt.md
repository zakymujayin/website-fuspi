# M4-GPT-ACTIVITY-CAPTION-SCHEMA-CORRECTION — GPT handoff

- Branch: `ai/gpt/m4-activity-caption-schema-correction`
- Base: `921261a6854922820f1dbe2320523e24516c6438`
- Assignment head: `720601761ec459801ec4eef3ed0710afca5a3543`
- Implementation head: `1d537b1584a2911ee9075e2124cd67331e5e8ae6`

## Summary

Added the missing nullable `ActivityImage.caption` field through one additive
migration. Existing rows remain valid and no accepted migration changed.

Files: Prisma schema, `20260804201000_add_activity_image_caption`, focused unit
and PostgreSQL tests, and this handoff. No contract, runtime, route, dependency,
environment, seed, or UI impact.

## Verification

- Prisma format/validate/generate and isolated migrate deploy: PASS.
- focused unit: PASS 1/1; focused PostgreSQL: PASS 1/1.
- lint/typecheck: PASS.
- full unit: PASS 68 files, 940/940.
- full integration: PASS 36 files, 159/159.
- diff-check/scope-check: PASS; all three accepted migrations unchanged.

## Follow-up

The resumed public-content domain may now persist and return ordered activity
captions without lossy mapping.
