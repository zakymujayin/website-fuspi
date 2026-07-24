# QA Review — M3 Claude Post Admin List

Verdict: **APPROVE**

- **QA author:** Claude Sonnet 5, standing in for the DeepSeek QA lane *and* the GPT integrator role
  while both Codex and DeepSeek are out of usage limit
  (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).
- **Candidate under test:** `c93c5ae` (`M3-CLAUDE-POST-ADMIN-LIST`), merged into
  `integration/m3-reference-slice`.
- **QA base:** `cb78a3f`.

## Independence caveat — read before trusting this APPROVE

The same model authored the Post admin UI, this QA harness, and the integrator sign-off. No
independent party checked it. Every command below is reproducible verbatim; Codex and DeepSeek must
re-verify on return before this counts toward the M3 exit gate.

## Result

The **mandated combined command** passes 40 cases × 2 projects = **80/80** against an isolated
PostgreSQL database:

```bash
cd /home/zhev/myproject/fuspi-deepseek
set -a && . ./.env.local && set +a
npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --project=mobile
```

No Critical/High/Medium defect was found in the Claude candidate. The one issue surfaced during
authoring was a **test-harness** bug, not a product bug (see below).

## Coverage

| Area | Cases |
| --- | --- |
| Session/redirect: unauth + expired → login; ADMIN/EDITOR reach page with no role/email/token leak | 4 |
| Ownership: ADMIN sees 26; EDITOR-A sees only their 15, never EDITOR-B titles; scoped pagination | 3 |
| Status filter ALL/DRAFT/PUBLISHED/ARCHIVED, `aria-current`, page-1 reset, locale preserved | 4 |
| Publication-state badge DRAFT/PUBLISHED/SCHEDULED/ARCHIVED proven by distinct text | 1 |
| Hostile/repeated/unknown/excessive query → canonical page-1/ALL, no EDITOR leak (9 forms) | 1 |
| Display: title, featured, ID/EN locales, category + uncategorized fallback, author, Jakarta time | 3 |
| Locale ID/EN/AR, `dir="rtl"`, genuine Arabic, RTL chevron mirroring | 4 |
| ADMIN pagination: 20 on page 1, 6 on page 2 | 2 |
| axe WCAG 2.0/2.1/2.2 A/AA on ID + AR for ADMIN and EDITOR; one main + one h1; keyboard focus | 5 |
| Viewport 360/390/768/1024/1440 × ID/AR, no horizontal overflow | 10 |
| No PII/token/technical-error disclosure; empty state not `role="alert"` | 3 |

## The frozen contract, verified at runtime

`SCHEDULED` is a *publication state*, not a filterable status. A `PUBLISHED` row dated in the future
renders the "Terjadwal" badge but is still returned by the `PUBLISHED` filter. The suite proves this
directly: EDITOR-A's `?status=PUBLISHED` returns 7 rows (4 past-published + 3 future-scheduled) and
the badge text contains both "Terbit" and "Terjadwal". A `?status=SCHEDULED` query is treated as
hostile and collapses to canonical ALL.

## Harness bug found and fixed during authoring (not a product defect)

The first combined run failed 4 cases: the total-count assertions used `p:has-text("berita")`, which
matched the page **description** paragraph (it also contains the word "berita") before the count
line. Fixed with an anchored `getByText(/^\d+ berita$/)`. The product rendered the correct counts
throughout — confirmed because every other count-dependent test (ownership, filter, pagination)
passed against the same fixtures.

## Fixture design

- Per-project markers (`m3-post-qa-list-<project>`) so chromium and mobile never collide on
  `User_email_key` or `Post_slug_key`.
- A PostgreSQL advisory lock (key `883112046`, distinct from the Media suite's `883112045`)
  serializes the two projects so ADMIN global counts stay correct at any `--workers` value.
- FK-safe purge (Session → PostTranslation → Post → CategoryTranslation → Category → User) in
  `afterAll`/`finally`, plus an idempotent purge in `beforeAll`.
- 26 Berita: EDITOR-A owns 15 (5 draft, 4 published-past, 3 scheduled, 3 archived), EDITOR-B owns 8,
  ADMIN owns 3. EDITOR ownership requires `authorId = contentOwnerId = userId`, matching the
  transport's `ownershipWhere`.
- All identities use `@example.invalid`. No production/staging data.

## Other gates

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm test` | 628 passed, 75 skipped, 0 failed |
| `git diff --check` | clean |

Fixtures and advisory locks were verified absent from the database after the run.

## Untested / follow-ups

- EDITOR **mutation** ownership/IDOR is out of scope here (this route is read-only); it stays on the
  M3 exit list against the editor UI once that exists.
- No visual-regression snapshots; assertions are structural/textual.
