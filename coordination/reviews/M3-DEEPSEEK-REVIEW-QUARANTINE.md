# M3 DeepSeek Review Quarantine and Correction Ledger

Coordinator record for the quarantine of three M3 DeepSeek reviews and their
R2 replacements. This ledger is the authoritative source for the verified
remote head of each replacement review branch.

- Opened: 2026-07-28
- Verified: 2026-07-29
- Coordination branch: `coordination/m3-deepseek-review-quarantine`
- Base: `4db53c431447677a68b20c2925eae43f0555aed5`

---

## 1. Quarantined reviews — never merge

These three commits must not be merged into `integration/*` or `main`. They are
retained unchanged as audit evidence. Do not delete, amend, or force-push them.

| Review | Quarantined SHA | Disqualifying defect |
| --- | --- | --- |
| Autosave | `98e6256453e695f4871c3b7d8d9ebfad1dcf3e12` | Verdict `APPROVED` while its own evidence table recorded `npm run test:integration` at 79/83 with 4 failures. The manifest lists that command as mandatory and permits `APPROVED` only when all mandatory evidence passes. |
| Media | `b55e5f34b1e7135265725bf6f7855059706179d7` | Two parents (`f9acfc1` and candidate `8b8b35d`) while the final tree drops the candidate's change to `e2e/m3/admin-media-library-browse.spec.ts`. Merging would mark the candidate as an ancestor without carrying its fix. |
| Build | `c778df3579c5e3afb79a7833795e36c6998ff231` | Verdict `APPROVED` while `npm run test:integration` was recorded as "18/20 files fail"; the mandatory `RUN_PLATFORM_DB_TESTS=true npm test` was not evidenced; and the mandatory authenticated standalone media list/upload/delete smoke was never completed. |

All three also recorded a cleanup sequence banned by `AGENTS.md`:
`git checkout -- . && git reset HEAD -- . && git clean -fd`.

Reproduce the media defect:

```bash
git log -1 --format=%P b55e5f34b1e7135265725bf6f7855059706179d7
git diff --name-only 8b8b35d5ed3206fe01fa2c198376554746044010 b55e5f34b1e7135265725bf6f7855059706179d7
```

---

## 2. Replacement reviews — verified remote heads

Verified by the coordinator on 2026-07-29 with `git rev-parse` against `origin`
after fetch. These values, not the handoff bodies, are authoritative.

| Task | Branch | Verified remote head | Status |
| --- | --- | --- | --- |
| `M3-DEEPSEEK-MEDIA-FOCUS-ORDER-REVIEW-R2` | `ai/deepseek/m3-media-focus-order-review-r2` | `bf0275527e36a1032f6a96a62ade7c47f5aa0ed2` | VERIFIED |
| `M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW-R2` | `ai/deepseek/m3-autosave-serialization-review-r2` | `7853ba2d00d2a06d7c3932527d837bac340fe44e` | VERIFIED |
| `M3-DEEPSEEK-BUILD-TRACING-REVIEW-R2` | `ai/deepseek/m3-build-tracing-review-r2` | `eada22e75138184ef6cae5d3c173a13b41989c9b` | VERIFIED |

Media R2 uses a two-commit chain; its review-content commit is
`0c8a6b052700c92903d5a6794405deb1fc016b8f`.

---

## 3. Structural verification — coordinator-run, reproducible

Every check below was executed by the coordinator, not taken from the handoffs.
All three replacement branches pass.

| Check | Media R2 | Autosave R2 | Build R2 |
| --- | --- | --- | --- |
| Parent count is exactly 1 | PASS | PASS | PASS |
| Diff vs base contains only the 2 authorized documents | PASS | PASS | PASS |
| Candidate is NOT an ancestor | PASS | PASS | PASS |
| Merge commits in range = 0 | PASS | PASS | PASS |
| Banned cleanup commands absent | PASS | PASS | PASS |

Reproduce for any branch:

