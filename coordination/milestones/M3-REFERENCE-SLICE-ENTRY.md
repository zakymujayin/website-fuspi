# M3 Reference Slice Entry

Status: **M3 active — admin transport runtimes, public IA contract, and Claude Media Library browse merged**

**Temporary integrator note (2026-07-23 to 2026-07-29):** Codex (GPT) usage limit is exhausted;
GPT's next scheduled activity is 2026-07-29. Claude Sonnet 5 is standing in as integrator and for
GPT-lane review/merge duties for this window only, per human coordinator decision recorded in
`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`. New cross-lane contract changes
(schema, auth, proxy, dependency, navigation registry) opened during this window should be treated
as provisional until GPT/Codex reviews them on return.

**Independence gap (2026-07-23):** DeepSeek also exhausted its usage limit mid-task, so Claude
authored the Media Library UI, corrected its QA harness, authored the Post admin list and its tests,
and approved all of it as integrator. No independent party reviewed these slices. They are merged to
keep M3 moving, but Codex and DeepSeek must re-verify them on return before they count toward the M3
exit gate. Two items need Codex's attention first when he returns:

1. **The basic Post editor is the highest-risk unreviewed work** — the first mutation surface,
   touching CSRF, optimistic locking, and ownership. Re-review it specifically.
2. The editor now has a **PostgreSQL-backed Playwright suite** (`e2e/m3/admin-post-editor.spec.ts`,
   16/16 on the mandated combined command) driving the real form. Writing it exposed **three product
   defects** that unit tests and the editor's original API-only verification missed — all fixed and
   merged:
   - RSC boundary crash (`M3-CLAUDE-POST-EDITOR-RSC-FIX`);
   - no navigation after a successful save (`M3-CLAUDE-POST-EDITOR-NAV-FIX`);
   - `getAdminPostEditor` NOT_FOUND for every cover-bearing post, i.e. the editor could not open any
     post with a cover image (`M3-GPT-EDITOR-COVER-VIEW-FIX`, GPT platform lane, +1 integration
     regression case).
   These strongly vindicate the independent-QA design and are the clearest evidence that the
   stand-in's self-review is not a substitute for it — Codex should re-review all three on return,
   especially the platform-lane cover fix.

### Operational note — running the full e2e/m3 directory

The M3 browser suites serialize on a shared advisory lock. **CI runs them with `workers: 1`**
(`playwright.config.ts`: `workers: process.env.CI ? 1 : undefined`), which is correct. A **local**
run of the whole directory at the default worker count (CPU-many) makes the suites contend for the
one lock; the last suite to wait can exceed its 300s hook timeout and then run unlocked, causing
cross-suite interference failures. This is a local-only artifact, not a product defect and not a CI
problem. Run `--workers=1` locally to match CI. Each suite, and each suite's mandated combined
chromium+mobile command, passes on its own.

The local dev server (`next-server`, ~1.2 GB) must also have room to boot within Playwright's 120s
`webServer` timeout; on a memory-constrained shared machine (≈600 MB free), it times out and the whole
run fails with `Timed out waiting … from config.webServer` — an environment artifact, not a product
or test failure. **Correction (2026-07-26):** an earlier version of this note claimed freeing memory made the media
suite "run cleanly". That claim was premature and is withdrawn — it was read from mid-run buffered
output before the run finished. On re-run, this local machine (7.5 GB RAM, ~3.6 GB already in swap,
shared with other tools) still could not run even a single browser suite reliably: media alone took
**23.7 min and ended 56/84 failed**, all from Next dev thrashing swap and tripping 30s selector
timeouts — not product or test-logic failures. **Conclusion: the full browser directory is not
runnable on this local machine in its current state.** The authoritative verification is CI (fresh
container, adequate memory, `workers: 1`). Each suite's clean pass and each mandated combined
chromium+mobile pass recorded above were captured earlier when the machine had headroom; they stand,
but do not attempt the full local directory run under memory pressure.

M3 starts from the accepted M2 development head
`f83a00e6816a91f72b9ade654b012be8a1a0b2d0`. That head passed GitHub Actions run
`29460510481`. The integration branch is `integration/m3-reference-slice`.

M3 delivers one complete Post + Media + i18n vertical slice and freezes the reusable content
pattern before M4 expands the CMS. Opening M3 does not waive deployment/go-live evidence still
tracked by the M2 exit contract.

## Activation order

1. **GPT contract freeze (merged):** define the Zod and TypeScript boundary for Post, Media,
   locale fallback, ownership, optimistic versioning, autosave, publish/schedule/archive, and
   safe public reads. No route, action, UI, dependency, or schema change is included.
