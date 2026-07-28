# M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION handoff

- Task: `M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION`
- Branch: `ai/gpt/m3-claude-governance-reconciliation`
- Manifest base SHA: `f8a40ebe5b0279d08f45864863f2642f56dedeae`
- Scope base: `origin/coordination/m3-review-corrections` at `4db53c4`
- Review head: `7e2affef1566bec83d1ceb14a6e5b0a72ee05518`

## Summary

- Recorded exact implementation and merge SHAs, identities, paths, claims, and evidence for the
  unleased Post editor navigation fix and the out-of-lease cover-picker unit-test edit.
- Assessed unauthorized scope, contract drift, and security impact.
- Recommended retaining both with a human-approved historical exception.
- Kept the verdict `PENDING_HUMAN_DECISION`; this task does not fabricate a retroactive lease.
- Added concrete merge-queue and scope-check preventive controls.

## Files changed

- `coordination/reviews/M3-CLAUDE-GOVERNANCE-RECONCILIATION-gpt.md`
- `coordination/handoffs/M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION-gpt.md`

## API, schema, and migration impact

- None. Documentation and governance evidence only.

## Verification

- `npx vitest run tests/m3/ui/admin-post-editor.test.tsx tests/m3/ui/admin-post-cover-picker.test.tsx`
  — PASS, 2 files and 51 tests.
- `git diff --check` — PASS before handoff creation; rerun after commit.
- `TASK_MANIFEST=coordination/tasks/M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION.md TASK_BASE=origin/coordination/m3-review-corrections npm run check:scope`
  — PASS, 1 committed review file within lease before this handoff was committed.

## Untested areas, risks, and follow-ups

- No product code was changed by this reconciliation.
- The governance issue cannot be closed until the human owner records either
  `RETAIN_WITH_EXCEPTION` or `REVERT_AND_REIMPLEMENT`.
- The recommended exception does not erase either historical violation.

## Contract or dependency requests

- None.
