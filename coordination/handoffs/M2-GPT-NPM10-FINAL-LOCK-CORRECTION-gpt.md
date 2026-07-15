# Handoff — M2-GPT-NPM10-FINAL-LOCK-CORRECTION

- Task: `M2-GPT-NPM10-FINAL-LOCK-CORRECTION`
- Branch: `ai/gpt/m2-npm10-final-lock-correction`
- Base SHA: `663049c`
- Head SHA: recorded by the following commit

## Summary

Regenerated `package-lock.json` with npm 10.9.4 after merged-head CI rejected the npm 11 lockfile
as incomplete. The corrected lock includes optional `next-intl` peer dependency
`@swc/helpers@0.5.23` and normalizes npm 10 optional-package metadata. `package.json` and every
resolved dependency version remain unchanged.

## Files changed

- `package-lock.json`
- `coordination/handoffs/M2-GPT-NPM10-FINAL-LOCK-CORRECTION-gpt.md`

## API, schema, migration, and dependency impact

No API, schema, migration, runtime, or dependency-version change. This is lockfile metadata
compatibility for the repository's CI npm major.

## Verification

| Command | Result |
| --- | --- |
| npm 10.9.4 `npm ci --dry-run` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 380 passed, 54 database-gated skipped |
| `git diff --check` | PASS |
| task scope check | Run after commit |

## Risks and follow-ups

- GitHub Actions must rerun at the merged correction head before M3 opens.
- No M3 code or manifest was created in this task.
