# ADR-0004: Temporary Claude operational control

- Status: superseded by the human-owner handback recorded below
- Date: 2026-07-28
- Authorizing principal: human owner
- Delegated controller: Claude Sonnet 5
- Baseline before delegation: `f617de9dd6c2146c932ebde86152b8a8d73dfb5d`
- Delegation payload: `45fd76d449fdd2c066e4f3ff67c9ddd2df38d556`

## Decision

Claude becomes the sole operational coordinator and integration operator for FUSPI while Codex is
unavailable. This delegation supersedes the time window and limited operational authority in
`ADR-0002-temporary-gpt-integrator-standin.md`; ADR-0002 remains an immutable historical record.

The delegation has no automatic expiry. Codex becoming available again does not itself transfer
control back. Control changes only through the explicit handback procedure below, initiated by the
human owner.

This is broad operational authority, not unrestricted authority over institutional decisions,
credentials, production, or destructive actions.

## Authority delegated to Claude

Claude may:

1. act as the single coordinator for `coordination/ownership.yml`, task manifests, task status,
   active leases, lane assignments, review assignments, and milestone sequencing;
2. operate the serial merge queue for `integration/*`, including fetching, reviewing evidence,
   merging approved task branches one at a time, pushing integration, and closing completed leases;
3. create task-specific contracts and leases for GPT, Claude, or DeepSeek work;
4. implement work in any lane only after creating a task manifest that explicitly grants the exact
   paths; this delegation is not a permanent blanket lease over product files;
5. run static, unit, integration, browser, build, migration-validation, and standalone smoke
   evidence using Claude-owned isolated databases, ports, and temporary storage;
6. request and consume independent DeepSeek reviews, and request Codex review if Codex becomes
   available;
7. write M3 closure or M4 entry documents only after their required evidence and review gates pass;
8. stop, revert an unmerged candidate, or issue a corrective task when a gate fails; and
9. update durable handoffs, reviews, ADRs, and milestone records within a valid task lease.

## Controls that remain mandatory

The delegation does not waive:

- the FUSPI identity contract or the five v1 programs IAT, IH, AFI, SAA, and TASPI;
- `AGENTS.md`, source-of-truth precedence, Next.js 16 documentation requirements, or frozen
  security/privacy contracts;
- model-specific worktrees and task branches;
- a manifest and active non-overlapping path lease before every change;
- allowed, read-only, and forbidden path boundaries;
- validation at trust boundaries and server-side session, permission, ownership, and record-scope
  checks;
- independent review for high-risk changes;
- exact acceptance commands, committed handoffs, and merge-queue serialization;
- the prohibition on direct merge or push to `main`; or
- the prohibition on copying secrets, PII, production data, or credentials into prompts, logs,
  fixtures, commits, or handoffs.

Claude must not treat operational urgency, typecheck coupling, a failing test, or this delegation as
permission to edit outside a lease. A required extra path gets a scope amendment or a new task
before it is changed.

## Human-owner-only actions

The following remain reserved to the human owner and are not delegated:

1. merge `integration/*` into `main` or change branch-protection policy;
2. production or public deployment, DNS changes, go-live, rollback of production, or access-control
   changes to live services;
3. creation, rotation, disclosure, or revocation of production credentials, encryption keys,
   OAuth grants, billing, or provider administrator access;
4. destructive production/staging database or storage operations;
5. acceptance of governance exceptions, privacy/retention policy, PPKS institutional policy, or
   residual Critical/High security risk;
6. changing the FUSPI identity, v1 program list, public SILA authorization/domain decision, or v1
   scope; and
7. revoking this delegation or handing control to another coordinator.

When one of these is required, Claude must stop at the safe boundary and request a human decision.

## Independence and risk policy

- Claude may not be the only author, reviewer, and tester of its own high-risk or critical change.
- DeepSeek is the default independent reviewer/tester while Codex is unavailable.
- If independent review is unavailable, low/medium-risk work may be prepared but not merged when
  its manifest requires that review.
- High/critical contract, schema, auth, proxy, security, privacy, PPKS, concurrency, dependency, CI,
  or release changes require a separately leased contract task and an independent reviewer.
- Claude may merge a branch only at its handed-off candidate SHA and only after all mandatory
  commands and required verdicts pass.
- `CHANGES_REQUESTED`, a missing command, an untested mandatory smoke, unknown dirty files, or an
  unresolved lease overlap blocks the queue.

## Single-controller and split-brain rule

While `coordinator: claude` is active:

- only Claude mutates task assignments, statuses, active leases, or `integration/*`;
- Codex and DeepSeek may inspect, review, test, or implement assigned tasks, but may not independently
  operate the merge queue;
- a returning Codex acts as reviewer/advisor until the human owner explicitly orders handback; and
- Claude must never edit another model's task branch. Findings go back to the writer or into a new
  correctly owned correction task.

If two agents appear to be operating the queue, Claude freezes merges, records both observed heads,
and asks the human owner to select the authoritative controller.

## Required operating sequence

For every candidate, Claude:

1. fetches remote refs and verifies its worktree is clean;
2. reads `AGENTS.md`, `docs/README.md`, `docs/24-implementation-plan-multi-model.md`, the task
   manifest, only the listed contracts, and the handoff;
3. validates the candidate SHA, author, changed paths, lease, and dependency heads;
4. runs `git diff --check`, scope verification, and every acceptance command;
5. consumes the required independent review verdict;
6. merges exactly one approved branch into the active integration branch;
7. pushes integration and reruns the proportional post-merge gate;
8. updates the task status and removes only the completed lease through a coordination commit; and
9. records the new integration SHA before taking the next queued branch.

No batch merge and no “approve now, test later” flow is authorized.

## Runtime isolation

Claude uses:

- worktree `/home/zhev/myproject/fuspi-claude`;
- port `3004`;
- Claude-owned local development/test PostgreSQL databases whose names visibly contain
  `test`, `qa`, `e2e`, or `audit`;
- temporary storage below `/tmp/fuspi-claude/`; and
- credentials only from the Claude worktree's authorized environment.

Claude does not borrow another model's database, upload directory, uncommitted files, or secrets.

## Handback procedure

Control returns only after the human owner explicitly writes `HAND_BACK_TO_CODEX` or names another
controller. Claude then:

1. freezes the merge queue;
2. records integration head, open tasks, active leases, candidate/review SHAs, test state, dirty
   worktrees, unresolved findings, and reserved human decisions in a dedicated handback;
3. creates a docs-only coordination task that changes the coordinator field and closes this
   delegation;
4. merges that coordination change into integration;
5. confirms the new authoritative integration SHA; and
6. stops operating the queue.

No implied handback occurs because a model becomes available, a date passes, or a chat session ends.

## Revocation and emergency stop

The human owner may write `REVOKE_CLAUDE_CONTROL` at any time. Claude then performs no further merge
or mutation, reports the last known integration head and active operation, and waits. It may finish
only a read-only diagnostic already in progress.

Unknown dirty files, conflicting leases, suspected secret exposure, destructive ambiguity, a
security regression, or repository state inconsistent with this contract also triggers a merge
freeze and evidence report.

## Auditability

Claude uses distinct commit identities for coordinator/integrator work and implementation work.
Every control action must be reconstructible from a manifest, lease, branch, commit, review,
acceptance evidence, merge commit, and handoff. Chat is never the only durable state.

## Handback record — 2026-07-29

The human owner explicitly directed the returning Codex/GPT controller to repair M3 autonomously
and obtain a process-correct acceptance. This names GPT as the replacement controller under the
handback rule above.

The queue was frozen for read-only reconciliation before this record was written. At that point:

- authoritative remote integration head:
  `9f1e02dfc51feb8d98e57b8ee1a94533a8ff9e1f`;
- `origin/main` remained at `df7fbfc460866ffb0a20dc6c81f00318fb096af9` and contained no M3
  candidate or integration commit;
- the local integration worktree was clean but had unpushed head
  `01e0ee4a1125be8462a119fac6b2a490ed8a9af5`; it is retained as audit evidence and is not
  authoritative;
- candidate heads were Media focus `8b8b35d5ed3206fe01fa2c198376554746044010`,
  autosave serialization `f2ad281eb8885fe5df839fc2e16cf079a8a68524`, and build tracing
  `5535c1c44f4b758f27b318b8d501482507bdc06f`;
- remote R2 review heads were `bf0275527e36a1032f6a96a62ade7c47f5aa0ed2`,
  `7853ba2d00d2a06d7c3932527d837bac340fe44e`, and
  `eada22e75138184ef6cae5d3c173a13b41989c9b`; and
- M3 had not been accepted, tagged, or merged to `main`.

Control returns to GPT when this record and `coordinator: gpt` become part of the authoritative
integration branch. Claude must no longer mutate the queue after that head. Existing implementation
and review history remains immutable; GPT must reconcile it through new, prospectively leased
tasks and fresh final evidence rather than retroactively treating missing leases as valid.
