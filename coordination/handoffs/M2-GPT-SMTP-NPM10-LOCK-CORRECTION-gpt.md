# Handoff — M2-GPT-SMTP-NPM10-LOCK-CORRECTION — GPT

- Branch: `ai/gpt/m2-smtp-npm10-lock-correction`
- Base SHA: `5fd5b56`
- Implementation head SHA: `fa3cde5`

## Result

Regenerated only `package-lock.json` with npm 10.9.4. The correction adds the missing npm 10
lock metadata, including `@swc/helpers@0.5.23`, without changing any dependency version,
runtime source, test, workflow, schema, environment contract, or `package.json`.

The patched SMTP runtime remains isolated as `fuspi-nodemailer@npm:nodemailer@9.0.3`; no
direct vulnerable Nodemailer 7 runtime was introduced.

## Files changed

- `package-lock.json`
- `coordination/handoffs/M2-GPT-SMTP-NPM10-LOCK-CORRECTION-gpt.md`

## Contract/schema/migration impact

None. This is lockfile metadata compatibility only.

## Verification

| Command | Result |
|---|---|
| `NPM_CONFIG_CACHE=/tmp/fuspi-npm10-cache npx --yes npm@10.9.4 ci --dry-run` | PASS |
| `NPM_CONFIG_CACHE=/tmp/fuspi-npm10-cache npx --yes npm@10.9.4 ci` | PASS — clean install completed |
| `npm ci --dry-run` using npm 11 | PASS |
| `npm audit --audit-level=high` | PASS — 0 High/Critical |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 329 passed, 37 DB-gated skipped |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M2-GPT-SMTP-NPM10-LOCK-CORRECTION.md TASK_BASE=origin/coordination/m2-gpt-smtp-npm10-lock-assignment npm run check:scope` | PASS — 2 changed files within lease |

GitHub Actions run `29406248657` failed at `npm ci` because npm 10 reported
`Missing: @swc/helpers@0.5.23 from lock file`. The same failure was reproduced locally with
npm 10.9.4 before regeneration, and both npm 10 actual clean install and npm 11 dry-run pass
after this correction.

## Untested areas

- No runtime behavior changed; SMTP and database suites were not rerun beyond the unchanged
  unit suite because this task modifies lock metadata only.

## Risks and follow-ups

- Dependency-changing tasks should generate the committed lockfile with npm 10 while CI uses
  Node 22/npm 10, or explicitly test both npm 10 and the developer npm version.
- The final proof is the GitHub Actions rerun/new run for the corrected integration commit.

## Requested shared changes

None.
