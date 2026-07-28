# M3 Claude operational-control handoff

- Task: `M3-GPT-CLAUDE-OPERATIONAL-CONTROL`
- Branch: `ai/gpt/m3-claude-operational-control`
- Pre-delegation integration head: `f617de9dd6c2146c932ebde86152b8a8d73dfb5d`
- Delegation payload: `45fd76d449fdd2c066e4f3ff67c9ddd2df38d556`
- Human authorization: temporary operational delegation requested on 2026-07-28
- Durable contract: `coordination/adr/ADR-0004-claude-operational-control-handoff.md`
- Incoming coordinator: Claude Sonnet 5

## Control state

Once this branch is merged into `integration/m3-reference-slice`,
`coordination/ownership.yml` names Claude as the sole operational coordinator. The delegation
continues until an explicit human-owner handback or revocation. Codex recovery alone does not
create a handback.

Claude controls task assignment, leases, the integration merge queue, evidence collection, and
milestone coordination. Product edits still require individual task manifests. `main`, production,
secrets, destructive actions, governance exceptions, institutional security/privacy decisions, and
go-live remain human-only.

## Current M3 state

Completed:

- GPT independent review of the Claude stand-in work;
- Post autosave/manual/publication/delete serialization implementation;
- Media Library keyboard focus-order correction;
- Claude governance reconciliation, with human disposition
  `RECONCILED — RETAIN_WITH_EXCEPTION`; and
- assignment of the three required DeepSeek reviews.

Do not write the M3 exit contract yet. Three independent review gates remain:

| Review | Candidate | Manifest |
| --- | --- | --- |
| Autosave serialization | `f2ad281eb8885fe5df839fc2e16cf079a8a68524` | `M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW` |
| Media focus order | `8b8b35d5ed3206fe01fa2c198376554746044010` | `M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW` |
| Build tracing | `5535c1c44f4b758f27b318b8d501482507bdc06f` | `M3-DEEPSEEK-BUILD-TRACING-REVIEW` |

Review assignment bases:

- autosave and Media:
  `f9acfc16642e523de4bbc81372c2f221b9eba56a`
  (`origin/coordination/m3-deepseek-correction-reviews`);
- build tracing:
  `4db53c431447677a68b20c2925eae43f0555aed5`
  (`origin/coordination/m3-review-corrections`).

The three GPT candidates must not be merged merely because their writer evidence passes. Consume
the exact DeepSeek review verdicts first. If a review returns `CHANGES_REQUESTED`, issue a
writer-owned correction task or send the finding back to the existing writer branch without
editing that branch from Claude's worktree.

## Claude's first actions

1. Fetch all refs and verify `/home/zhev/myproject/fuspi-claude` is clean.
2. Read the durable contract and confirm `coordinator: claude` on the integration head.
3. Close the completed control-handoff task lease/status through a coordination-only commit.
4. Give DeepSeek the already prepared three-review prompt and monitor the three review branches.
5. For each `APPROVED` review, independently verify candidate SHA, changed paths, scope, handoff,
   and mandatory evidence before serial merge.
6. After every merge, push integration, run the proportional post-merge gate, close only the
   corresponding writer/reviewer leases, and record the new integration SHA.
7. When all three corrections are approved and merged, assign a separate M3 independent re-review
   and exit-contract task. Do not open M4 until that task approves the full gate.

## Copy-ready activation prompt for Claude

```text
You are now the sole operational coordinator and integration operator for FUSPI under
coordination/adr/ADR-0004-claude-operational-control-handoff.md.

Work only in /home/zhev/myproject/fuspi-claude and the dedicated integration worktree when operating
the merge queue. Start by fetching origin and confirming the authoritative
origin/integration/m3-reference-slice head, a clean worktree, and
coordination/ownership.yml => coordinator: claude.

Read, in order:
1. AGENTS.md
2. docs/README.md
3. docs/24-implementation-plan-multi-model.md
4. coordination/adr/ADR-0004-claude-operational-control-handoff.md
5. coordination/handoffs/M3-GPT-CLAUDE-OPERATIONAL-CONTROL-gpt.md
6. only the task manifests and contracts needed for the next queued action.

You control task assignment, active leases, task status, the serial integration merge queue,
acceptance evidence, and milestone coordination. Every product edit still requires its own manifest
and non-overlapping path lease. Do not edit another model's branch.

You are not authorized to merge to main, deploy production, handle production credentials,
perform destructive production/staging operations, accept governance/security exceptions, change
FUSPI identity or v1 scope, or declare go-live without the human owner.

Codex returning does not revoke your coordinator role. Codex may review or advise until the human
owner explicitly writes HAND_BACK_TO_CODEX. If the human owner writes REVOKE_CLAUDE_CONTROL, freeze
all mutations immediately and report the last authoritative state.

Immediate queue:
- DeepSeek autosave review of f2ad281eb8885fe5df839fc2e16cf079a8a68524
- DeepSeek Media focus review of 8b8b35d5ed3206fe01fa2c198376554746044010
- DeepSeek build-tracing review of 5535c1c44f4b758f27b318b8d501482507bdc06f

Do not merge any candidate without its required APPROVED verdict and all mandatory evidence.
Process one candidate at a time. After each merge, push integration, rerun the proportional gate,
close its leases through a coordination commit, and record the new integration SHA.

The M3 exit contract and M4 entry remain blocked until all three reviews, serial merges, and a
separate full M3 re-review pass.

Begin by reporting:
- authoritative integration SHA;
- clean/dirty state of Claude and integration worktrees;
- current active leases;
- remote existence and exact head of all three candidates and their review branches;
- the single next safe action.

Then continue autonomously within the contract. Stop only at a mandatory human-only boundary,
unknown dirty state, lease conflict, failed mandatory gate, or unresolved High/Critical finding.
```

## Verification

- `git diff --check` — PASS before handoff commit; rerun after commit.
- Scope check against `origin/coordination/m3-claude-control-assignment` — PASS, 2 committed
  delegation files within lease before this handoff was committed.
- No product source, test, schema, dependency, root configuration, secret, or environment file is
  changed by this handoff.

## Handback

The exact handback and emergency-revocation procedures are in ADR-0004. A date, usage renewal, or
new chat does not implicitly transfer control.
