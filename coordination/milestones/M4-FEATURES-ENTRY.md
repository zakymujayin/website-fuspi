# M4 feature lanes entry

Status: **OPEN**

- Opened: 2026-07-29
- Accepted predecessor: `m3-accepted`
- Frozen source base: `a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0`
- Milestone branch: `integration/m4-features`
- Coordinator: GPT
- Source of truth: `docs/24-implementation-plan-multi-model.md`, M4

M4 is open for bounded task branches. This entry does not merge M3 or M4 to
`main`, deploy an environment, or accept any M4 feature.

## Entry proof

M3 is accepted at the frozen base above. Its gate includes a clean migration and
idempotent seed, 738 unit tests, 83 PostgreSQL integration tests, a zero-warning
production build, 262/262 M3 Playwright cases, and authenticated standalone
Media smoke evidence. The durable verdict is
`coordination/reviews/M3-FINAL-ACCEPTANCE-gpt.md`.

The local branch `coordination/m4-entry` is historical preparation only. It was
based on pre-acceptance commit `9f1e02d`, stated that M4 remained closed, and
named a superseded coordinator. It is not an ancestor or authority for this
entry, is not merged, and is preserved unchanged for audit.

## Frozen milestone boundary

### GPT — sensitive operations and shared contracts

- contact and survey primitives;
- general tickets and PPKS isolation, audit, tracking, reply, private
  attachment, SLA, and outbox email;
- room booking Serializable overlap protection, tracking/cancel, calendar API,
  and Event publication;
- alert/status, privacy request/retention/export, and accessibility request;
- SILA v1 is a configured deep link only. Never guess its public URL.

### Claude — public experience

- public shell, header/footer/menu presentation, editable-home presentation,
  archive/detail routes, directories, prospective-student hub, search UI,
  consent/feedback, and structured data;
- ID/EN/AR, Arabic RTL, WCAG, reduced motion, responsive behavior, and frontend
  performance;
- no schema, action, security, dependency, shared configuration, or navigation
  registry changes without a prior GPT contract task.

### DeepSeek — non-sensitive CMS and QA

- non-sensitive CMS domain logic and admin CRUD following the accepted M3
  reference slice;
- menu/HomeSection/SiteSetting/governance/translation/import work only after
  the required shared contracts are frozen;
- fixtures, unit/integration/E2E, CSV safety, negative cases, and content
  readiness;
- no schema, migration, dependency, auth, proxy, or shared-contract changes.

## First active wave

| Lane | Task | State | Lease boundary |
| --- | --- | --- | --- |
| GPT | `M4-GPT-PPKS-QUERY-ISOLATION` | merged | ticket contract/domain/tests only |
| Claude | `M4-CLAUDE-PUBLIC-SHELL-HARDENING` | merged | accepted public shell integrated with full post-merge evidence |
| DeepSeek | `M4-DEEPSEEK-PAGE-DOMAIN-CRUD` | merged | Page domain implementation/tests accepted on M4 integration |

These leases do not overlap. Claude may read but not change the frozen
component-local navigation data. DeepSeek may read but not change schema,
shared contracts, auth, audit, security, or database primitives. GPT does not
hold any public-shell or Page-domain path.

## Integrated wave evidence

### M4-GPT-PPKS-QUERY-ISOLATION

- Accepted feature head: `e285a2e09d5b709d8028c68e7582b3dfc012b6ee`.
- Integration merge: `4877d60` (`Merge M4 GPT PPKS query isolation`).
- Independent verdicts on source-equivalent head `2db6d67`: Claude
  **APPROVED** and DeepSeek **PASS**; the prior false per-case aggregate
  `VIEW allowed=true` defect is resolved.
- Coordinator post-merge evidence: lint, typecheck, and Prisma validation
  passed; 51 files / 742 tests passed; 21 files / 89 PostgreSQL integration
  tests passed; production build generated 34/34 pages; diff check passed.
- The GPT lease is released. The integration candidate remains isolated from
  `main`; the human owner retains the M4-to-main decision.

### M4-CLAUDE-PUBLIC-SHELL-HARDENING

- Accepted feature head: `6944dee5a3d7944481bb6895b89612c90a4e08c3`.
- Integration merge: `c8c1fa6` (`Merge M4 Claude public shell hardening`).
- GPT first review requested reduced-motion backdrop coverage, locale-safe GKM
  routing, and utility-link drawer closure; all three were corrected and
  independently re-reviewed **ACCEPTED**.
- Coordinator post-merge evidence: lint, typecheck, Prisma validation, 52 files
  / 789 unit tests, 21 files / 89 PostgreSQL integration tests, a 34/34-page
  production build, and 104/104 focused Playwright cases passed.
