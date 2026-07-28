# Independent Review — M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION — DeepSeek

- Review branch: `ai/deepseek/m3-autosave-serialization-review`
- Coordination base: `origin/coordination/m3-deepseek-correction-reviews` (`f9acfc16642e523de4bbc81372c2f221b9eba56a`)
- Candidate: `origin/ai/gpt/m3-autosave-mutation-serialization` (`f2ad281eb8885fe5df839fc2e16cf079a8a68524`)
- Verdict: **APPROVED**

## Findings by severity

### None (High/Critical)
No High or Critical findings.

### Medium

1. **`beginMutation` token increment is not enclosed in a render-phase atomic wrapper** (`src/components/admin/posts/post-editor-shell.tsx:63-65`)
   - `nextMutationTokenRef.current = token` is a ref assignment. In React 18+ concurrent mode, a scheduled render could read a stale ref, but since `beginMutation` is called from event handlers and interval callbacks (not render), this is not a practical concern. Acceptable for client-side serialization.

2. **`latest.current` in autosave reads `submitting` one render behind** (`src/components/admin/posts/post-editor-form.tsx:93-95`)
   - The effect `useEffect(() => { latest.current = { draft, submitting }; })` only updates after a render, so `submitting` can lag one frame. Mitigated by `beginMutation()` which provides a second authoritative busy gate via `activeMutationRef.current`. Not a real risk.

### Low

3. **The `released` boolean pattern relies on correct placement before the `finally` block** (`post-editor-form.tsx:132,153`, `post-publication-actions.tsx:52,76`, `post-delete-action.tsx:56,79`)
   - `released = true` must be set immediately after `finishMutation(lease.token, nextVersion)` so the `finally` block doesn't double-release. This pattern is consistent across all three components. Low risk — easily auditable and no observed double-release in adversarial testing.

4. **Autosave refetches carrier fields on every interval** (`post-editor-form.tsx:171`)
   - The `carried` dependency is in the `useCallback` closure for `runAutosave`, so every autosave invocation captures the latest `carried` from the most recent render. This is correct but means a stale `carried` reference from a previous render persists in the memoized callback until the next dependency change. Mitigated because `carried` comes from `initialCarried` which is stable across the edit session.

### Info

5. **Pre-existing integration test failures confirmed** (2 test files, 4 tests)
   - `credentials-route.integration.test.ts` (3 tests): AUTH_URL/AUTH_TRUST_HOST configuration mismatch — 403 instead of expected 200/401.
   - `ticket-enum-contract.integration.test.ts` (1 test): Enum catalog check.
   - All 4 failures reproduce identically on the coordination base without the candidate. Not introduced by this task.

6. **Pre-existing Turbopack NFT warning during `npm run build`**
   - `next.config.ts` → `staged-file.ts` → `media-admin-transport.ts` → `/api/admin/media/route.ts`
   - This is the subject of Review 3 (`M3-GPT-BUILD-TRACING-WARNING`). Not introduced by this task.

## Adversarial review results

### 1. Mutation lease acquire/release paths
- **Correct.** `beginMutation()` atomically checks `activeMutationRef.current !== null` and returns the locked version. Single-threaded JS guarantees no concurrent acquires.
- `finishMutation(token, nextVersion)` uses a stale-token guard: `activeMutationRef.current !== token` → early return. A delayed autosave response cannot release a newer mutation's lock.
- Version is advanced (`versionRef.current = nextVersion`) BEFORE `activeMutationRef.current = null` is set, so the next `beginMutation()` reads the updated version.

### 2. Success, failure, exception, stale token, version advancement
- **Correct.** All four mutation surfaces (autosave, manual save, publication, delete) follow the same pattern: acquire → try → on-success: finishMutation with nextVersion + released=true → catch: error display → finally: finishMutation without version if not released.
- VERSION_CONFLICT stops autosave (`stoppedRef.current = true`) so stale local version cannot continually fire.
- Validation failures release the lease without advancing the version (correct — no save occurred).

### 3. Autosave/manual save/publication/delete mutual exclusion
- **Verified.** `disabled={submitting || mutationBusy}` on manual save. `disabled={pending !== null || mutationBusy}` on publication buttons. `disabled={mutationBusy}` / `disabled={deleting || mutationBusy}` on delete.
- Autosave skips when `busy` (submitting) is true via `latest.current.submitting`, and when `beginMutation()` returns null via `activeMutationRef.current`.

