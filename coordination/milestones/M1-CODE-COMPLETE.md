# M1 — Code Complete, External Database Gate Pending

- Integration branch: `integration/m0-foundation`
- Verified head: `ebd2a6d`
- Date: 2026-07-13
- Local verdict: **PASS**
- Milestone tag: **not created yet**

## Integrated deliverables

- GPT platform schema, migrations, idempotent seed, database adapter, revision, audit, and outbox primitives.
- Claude design tokens, ID/EN/AR public shell, responsive/RTL behavior, accessibility foundations, and locale homepage shell integration.
- DeepSeek synthetic fixtures, threat matrix, locale/identity tests, and adversarial platform reviews.
- GPT hardening for shared seed/runtime database parsing, IPv6 loopback, database integration-test discovery, boundary tests, and CODEOWNERS.

## Integration evidence

The merged head passed:

- scope coordinator mode;
- ESLint and TypeScript;
- Prisma generate and validate;
- 88 unit tests, with 2 database-only cases excluded from the unit run;
- 2 platform database integration tests;
- Next.js production build for `/id`, `/en`, `/ar`, and all locale study-program routes;
- 90 Playwright tests across desktop and mobile projects, including RTL, keyboard focus, responsive overflow, contrast, FUSPI identity, and homepage landmarks.

The first merged CI attempt encountered only stale generated `.next` route metadata after the homepage file move. Removing the generated cache and rerunning the complete pipeline passed. No source correction was required.

## Open gates and risks

1. Historical database evidence used isolated MySQL 8.0.46. ADR-0003 supersedes that provider; fresh migration, double seed, JSON/ENUM/index behavior, and transaction tests must now pass PostgreSQL before M1 is accepted.
2. VPS SMTP, worker scheduling, persistent public/private storage, and production filesystem behavior remain environment-dependent gates.
3. Provider token/cost telemetry was not available to the integrator. The owner must collect Claude, GPT, and DeepSeek usage from their provider dashboards before the milestone cost report can be finalized.
4. `m1-accepted` must not be created until the PostgreSQL cutover gate passes. M2 may continue only on work that does not rely on unverified provider-specific behavior.

## M2 entry decision

Proceed with Auth/RBAC dependency and contract freeze, security test design, and UX review specification. Do not implement booking concurrency, production storage, PPKS crypto, or release operations until their dedicated contracts and environment gates are ready.
