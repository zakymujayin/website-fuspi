# M4-GPT-PUBLIC-CONTENT-CONTRACTS — GPT handoff

- Branch: `ai/gpt/m4-public-content-contracts`
- Base: `e9cc83c2728457b043d0b42bb8c2040fbe945809`
- Assignment head: `1c1295d419bdeecd30e11ac548b5ce22f9bb7d34`
- Implementation head: `a7f771377b1a90a4e97b17651cdb4bba5075cc1a`

## Summary

Frozen strict ADMIN and public contracts for Service, Partnership,
Scholarship, Achievement, StudentActivity, Document, Album, Event, FAQ, and
Testimonial. The catalog covers typed create/update/delete/reorder commands,
ADMIN list/detail projections, public list/detail queries and projections,
ID-first locale resolution, deterministic failures, safe media/PDF/link views,
bounded pagination/filtering, testimonial consent, chronological validation,
ordered media, and formula-safe Partnership export rows.

Arbitrary selectors, unsafe/internal-network external URLs, private storage
metadata, workflow data, PII, and technical errors cannot enter public output
shapes.

Files changed:

- `src/contracts/public-content.ts`
- `tests/m4/contracts/public-content-contracts.test.ts`
- this handoff

## API, schema, migration, and dependency impact

New shared Zod/type contract only. No runtime, HTTP route, Prisma schema,
migration, generated client, dependency, auth, environment, UI, or seed change.

## Verification

- focused contract suite: PASS, 1 file, 9/9.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run test`: PASS, 67 files, 938/938.
- `npm run build`: PASS, compilation/typecheck and 41/41 static pages.
- `git diff --check`: PASS.
- scope check: PASS, 2 implementation/test files within lease before handoff.

## Untested areas, risks, and follow-up

No persistence or transport is implemented here. The domain task must
revalidate after rich-text sanitization, map configured links to the existing
string columns, copy PUBLIC PDF metadata from `publicPdfMediaId` into Document
without exposing a storage key, enforce PUBLIC assets and consent again inside
transactions, and return identical public NOT_FOUND for missing, hidden,
expired, unpublished, untranslated, or unsafe legacy records. Browser
transports must remain separate bounded tasks after the domain is proven.
