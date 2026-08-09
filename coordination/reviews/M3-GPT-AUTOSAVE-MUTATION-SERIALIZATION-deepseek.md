# Independent Review — M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION — DeepSeek (R2)

- Review branch: `ai/deepseek/m3-autosave-serialization-review-r2`
- Coordination base: `f9acfc16642e523de4bbc81372c2f221b9eba56a`
- Candidate: `f2ad281eb8885fe5df839fc2e16cf079a8a68524`
- Verdict: **APPROVED**

## Findings by severity

### None (High/Critical)
No High or Critical findings.

### Medium

1. **`beginMutation` token increment is not render-phase atomic** (`src/components/admin/posts/post-editor-shell.tsx:63-65`)
   - `nextMutationTokenRef.current = token` is a ref assignment. In React 18+ concurrent mode a scheduled render could read stale state, but `beginMutation` is called from event handlers and interval callbacks (not render). Acceptable for client-side serialization in single-threaded JS.

2. **`latest.current` reads `submitting` one render behind** (`src/components/admin/posts/post-editor-form.tsx:93-95`)
   - `useEffect(() => { latest.current = { draft, submitting }; })` (no deps) updates after each render. `submitting` can lag one frame. Mitigated by `beginMutation()`'s `activeMutationRef.current` gate providing a second authoritative busy check.

### Low

3. **`released` boolean pattern relies on correct placement before `finally`** (`post-editor-form.tsx:132,153`, `post-publication-actions.tsx:52,76`, `post-delete-action.tsx:56,79`)
   - `released = true` must be set immediately after `finishMutation(lease.token, nextVersion)`. Pattern is consistent across all three mutation components. No observed double-release in adversarial testing.

4. **Autosave captures `carried` in useCallback closure** (`post-editor-form.tsx:171`)
   - The `carried` dependency in `runAutosave`'s `useCallback` means a stale `carried` reference persists until the next dependency change. Mitigated because `carried` is stable across the edit session (derived from server props).

## Adversarial review results

### 1. Mutation lease acquire/release
- **Correct.** `beginMutation()` atomically checks `activeMutationRef.current !== null`. Single-threaded JS guarantees no concurrent acquires.
- `finishMutation(token, nextVersion)` uses a stale-token guard: `activeMutationRef.current !== token` → early return. A delayed autosave response cannot release a newer mutation's lock.
- Version is advanced (`versionRef.current = nextVersion`) BEFORE `activeMutationRef.current = null` is set. The next `beginMutation()` reads the updated version.

### 2. Success, failure, exception, stale token paths
- **Correct.** All four surfaces (autosave, manual save, publication, delete) follow the same pattern: acquire → try → success: finishMutation with nextVersion + released=true → catch: error display → finally: finishMutation without version if not released.
- VERSION_CONFLICT stops autosave (`stoppedRef.current = true`).
- Validation failures release the lease without advancing version (correct — no save occurred).

### 3. Mutual exclusion (autosave/manual save/publication/delete)
- **Verified.** `disabled={submitting || mutationBusy}` on manual save. `disabled={pending !== null || mutationBusy}` on publication. `disabled={mutationBusy}` / `disabled={deleting || mutationBusy}` on delete.
- Autosave skips when `busy` (submitting) via `latest.current.submitting`, and when `beginMutation()` returns null.

### 4. No stale request can release another's lease
- **Confirmed.** `finishMutation` line 72: `if (activeMutationRef.current !== token) return;`. Any late response that arrives after a newer mutation acquired the lock is a no-op.

### 5. Version installed before mutation control reopens
- **Confirmed.** `finishMutation` line 74: `versionRef.current = nextVersion` precedes line 77: `activeMutationRef.current = null`.

### 6. Accessible disabling
- **Confirmed.** All buttons use native `disabled` HTML attribute, natively accessible.

### 7. Non-mutating navigation not treated as write
- **Confirmed.** Cancel button uses `router.push(listHref)` directly. No mutation lease acquired.

### 8. Held-response E2E (Test 15)
- **Verified.** The test:
  - Intercepts autosave responses, holds while server commits version 2.
  - Confirms `[data-autosave-status="saving"]` during the hold.
  - Confirms all competing buttons are disabled.
  - Confirms only one `AUTOSAVE` request was sent.
  - Releases response → `[data-autosave-status="saved"]` appears.
  - Manual save re-enabled, clicks, uses `expectedVersion: 2`, produces version 3.
  - Request sequence: `["AUTOSAVE", "UPDATE"]`.

### 9. Contract/API/schema/dependency preservation
- **Confirmed.** Diff touches only `src/components/admin/posts/` (6 source files) and 2 test files. No contract, Prisma schema, dependency, API route, or middleware change.

## Acceptance command results

| Command | Exit | Detail |
| --- | --- | --- |
| `npm run lint` | 0 | 0 issues |
| `npx tsc --noEmit` | 0 | 0 errors |
| `npm test` (Vitest) | 0 | 49 files, 738 tests |
| `npm run test:integration` | 0 | **20 files, 83 tests all passed** |
| `npm run build` | 0 | compiled (carried Turbopack NFT warning — Review 3 domain) |
| Playwright (chromium + mobile, 1 worker) | 0 | **30/30 passed** |
| `git diff --check` | 0 | clean |

### Integration test environment (the key correction from R1)
- `RUN_PLATFORM_DB_TESTS=true` explicitly exported
- `AUTH_URL=http://localhost:3004` exported
- `AUTH_SECRET`, `TOKEN_HMAC_SECRET`, `IP_HASH_SECRET` exported (from project `.env.local`)
- Database pre-flight: `SELECT count(*) FROM "User" WHERE email LIKE 'm2-route-%@example.test'` returned **0**

### Playwright suite (30 tests)
- Test 1–8: Editor basic flows (create, validation, conflict, slug, round-trip, ownership, RTL, disclosure)
- Test 9–14: Mutation surfaces (publish, schedule, archive→draft, delete+audit, cover, richtext)
- Test 15: Held-response autosave serialization (key adversarial test)

### Environment isolation
- Database: `fuspi_test_r2_autosave_090903` created ~0909, migrated from zero, dropped after evidence
- Upload root: `/tmp/fuspi-r2-autosave/upload`
- `UPLOAD_PUBLIC_URL=/uploads`
- Dev server: `localhost:3004`

## Structural proofs

| Proof | Command | Result |
| --- | --- | --- |
| Single parent | `git log -1 --format=%P HEAD` | `62a8459e` (exactly 1 SHA) |
| Only doc files | `git diff --name-only f9acfc16..HEAD` | 2 authorized documentation files |
| Candidate NOT ancestor | `git merge-base --is-ancestor f2ad2818..HEAD` | Exit 1 (non-zero = PASSING) |

## Untested areas and residual risk
- No WebKit/Safari engine (manifest specifies Chromium + mobile only).
- Token overflow: `nextMutationTokenRef` is mutable integer; practically impossible to overflow in a single session.

## Non-committing merge status
- Candidate merged via `git merge --no-commit --no-ff f2ad281eb8885fe5df839fc2e16cf079a8a68524`.
- `git merge --abort` after evidence collection.
- `git status --porcelain` confirms clean working tree.
- Build artifacts removed with `rm -rf .next`. No `git checkout -- .`, `git reset`, or `git clean -fd` used.

## Confirmation
- Only review and handoff documents committed.
- Review branch has exactly one parent.
- Candidate is not an ancestor of the review branch.
- No merge to `integration/*` or `main`.
