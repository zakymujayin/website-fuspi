# M0 foundation exit

Status: **DEVELOPMENT ACCEPTED**

- Historical source head: `77f2901454be2699144241accee3e9a3805f2b02`
- Historical name: `planning-baseline-v1`
- Acceptance tag: `m0-accepted`
- Reconciled: 2026-08-03

## Decision

M0 delivered the repository and development foundation required to start the
model lanes: Next.js/TypeScript, locale-prefixed ID/EN/AR routing and Arabic
RTL, Tailwind/shadcn foundations, the initial canonical Prisma model, test and
CI harnesses, governance, scope enforcement, and the FUSPI identity contract
with IAT, IH, AFI, SAA, and TASPI in order.

The original task is `merged`, ADR-0001 is `accepted`, and the M0 handoff is
`passed`. Its recorded checks include `ci:merge`, desktop/mobile locale E2E,
clean dependency resolution, Prisma format/validate/generate, Sharp native
transformation, and the dependency audit applicable at that historical head.

## Superseding platform decisions

This tag identifies the accepted historical M0 development boundary; it is not
the current database or deployment contract. ADR-0003 later replaced the
MariaDB/Hostinger database assumption with PostgreSQL on a VPS. The PostgreSQL
cutover, fresh migration, double seed, and current platform CI were accepted at
the cumulative M2 exit and do not rewrite what ran at M0.

Host provisioning, TLS, SMTP/worker scheduling, persistent storage, backup and
restore, monitoring, and real-device assistive-technology evidence remain M6
staging/go-live gates. They are not relabeled as M0 evidence or waived here.