### 4. Stale request cannot release another's lease
- **Confirmed.** `finishMutation` line 72: `if (activeMutationRef.current !== token) return;`. Any mutation that responds after a newer mutation has already acquired the lock is a no-op.

### 5. Version installed before mutation control reopens
- **Confirmed.** `finishMutation` line 74: `versionRef.current = nextVersion` precedes line 77: `activeMutationRef.current = null`. The next `beginMutation()` reads the advanced version.

### 6. Accessible disabling of mutation controls
- **Confirmed.** All buttons use the native `disabled` HTML attribute which is both functionally effective and natively exposed to assistive technology. The `mutationBusy` and `pending`/`deleting`/`submitting` states drive the attribute correctly.

### 7. Non-mutating navigation not treated as write
- **Confirmed.** Cancel button uses `router.push(listHref)` directly. No mutation lease is acquired. The autosave timer check `if (busy) return` only blocks autosave, not navigation.

### 8. E2E held-response test (Test 15)
- **Verified.** The test:
  - Intercepts autosave responses and holds them while the server commits version 2.
  - Confirms `[data-autosave-status="saving"]` is attached (autosave is in-flight).
  - Confirms all competing buttons are disabled.
  - Confirms only one request (`AUTOSAVE`) was sent during the hold.
  - Releases the response, confirms `[data-autosave-status="saved"]` appears.
  - Confirms manual save is re-enabled.
  - Clicks manual save and verifies `expectedVersion: 2` was used, producing version 3.
  - Confirms the request sequence: `["AUTOSAVE", "UPDATE"]`.

### 9. Contract, API, schema, dependency, authorization preservation
- **Confirmed.** The diff touches only 6 source files under `src/components/admin/posts/` and 2 test files. No changes to contracts, Prisma schema, dependencies, API routes, middleware, or authorization logic. The frozen transport contract (`AdminPostTransportCommandSchema`) is consumed but not altered.

## Acceptance command results

| Command | Result |
| --- | --- |
| `npm run lint` | PASS — 0 issues |
| `npx tsc --noEmit` | PASS — 0 errors |
| `npm test` (unit, Vitest) | PASS — 49 files, 738 tests |
| `npm run test:integration` | 18/20 files pass, 79/83 tests pass. 4 pre-existing failures confirmed on coordination base (credentials-route: 3, ticket-enum-contract: 1). |
| `npm run build` | PASS — Turbopack NFT warning pre-existing (Review 3 subject) |
| Playwright (chromium + mobile, 1 worker) | PASS — 30/30 tests (15 chromium + 15 mobile) |
| `git diff --check` | PASS — clean |

### Playwright test breakdown
- Test 1–8: Editor basic flows (create, validation, conflict, slug, round-trip, ownership, RTL, disclosure)
- Test 9–14: Mutation surfaces (publish, schedule, archive→draft, delete+audit, cover, richtext)
- Test 15: **Held-response autosave serialization** — the key adversarial test

### Environment
- Database: `fuspi_m3_media_library_qa_audit` (PostgreSQL, localhost, `fuspi_m3_qa` user)
- Upload directory: `/tmp/fuspi-deepseek/autosave-review`
- `UPLOAD_PUBLIC_URL=/uploads`
- Dev server port: 3004
- `PLAYWRIGHT_BASE_URL=http://localhost:3004`

## Untested areas and residual risk

- No WebKit/Safari testing (task manifest specifies Chromium + mobile only).
- No test for the token overflow edge case — `nextMutationTokenRef` is a mutable integer. At JavaScript's safe integer range, overflow is practically impossible in a single session. Not a real risk.
- No test for the case where `finishMutation` is called with a token that matches `activeMutationRef.current` but is from a much earlier acquire that was somehow never released (impossible given the `finally` blocks, but the guard correctly handles it).

## Non-committing merge status
- Candidate was merged with `git merge --no-commit --no-ff f2ad281eb8885fe5df839fc2e16cf079a8a68524` for evidence collection.
- After evidence collection, working tree was reset: `git checkout -- . && git reset HEAD -- . && git clean -fd`.
- No candidate source files are committed or present in the working tree.

## Confirmation
- Only review document (`coordination/reviews/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION-deepseek.md`) and handoff document (`coordination/handoffs/M3-DEEPSEEK-AUTOSAVE-SERIALIZATION-REVIEW-deepseek.md`) are committed.
- No merge to `integration/*` or `main` was performed.
- No candidate source was pushed from the DeepSeek review branch.
