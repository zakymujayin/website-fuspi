# GPT review — M4 Claude public shell hardening

- Source task: `M4-CLAUDE-PUBLIC-SHELL-HARDENING`
- Source branch: `ai/claude/m4-public-shell-hardening`
- Source base: `184c64c9ad5eac262de9417edcdc447eab82b824`
- Accepted source head: `6944dee5a3d7944481bb6895b89612c90a4e08c3`
- Implementation head: `a99f256ac34d919e7a9201a72d495f08dc620c5b`
- Integration merge: `c8c1fa683fcee3fae669e62e74702d5d6c8044be`
- Reviewer: GPT
- Verdict: **ACCEPTED**

## Findings disposition

The first review requested three corrections. All are resolved at the accepted
head and covered by deterministic browser tests:

1. `Dialog.Backdrop` and `Dialog.Popup` both declare reduced-motion handling;
   Playwright proves that each animates normally and has a computed transition
   duration below 0.05 seconds when reduced motion is requested.
2. The site-relative GKM utility destination uses the localized navigation
   component. Its exact href is `/id/gkm`, `/en/gkm`, or `/ar/gkm`; the test no
   longer masks a missing prefix with a suffix-only match.
3. Utility links receive the drawer close handler. Browser coverage proves
   closure for both the internal destination and an external new-tab target.

No remaining Critical, High, Medium, or Low review finding was identified in
the leased diff. FUSPI identity, the IAT/IH/AFI/SAA/TASPI order, keyboard focus,
RTL inline-end behavior, 44px drawer targets, landmark uniqueness, safe external
links, responsive containment, axe WCAG A/AA, and the no-guessed-SILA boundary
remain covered.

## Independent pre-merge evidence

Run in the clean Claude worktree at the accepted source head:

| Command | Result |
| --- | --- |
| focused Vitest command | PASS — 2 files, 52/52 |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 52 files, 789/789 |
| `npm run build` | PASS — 34/34 static pages |
| focused Playwright command | PASS — 104/104, chromium and mobile |
| source scope-check | PASS — 17 changed files inside the Claude lease |
| `git diff --check` | PASS |

## Post-merge evidence

Run in `integration/m4-features` after merge `c8c1fa6`:

| Command | Result |
| --- | --- |
| focused Vitest command | PASS — 2 files, 52/52 |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 52 files, 789/789 |
| `npm run test:integration` | PASS — 21 files, 89/89, 0 skipped |
| `npx prisma validate` | PASS |
| `npm run build` | PASS — 34/34 static pages |
| focused Playwright command | PASS — 104/104, chromium and mobile |

The integration database was a dedicated local database named
`fuspi_dev_integration_m4_shell`, initialized with the two committed migrations
and synthetic test-only secrets. No agent, staging, or production database was
used. Initial invocations without an integration `DATABASE_URL`, and once with
a 31-byte synthetic IP-HMAC secret, failed during environment setup. After the
isolated runner was configured to meet the existing 32-byte contract, the exact
suite passed 89/89. These setup attempts did not expose a product defect.

## Scope and impact

- Seventeen source-task paths are inside the transferred lease.
- No dependency, schema, migration, auth, proxy, root config, shared contract,
  navigation data, global CSS, shadcn primitive, backend, or DeepSeek Page-domain
  path changed.
- The source branch and remote branch resolve to the same accepted head.
- `main` was not merged or modified.