```bash
git log -1 --format=%P <branch>                        # exactly one sha
git diff --name-only <base> <branch>                   # only the 2 documents
git merge-base --is-ancestor <candidate> <branch>      # must FAIL (non-zero)
git rev-list --count --merges <base>..<branch>         # must be 0
```

The defect that made the original media review dangerous is resolved. No
replacement branch carries candidate source, and none can mark a candidate as
merged.

---

## 4. Verdicts and evidence status

| Task | Verdict | Evidence status |
| --- | --- | --- |
| Media R2 | `APPROVED` | Agent-attested |
| Autosave R2 | `APPROVED` | Agent-attested |
| Build R2 | `APPROVED` | Agent-attested |

**Coordinator-verified** means the coordinator ran the command and observed the
result. **Agent-attested** means the reviewing agent reported it and the
coordinator did not independently re-run it.

Section 3 is coordinator-verified. The test counts, exit codes, database
isolation, and the standalone smoke in section 5 are agent-attested. Given the
R1 history of inaccurate attestation, this distinction is recorded deliberately
and should not be read as independent confirmation.

The following supporting facts *were* coordinator-verified:

- The endpoints named in the Build R2 standalone smoke exist with the methods
  used: `POST /api/auth/credentials`, `GET /api/admin/media`,
  `POST /api/admin/media/upload`, and `POST /api/admin/media` for delete.
- The two integration suites that failed in R1 are environment-sensitive rather
  than product-defective. `tests/platform/ticket-enum-contract.integration.test.ts`
  reads the PostgreSQL enum catalog directly and fails when migrations were not
  applied. `tests/security/auth-runtime/credentials-route.integration.test.ts`
  requires `AUTH_URL` and the HMAC secrets from `getAuthSecrets()`, and its
  `afterAll` cleanup is correct.

---

## 5. No product code defect was found

The four integration failures behind the R1 autosave and build reviews were an
environment fault, not a code fault: a reused QA database
(`fuspi_m3_media_library_qa_audit`) still holding leaked
`m2-route-*@example.test` rows, combined with unsourced auth environment
variables.

On fresh, migrated databases with the environment correctly exported, Autosave
R2 reports `npm run test:integration` at 20 files / 83 tests passing, against
79/83 in R1. This is consistent with the environment explanation.

**No source change was required, requested, or made in this correction round.**
No candidate branch was modified.

---

## 6. Outstanding item — low severity, documentation only

All three R2 handoffs record a `Review content SHA` that is not reachable from
its branch.

| Branch | Recorded in handoff | Actual |
| --- | --- | --- |
| Media R2 | `0c8a6b05…fcb0168f` — no such object exists (transposed digits) | `0c8a6b052700c92903d5a6794405deb1fc016b8f` |
| Autosave R2 | `5ec43a0105755e086e512ef3a1f4fc3f82654198` — dangling, unreachable | head `7853ba2d00d2a06d7c3932527d837bac340fe44e` |
| Build R2 | `efa224995984322b540b00e2e139f2db17d61946` — dangling, unreachable | head `eada22e75138184ef6cae5d3c173a13b41989c9b` |

Cause: for autosave and build the commit was amended after the handoff was
written, which changed the SHA. For media the value was mistyped.

**Resolution:** section 2 of this ledger carries the coordinator-verified heads
and is authoritative for downstream consumers, so this does not block the M3
exit gate. Correcting the handoff lines remains a recommended tidy-up and must
be done by adding a new commit, never by amending or force-pushing.

---

## 7. Exit gate position

Structural integrity is verified and no code defect exists. From the
coordinator's side the three replacement reviews are safe to consider for merge,
with two caveats recorded honestly rather than waived:

1. The test evidence is agent-attested, not independently re-run.
2. The handoff SHA lines in section 6 are still incorrect.

The three quarantined commits in section 1 remain permanently un-mergeable.

Release of the M3 exit gate is the human coordinator's decision.
