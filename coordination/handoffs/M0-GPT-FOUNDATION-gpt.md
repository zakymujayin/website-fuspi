# HANDOFF — M0-GPT-FOUNDATION

- Branch: `integration/m0-foundation`
- Base: repository root
- Head: `planning-baseline-v1`
- Status: passed

## Delivered

Next.js/TypeScript scaffold, ID/EN/AR routing and Arabic RTL, Tailwind/shadcn foundation, canonical Prisma 7/MariaDB schema, idempotent seed design, test harness, CI/governance, task scope enforcement, and Hostinger capability record.

Identity is locked to FUSPI. The five programs are IAT, IH, AFI, SAA, and TASPI. FUDA remains only an explicitly labelled external reference.

## Verification

- `npm run ci:merge` — passed
- `npm run test:e2e` — 6 passed (desktop/mobile × ID/EN/AR)
- `npm ci --dry-run` — passed
- Prisma format/validate/generate — passed
- Sharp native transform — passed
- Dependency audit — no high/critical; five moderate advisories recorded in docs 25

## Pending external evidence

No remote GitHub URL, GitHub owner handle, Hostinger access, or MariaDB staging credentials were supplied. Branch protection, real CODEOWNER handle, push/PR, migration+seed against a live database, and Hostinger capability probes remain operator-blocked.