- The public-shell lease is released. The integration candidate remains
  isolated from `main`; the human owner retains the M4-to-main decision.

### M4-DEEPSEEK-PAGE-DOMAIN-CRUD

- Accepted implementation head: `e09cf6eef84fbb4b5ce8020eedc1c4cb669b09a0`;
  accepted handoff tip: `2b320598188effe4cc89be1872418d24bbb8b946`.
- Claude independently reviewed the final correction delta **APPROVE** with no
  Critical, High, or Medium finding. GPT independently repeated the focused,
  full-unit, full-integration, build, scope, and cleanup evidence.
- Integration merge: `49f8cf0cc164e0a2940c25bbd3deb28cce8900fe`.
- Post-merge evidence on a fresh `fuspi_dev_m4_integration` PostgreSQL database:
  two migrations applied cleanly; 25/25 focused unit, 18/18 focused integration,
  814/814 full unit, 107/107 full integration, lint, typecheck, Prisma validation,
  and a 34/34-page production build passed.
- The Page-domain lease is released. Page admin transport/UI and public Page
  rendering remain later bounded tasks; `main` remains unchanged.

### M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT

- Accepted implementation head: `35595759ca8738b174ec4f6c6c003c7ba2f4b2ff`;
  handoff tip: `5396c762fa73b49c07d69606dc6f1fb8200846a4`.
- DeepSeek independently reviewed the contract and returned **APPROVE** with no
  Critical, High, or Medium finding. Review branch tip:
  `ff0b7a5f9719264262226d8135ff6091a3690649`.
- DeepSeek's synchronized worktree still reported global generated-client
  failures outside the candidate diff. The coordinator adjudicated those as
  environment-only because a fresh run on the exact candidate passed focused
  10/10, full unit 824/824, lint, typecheck, Prisma validation, and production
  build 34/34. No further review cycle is required for this candidate.
- Integration merge: `7d839dc` (`Merge M4 GPT Page admin transport contract`).
- The contract and review leases are released. Page runtime/API may now depend
  on this boundary; `main` remains unchanged.

## Delivery-mode amendment — 2026-08-04

At the human owner's direction, M4 now uses two primary delivery lanes to
prioritize a demonstrable product over per-microtask review overhead:

- GPT owns backend contracts, domain/runtime integration, APIs, security,
  database work, CI, and deployment preparation.
- Claude owns admin/public UI, responsive behavior, ID/EN/AR and RTL,
  accessibility, and visual delivery against frozen backend boundaries.
- DeepSeek is no longer on the critical delivery path and is used only for
  optional regression or milestone review.
- Cross-model review is batched at a feature-wave or milestone boundary rather
  than required for every small commit. Automated lint, typecheck, unit,
  integration, build, scope, and relevant security tests remain continuous.
- Auth, PPKS/privacy, private storage, and booking concurrency retain immediate
  adversarial verification and cannot defer their safety evidence to the final
  review.

Task manifests, non-overlapping leases, model-specific worktrees, the serial
integration branch, and human-only authorization for merging M4 to `main`
remain mandatory.

## Merge and dependency policy

1. Every writer starts from `origin/integration/m4-features`, verifies the
   committed manifest and active lease, and works only in its model worktree on
   its task branch.
2. Every task is a small commit series following the M3 reference slice. A
   writer commits its own handoff and stops; it never changes manifest status,
   leases, integration refs, or `main`.
3. Schema, dependency, root config, auth, proxy, environment, navigation
   registry, and shared-contract changes require a separate GPT task first.
4. After a shared contract lands, every dependent branch rebases before
   continuing. No model silently invents or forks a contract.
5. The coordinator reviews branch ancestry, scope, handoff, commands, and
   independent review before serial integration.

## M4 gate

M4 can be accepted only when:

- each lane suite is green with exact durable evidence;
- no Critical/High defect remains;
- PPKS query isolation passes adversarial cross-role, cross-record, IDOR,
  aggregate/search/export/log/RSC/error-surface tests;
- booking concurrency passes real PostgreSQL parallel-commit tests at
  Serializable isolation;
- ID/EN/AR, Arabic RTL, keyboard, axe, responsive, and frontend performance
  evidence covers affected public/admin UI;
- no PII, secret, tracking token, private storage key, PPKS content/ciphertext,
  or technical error leaks;
- Course/Curriculum, SILA API, and SILA SSO remain outside v1;
- the human owner, not an agent, decides any merge to `main`.

PPKS isolation and booking concurrency are absolute blockers and cannot be
waived, quarantined, or replaced by mocked evidence.
