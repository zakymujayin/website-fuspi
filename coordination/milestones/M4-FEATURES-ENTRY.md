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
| DeepSeek | `M4-DEEPSEEK-PAGE-DOMAIN-CRUD` | ready | Page domain implementation/tests only |

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
