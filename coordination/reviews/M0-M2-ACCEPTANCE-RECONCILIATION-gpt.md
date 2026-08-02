# M0–M2 acceptance reconciliation

- Date: 2026-08-03
- Task: `M4-GPT-M0-M2-ACCEPTANCE-RECONCILIATION`
- Owner: GPT integrator
- Human authorization: the project owner explicitly requested that M0–M2 be
  reconciled while the DeepSeek M4 task continues.
- Verdict: **ACCEPTED AS DEVELOPMENT MILESTONES**

## Tag map

| Milestone | Accepted commit | Tag | Basis |
| --- | --- | --- | --- |
| M0 | `77f2901454be2699144241accee3e9a3805f2b02` | `m0-accepted` | Original merged task, accepted ADR, passed M0 handoff and foundation gate |
| M1 | `f83a00e6816a91f72b9ade654b012be8a1a0b2d0` | `m1-accepted` | M1 code plus the later PostgreSQL correction and final cumulative M2 evidence |
| M2 | `f83a00e6816a91f72b9ade654b012be8a1a0b2d0` | `m2-accepted` | Existing M2 exit verdict and final milestone commit |
| M3 | `a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0` | `m3-accepted` | Existing independent final acceptance; unchanged by this task |

M1 and M2 deliberately share a commit. The historical M1 head was code-complete
but explicitly not acceptable until the provider gate passed. `f83a00e` is the
first durable cumulative boundary that both contains M1 and records the later
PostgreSQL/CI closure. Tagging the old MySQL-based M1 head would contradict the
historical record.

## Evidence audit

- All four accepted commits are ancestors of the current M4 integration head.
- `planning-baseline-v1` resolves to the recorded M0 source head.
- Both remote M0/M1 integration refs resolve to the recorded M1 code-complete
  head; no hidden divergent M1 candidate exists.
- `origin/integration/m2-security` resolves to the existing final M2 milestone
  commit, and is an ancestor of the M3 accepted head.
- M2 has a durable acceptance decision, complete security evidence audit, and a
  green GitHub pipeline covering clean install, fresh migration, double seed,
  lint, typecheck, Prisma validation, unit, PostgreSQL integration, and build.
- M3 already has a valid annotated acceptance tag and is not retagged.

## Scope and non-precedent statement

This is a labels-and-records reconciliation. It changes no product code,
dependency, schema, migration, configuration, test, feature branch, or `main`.
It does not create a retroactive path lease, validate an unreviewed patch, or
establish a scope-bypass precedent. Historical documents retain their original
claims; the new exit records explain which later evidence closed each gate.

Acceptance here means development milestone acceptance. It does not claim VPS
staging, production TLS/permissions, SMTP delivery/scheduling, persistent
storage, backup/restore, monitoring, or human NVDA/VoiceOver evidence. Those
remain mandatory M6 staging/go-live gates.
