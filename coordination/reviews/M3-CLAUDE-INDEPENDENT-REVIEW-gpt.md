# M3 Claude Stand-in Independent Review — GPT

Date: 2026-07-28  
Integration head reviewed: `f8a40ebe5b0279d08f45864863f2642f56dedeae`  
Review task: `M3-GPT-CLAUDE-INDEPENDENT-REVIEW`

## Verdict

**CHANGES_REQUESTED**

No Critical or High security defect was found in the reviewed Claude UI work. The public Post,
Media, Post list, and Post editor surfaces preserve the frozen server authorization boundaries,
non-disclosing error presentation, locale behavior, and optimistic-lock payloads exercised by the
consolidated M3 test suites.

The review cannot be approved, however, because a mandatory browser acceptance command fails in
both projects and two merged Claude changes were not governed by their declared leases. The review
manifest permits `APPROVED` only when every mandatory command passes and governance violations are
reconciled.

## Findings

### 1. Medium — gate-blocking Media Library keyboard acceptance is stale after upload UI

`src/app/[locale]/admin/media/page.tsx:61-69` now renders the focusable `MediaUpload` form before the
filter navigation. The mandatory test at
`e2e/m3/admin-media-library-browse.spec.ts:646-661` still assumes that one Tab after the skip link
must focus the first filter. The assertion therefore fails identically in Chromium and mobile:

```text
Locator: nav[aria-label='Saring media berdasarkan jenis'] a
Expected: focused
Received: inactive
```

Reproduction:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3004 npx playwright test \
  e2e/m3/admin-media-library-browse.spec.ts \
  --project=chromium --project=mobile --workers=1
```

Result: **82 passed, 2 failed**. This may be corrected in the DeepSeek QA lane by proving the actual
focus sequence through the upload controls and filters, or in the Claude UI lane if the intended
interaction order differs. It may not be waived merely because CI currently omits Playwright.

### 2. Governance blocker — merged navigation fix has no task manifest or path lease

`coordination/handoffs/M3-CLAUDE-POST-EDITOR-NAV-FIX-claude.md` records a merged Claude correction,
but there is no matching `coordination/tasks/M3-CLAUDE-POST-EDITOR-NAV-FIX.md`. This violates the
repository rule that work may not start without a task manifest and active path lease. The resulting
Post navigation behavior itself is now browser-proven (**88/88**), but the missing authorization
record must be reconciled before the independent review can be approved.

### 3. Governance blocker — cover picker changed a path outside its lease

`coordination/tasks/M3-CLAUDE-POST-COVER-PICKER.md:8-19` does not allow
`tests/m3/ui/admin-post-editor.test.tsx`. The Claude handoff explicitly records that this file was
nevertheless edited at
`coordination/handoffs/M3-CLAUDE-POST-COVER-PICKER-claude.md:26-32`. The change is consistent with
the cover-field refactor and the resulting editor suite passes, but correctness does not
retroactively grant the missing lease. The integrator must record a proper reconciliation.

### 4. Medium — simultaneous autosave and another mutation can create a self-conflict

`src/components/admin/posts/post-editor-form.tsx:99-105` prevents autosave from starting while a
manual submit is active, but the reverse direction is not guarded:
`src/components/admin/posts/post-editor-form.tsx:342-351` leaves Save and Cancel enabled while
`autosave.status === "saving"`. The shell likewise passes only the shared numeric version to
publication and delete (`src/components/admin/posts/post-editor-shell.tsx:57-80`), without sharing an
in-flight mutation state.

Consequently, a manual save, publication transition, or delete started while the autosave request is
already in flight can send the same `expectedVersion`. Optimistic locking prevents corruption, but
one of the user's own actions can receive an avoidable `VERSION_CONFLICT`. The existing E2E proof
waits for autosave to finish before manual save; it does not cover overlap. A corrective UI task
should serialize these writes and add an overlap test.

## Claude work reviewed

| Slice | Evidence and disposition |
| --- | --- |
| Public Post experience | Functional evidence passes: public browser suite **60/60**. |
| Public contrast correction | Covered by public axe/viewport/locale suite; no blocking defect found. |
| Media Library browse | Functional coverage passes except the focus-order gate failure in finding 1. |
| Media single upload | Unit/integration coverage passes; later upload controls expose finding 1. |
| Media batch/PDF upload | Unit/integration and remaining Media browser coverage pass. |
| Post admin list | Browser suite **88/88**. |
| Post editor basic | Browser create/update/validation/ownership/RTL cases pass. |
| Post editor navigation | Browser navigation cases pass. |
| Post editor RSC fix | Consolidated unit, type, build, and editor browser evidence passes. |
| Post editor navigation fix | Functional evidence passes; missing manifest in finding 2. |
| Publication actions | Publish/schedule/archive/return-to-draft browser cases pass. |
| Post delete | Delete, audit, and navigation browser case passes. |
| Cover picker | Set/clear browser case passes; out-of-lease test edit in finding 3. |
| Rich text | Bold write and server-sanitized `<strong>` browser case passes. |
| Autosave | 30-second save-then-manual-save case passes; overlap gap in finding 4. |
| Editor-shell lint fix | Lint passes; no new hook violation found. |

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run prisma:validate` | PASS |
| `npm test` | PASS — 49 files, 738 tests |
| `npm run test:integration` | PASS — 20 files, 83 tests |
| `npm run build` | Exit 0, but emits the carried Turbopack NFT warning |
| Public Post Playwright, Chromium + mobile | PASS — 60/60 |
| Media Library Playwright, Chromium + mobile | **FAIL — 82/84** |
| Post list Playwright, Chromium + mobile | PASS — 88/88 |
| Post editor Playwright, Chromium + mobile | PASS — 30/30 |
| `git diff --check` | PASS before review document creation |

The Turbopack warning is not introduced by Claude's M3 UI work. It remains an M3 exit blocker on the
reviewed integration head. `M3-GPT-BUILD-TRACING-WARNING` fixes it on
`ai/gpt/m3-build-tracing-warning`, where lint, typecheck, unit, integration, Prisma, zero-warning
build, and standalone Media upload/delete smoke all pass; that fix still needs its assigned
independent review and merge.

## Gate decision

Do not write the M3 exit contract and do not open M4 yet. Required corrections:

1. repair and pass the Media Library focus-order browser evidence in both projects;
2. reconcile the missing navigation-fix manifest and the cover-picker out-of-lease edit;
3. serialize autosave against manual save/publication/delete and add overlap evidence;
4. independently approve and merge `M3-GPT-BUILD-TRACING-WARNING`;
5. rerun this review's full acceptance set, then consume an `APPROVED` result in a separate
   GPT-owned M3 exit-contract task.
