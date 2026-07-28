# M3 Claude governance reconciliation

Date: 2026-07-28

Task: `M3-GPT-CLAUDE-GOVERNANCE-RECONCILIATION`

## Verdict

**PENDING_HUMAN_DECISION**

The two violations are fully identified and assessed below, but they are not historically cured.
A document created after implementation cannot create a lease that did not exist at the time, erase
an out-of-scope edit, or turn either event into compliant work.

The evidence supports retaining both changes with an explicit human-owner governance exception.
That disposition has not yet been recorded. This review therefore must not claim `RECONCILED` or
`APPROVED`.

## Incident 1: localized editor navigation fix had no manifest or active lease

### Git evidence

- Implementation commit:
  `ab6c9cb9b46927c4833e0ba3068c5d9ebed9668b`
  (`fix(admin): navigate to localized post list after editor save`).
- Author and committer:
  `Claude (temp Claude-lane stand-in) <claude-lane-standin@local>`.
- Author and commit time: 2026-07-25 15:00:38 +07:00.
- Changed paths:
  - `src/components/admin/posts/post-editor-form.tsx`
  - `coordination/handoffs/M3-CLAUDE-POST-EDITOR-NAV-FIX-claude.md`
- Integration merge:
  `40095b15c1d3633136812b31b313b022b57dee65`, authored and committed by
  `Claude (temp GPT/Integrator stand-in)`, at 2026-07-25 15:00:58 +07:00.

The product diff is one import replacement:
`useRouter` moved from `next/navigation` to the locale-aware `@/i18n/navigation`.

There is no
`coordination/tasks/M3-CLAUDE-POST-EDITOR-NAV-FIX.md`. A repository search finds the ID only in its
handoff, later review/reconciliation records, and a QA handoff. The existing
`M3-CLAUDE-POST-EDITOR-NAVIGATION` manifest cannot authorize this change: it is a different task,
does not allow `post-editor-form.tsx`, and explicitly treats the editor routes as read-only context.

### Claims and functional evidence

The handoff says an unprefixed `/admin/posts` push failed under `localePrefix: "always"` and records
a real-browser save redirect to `/id/admin/posts`, plus passing lint, typecheck, 669 unit tests, and
build. The later independent review reproduced the consolidated behavior and recorded the Post
editor browser suite at 30/30 and Post list suite at 88/88.

### Scope, contract, and security assessment

- Unauthorized product scope: **yes, procedurally**. The form change had no task lease.
- Product-intent drift: **no evidence**. The behavior restores the already specified localized
  post-save navigation.
- Contract or schema drift: **none**. No API, payload, schema, dependency, root configuration, or
  server authorization code changed.
- Security risk introduced: **no evidence**. The change is client navigation only; all server-side
  session, permission, ownership, and mutation checks remain unchanged.

## Incident 2: cover-picker task edited a unit test outside its lease

### Git evidence

- Implementation commit:
  `0ef71ad499c68e68809dcc3cc7775125d8bf9881`
  (`feat(admin): add cover image picker to the Post editor`).
- Author and committer:
  `Claude (temp Claude-lane stand-in) <claude-lane-standin@local>`.
- Author and commit time: 2026-07-27 10:31:27 +07:00.
- Integration merge:
  `99c259a78e3df8a3b2d360944b5d39a7cdea60c4`, authored and committed by
  `Claude (temp GPT/Integrator stand-in)`, at 2026-07-27 10:31:47 +07:00.
- The commit changed the product, messages, dedicated cover test, and handoff paths authorized by
  `M3-CLAUDE-POST-COVER-PICKER`, plus one unauthorized path:
  `tests/m3/ui/admin-post-editor.test.tsx`.

The unauthorized unit-test diff removes `coverMediaId` from `PostEditorCarriedFields` fixtures,
adds it to the editable draft in the update case, and asserts that the payload and view-to-draft
round trip preserve the selected cover. It does not delete negative cases, relax validation, skip
tests, or weaken expected values.

### Claims and functional evidence

The task and handoff describe the intended refactor: `coverMediaId` becomes editable through the
picker rather than remaining in the untouched carried set. The handoff explicitly discloses the
out-of-lease test edit and reports 699 unit tests, lint, typecheck, build, and real-browser set/clear
database persistence. The independent review records the set/clear browser case as passing.

This reconciliation also ran:

```text
npx vitest run tests/m3/ui/admin-post-editor.test.tsx \
  tests/m3/ui/admin-post-cover-picker.test.tsx
```

Result: 2 files passed, 51 tests passed.

### Scope, contract, and security assessment

- Unauthorized product scope: **no**. The path violation is confined to a unit-test file; the
  product files were allowed by the cover-picker manifest.
- Unauthorized test scope: **yes**. Functional necessity did not grant permission to edit the
  coupled test.
- Product-intent drift: **no evidence**. The changed assertions directly reflect the manifest's
  authorized cover-field ownership refactor.
- Contract or schema drift: **none**. The frozen API shape is preserved, and no server, schema,
  dependency, or root configuration changed.
- Security risk introduced by the violation: **no evidence**. Server-side media
  ownership/existence validation remains authoritative. The unauthorized diff strengthens the
  unit proof of where `coverMediaId` is sourced.

## Disposition recommendation

Retain both merged changes and record a human-approved governance exception that:

1. acknowledges the navigation implementation and merge occurred without a task manifest or
   active path lease;
2. acknowledges the cover-picker commit changed
   `tests/m3/ui/admin-post-editor.test.tsx` outside its declared allowed paths;
3. accepts the changes because the reviewed diffs match intended behavior, introduce no observed
   contract drift or security regression, and have passing functional evidence; and
4. states that the exception is a historical disposition, not a retroactive lease and not a
   precedent for bypassing scope controls.

Reversion is not recommended: it would remove a verified locale-navigation fix and roll back a
correct test adaptation while providing no security benefit. If the human owner rejects retention,
the compliant alternative is to revert each offending commit through a separately leased GPT
integration task, then reimplement the desired behavior through new, correctly leased tasks.

## Preventive controls

1. The merge queue must reject a branch when its task ID has no manifest or is not present as an
   active lease before the implementation commit.
2. Run `check:scope` against the committed candidate—not only the working tree—before review and
   again immediately before merge.
3. The reviewer must compare `git diff --name-only <task-base>...<candidate>` with every
   `allowed_paths` entry and record the output in the handoff.
4. When a coupled test falls outside a lease, the worker must stop and request a scope amendment or
   a new corrective task before editing it. “Required for typecheck” is not an exception.
5. Stand-in/integrator ADRs must state and enforce that temporary role substitution does not waive
   task manifests, leases, independent review, or merge checks.
6. A model acting as temporary integrator must not self-approve its own lane exception; unresolved
   governance deviations go to the human owner.

## Human-owner disposition required

The human owner must add an explicit, durable decision after reviewing this record:

- `RETAIN_WITH_EXCEPTION`, with acknowledgement of both violations and the four terms above; or
- `REVERT_AND_REIMPLEMENT`, with new leased task IDs.

Until then, the durable verdict remains **PENDING_HUMAN_DECISION**.