2. **GPT runtime slice (merged):** after the contract merges, implement the server-only service,
   authorization, transaction, revision, upload commit/rollback, and public query boundaries.
3. **Claude public experience (merged):** implement the bounded `/berita` list/detail reference
   experience against the frozen public query contract, including ID/EN/AR fallback presentation,
   RTL, accessibility, metadata, JSON-LD, responsive states, and safe rich-text rendering.
4. **DeepSeek public experience QA (accepted):** the initial independent browser pass found one
   WCAG AA sidebar-date contrast defect. Claude corrected it in a bounded UI task; the final
   PostgreSQL-backed retest passed 60/60 across Chromium and mobile with all ID/AR axe scans green.
5. **Admin transport/editor slice (Post and Media runtimes merged):** the GPT-owned Berita/Post/Media admin
   transport contract and Post admin runtime passed independent DeepSeek adversarial review with
   no Critical/High defect. The batch-upload response gap is now closed and independently reviewed;
   the Media admin runtime is also independently reviewed and merged with no Critical/High defect.
   Claude's bounded read-only Media Library browse presentation passed GPT correction re-review and
   is now **merged**, with its PostgreSQL-backed browser QA passing 84/84 across Chromium and mobile
   on the mandated combined command — subject to the independence gap noted above. The read-only
   **Post admin list** (`/[locale]/admin/posts`) is also merged, with 49 unit tests and a
   PostgreSQL-backed Playwright suite passing **80/80** across Chromium and mobile (session/redirect,
   ADMIN-vs-EDITOR ownership, status filter with the scheduled-state contract, hostile-query
   fail-closed, ID/EN/AR + RTL, ADMIN pagination, axe WCAG A/AA, viewport overflow, no PII
   disclosure). The editor is now **reachable from the list UI** — a header create action and a
   per-row edit link gated on `capabilities.update`, so a row the actor cannot update offers no edit
   affordance. The **basic Post editor** (`/admin/posts/new` and `/admin/posts/[postId]/edit`) is
   merged too: create-draft and edit only, submitting to the existing `POST /api/admin/posts`
   boundary with no new server behaviour. Its runtime evidence covers CSRF rejection, session
   rejection, `VERSION_CONFLICT` on a stale version, and EDITOR-B receiving `NOT_FOUND` (not
   `FORBIDDEN`) for another editor's post. The whole `e2e/m3/` browser directory now passes
   **224/224** after a cross-suite fixture-isolation fix. Autosave, publish/schedule/archive,
   delete, rich text, and the picker UIs remain closed until their own manifests.
6. **Integrator gate:** merge serially, run the full PostgreSQL and browser suites, reconcile the
   carried security cases, then freeze the reference pattern for M4.

Claude and DeepSeek may work only from a newly committed task manifest and non-overlapping frozen
assignment branch. They must not infer permission from this entry document or a chat prompt alone.

**Update (2026-07-26):** the Post editor now includes publication actions (publish-now, schedule,
return-to-draft, archive) via the existing PUBLICATION command, gated on `capabilities.publish`,
verified in a real browser. The reference slice's admin write path is now create → edit → publish/
schedule/archive end to end.

## Carried mandatory security evidence

M3 cannot close until executable tests prove:

- EDITOR list/detail/mutation ownership and negative-ID IDOR rejection;
- session, permission, ownership, and record-scope checks in every loader/action/route;
- CSRF rejection for every new Post and Media mutation boundary;
- required ID translation, deterministic EN/AR fallback, and no duplicate fallback results;
- rich-text sanitization on write and safe render against stored XSS;
- optimistic conflict rejection for update and 30-second draft autosave;
- publish-now, future scheduling, archive, and public `publishedAt <= now()` behavior;
- Media ownership plus staged-file rollback/orphan cleanup when the database transaction fails;
- upload validation remains bound to the M2 storage contract.

## DB-gated evidence: there was never a CI gap (2026-07-24, corrected)

An earlier revision of this section claimed the 18 files gated behind `RUN_PLATFORM_DB_TESTS` "do
not run in the pipeline" and that M3 must not close until CI enables the gate. **That was wrong and
is withdrawn.**

CI already runs every one of them. `package.json` defines
`test:integration = RUN_PLATFORM_DB_TESTS=true vitest run --config vitest.integration.config.ts`,
that config uses `environment: "node"` and includes `tests/**/*.integration.test.ts` +
`src/**/*.integration.test.ts` (20 files, which covers all 18 gated ones — every gated file ends in
`.integration.test.ts`), and `.github/workflows/ci.yml` runs `npm run test:integration` against a
`postgres:17` service with `TOKEN_HMAC_SECRET`/`IP_HASH_SECRET`/`AUTH_SECRET` set.

