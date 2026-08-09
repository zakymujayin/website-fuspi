# M1 platform exit

Status: **DEVELOPMENT ACCEPTED CUMULATIVELY AT M2 EXIT**

- M1 code-complete head: `ebd2a6d16689f1520fea073d1db631d5868e9500`
- Cumulative acceptance head: `f83a00e6816a91f72b9ade654b012be8a1a0b2d0`
- Acceptance tag: `m1-accepted`
- Reconciled: 2026-08-03

## Decision

The M1 feature work was code-complete and locally green at `ebd2a6d`: schema,
migration/seed primitives, revision/audit/outbox foundations, public shell and
design tokens, ID/EN/AR and RTL behavior, fixtures, threat matrix, and foundation
tests were integrated. The historical `M1-CODE-COMPLETE.md` correctly withheld
acceptance because its database evidence used the superseded provider.

That missing acceptance condition was later satisfied—not backdated—by the
M2 PostgreSQL platform migration and final M2 gate:

- ADR-0003 made PostgreSQL the sole current provider.
- The active PostgreSQL migration was deployed on a fresh database.
- Seed ran twice without duplication.
- PostgreSQL integration, lint, typecheck, Prisma validation, production build,
  browser tests, clean npm 10 installation, and dependency audit passed.
- GitHub Actions run `29435220778` passed on the final merged source head
  `2ea2f3098a63e829b146fd8e450f18b3855f47bb`.
- Milestone commit `f83a00e` durably recorded M2 development acceptance.

Therefore `m1-accepted` points to `f83a00e`, the first cumulative milestone head
that contains the M1 deliverables and the evidence-backed PostgreSQL correction.
It intentionally does not point to `ebd2a6d` and does not claim that the old
head ran PostgreSQL.

The original M1 code-complete record remains unchanged for audit. VPS and human
device evidence remain M6 deployment/go-live gates and are not waived.