Proof the evidence was passing in CI's configuration all along — the **pre-fix** Media files under
CI's exact config:

```text
git checkout 8312635 -- tests/m3/runtime/
RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m3/runtime/
→ 21 passed
```

### What the false alarm actually was

`vitest.config.ts` (the **unit** config, `environment: "jsdom"`) sets no `include` and excludes only
`e2e/**` and `node_modules/**`, so it *also* collects the 20 integration files, where they self-skip
because the gate is unset. That is the "18 skipped" line in `npm test`. Forcing them to run through
that unit config — `RUN_PLATFORM_DB_TESTS=true npm test` — executes integration tests under **jsdom**,
where Node's `Buffer` is not `instanceof` the jsdom realm's `Uint8Array`, producing 4 Media failures
that CI never sees. The alarm was an artifact of that invocation, not a gap in coverage.

DeepSeek's `@vitest-environment node` pragma on the two Media files is therefore **harmless
hardening**, not a repair of a real CI hole: it makes those files behave correctly even when
collected by the unit config.

### Remaining real (minor) issue

The unit config double-collecting integration files produces a misleading "18 skipped" signal — the
signal that caused this false alarm. Restricting `vitest.config.ts` to exclude
`**/*.integration.test.ts` would remove the ambiguity. Root-config hotspot, GPT lane, low risk.
This is a clarity improvement, **not** an M3 exit blocker.

A derived, regenerable inventory of what each gated file proves is in
`coordination/reviews/M3-DB-GATED-EVIDENCE-INVENTORY.md`. Use that — not prose descriptions — when
ticking off the carried-evidence list.

## Carried pre-existing defects (must clear before M3 exit)

1. **`npm run build` emits 1 Turbopack warning** — "Encountered unexpected file in NFT list", i.e.
   `output: "standalone"` file tracing pulls in the whole project. Diagnosed 2026-07-23; not caused
   by the Media Library merges. Build still succeeds, so this is bundle bloat, not breakage, but the
   workspace checklist requires zero build warnings.

   Import trace:
   `next.config.ts → src/lib/storage/staged-file.ts → src/lib/content/media-admin-transport.ts →
   src/app/api/admin/media/route.ts`

   Cause: `staged-file.ts` builds paths with `path.join`/`realpath` from a **runtime-configurable**
   storage root (`UPLOAD_DIR`, `UPLOAD_PRIVATE_DIR`, `PPKS_PRIVATE_DIR`), so the tracer cannot
   resolve them statically. Turbopack's suggested "scope to a static subfolder" fix therefore does
   not apply — the root is deliberately configurable.

   Deliberately **not** fixed by the stand-in: `staged-file.ts` enforces storage-boundary security
   (symlink and `realpath` checks) and sits in the GPT storage hotspot. A tracing workaround there
   is easy to get subtly wrong and warrants GPT ownership plus the Next 16 tracing docs under
   `node_modules/next/dist/docs/`. GPT lane.

### Withdrawn: the "auth credentials 503" defect was never real

An earlier revision of this document recorded a second carried defect — the credentials route
returning `503` where `401` was expected in
`tests/security/auth-runtime/credentials-route.integration.test.ts`. **That entry was wrong and is
withdrawn.**

Root cause was a local environment misconfiguration, not product code: the QA worktree's gitignored
`.env.local` defined `EMAIL_HMAC_SECRET`, but the env contract (`.env.example`), CI
(`.github/workflows/ci.yml`), and `src/lib/auth/runtime/config.ts` all use **`TOKEN_HMAC_SECRET`**.
`EMAIL_HMAC_SECRET` is referenced nowhere in the codebase. With the variable unset, `getAuthSecrets()`
threw, the broad `catch` in `credentials.ts` mapped it to `AUTH_UNAVAILABLE`, and the route returned
`503`.

With `TOKEN_HMAC_SECRET` set correctly, `npm run test:integration` passes **82/82**.

The verification that produced the wrong conclusion is worth recording: the failure was "confirmed
pre-existing" by reproducing it on a branch without the Media Library work — but the *same*
misconfigured `.env.local` was sourced both times, so the reproduction only proved the environment
was constant, not that the product was at fault. Reproducing a failure across branches does not
isolate a cause when the environment is shared.

## M3 exit gate

The milestone is complete only when the Post reference slice works end to end for ADMIN and
EDITOR, public ID/EN/AR and Arabic RTL paths pass, accessibility and metadata checks pass, the
full CI pipeline is green, and no Critical/High security finding remains. M4 stays closed until
the GPT integrator records that evidence in a dedicated M3 exit contract.

The two carried defects above and the Media Library independence gap must all be cleared by Codex
and DeepSeek before that exit contract can be written.
