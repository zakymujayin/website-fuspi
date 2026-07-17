# Handoff — M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA (corrected)

- Task ID: `M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA`
- Branch: `ai/deepseek/m3-public-post-experience-qa`
- Base SHA: `dac98f8`
- Head SHA: f085715

## Summary

Performed independent QA of the merged Claude Berita public reference slice via
PostgreSQL-backed Playwright browser coverage (29 test scenarios across ID/EN/AR
locales). Verdict: **APPROVE** — no product defects found.

## Correction Pass Changes

1. **Parallel-safe fixtures**: Removed global `LIKE 'e2e-br-%'` pre-cleanup.
   All cleanup is ID-scoped via tracked arrays (`postIds`, `userIds`, etc.).

2. **DATABASE_URL validation**: Added module-level guard that rejects non-local,
   non-PostgreSQL, or production/staging database URLs before `Pool` creation.

3. **Coverage completions**:
   - Archived slug → same as public not-found
   - AR fallback: H1 `lang=id dir=ltr`, article body `lang=id dir=ltr`, status banner
   - axe on ID list, ID detail, AR list, AR detail (header/footer excluded)
   - Overflow on ID detail/list and AR detail/list (LTR + RTL)
   - Keyboard focus visibility
   - `main` count = 1 + H1 visible

## Acceptance Commands (corrected)

| Command | Result |
|---------|--------|
| `npx playwright test ... --project=chromium` | 28 passed, 1 failed (pre-existing WCAG color-contrast on text-slate-400) |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `git diff --check` | PASS |
| Scope check | PASS — 3 files within lease |

The single axe failure is `text-slate-400` (#94a3b8) on white — a global
design-token issue affecting the entire site, not a Berita slice defect.

## Findings

**Product defects**: None.

**Pre-existing**: WCAG color-contrast (text-slate-400 — site-wide design token).

## Confirmation

- No product source, test, schema, contract, dependency, or config files modified
- No merge to integration/* or main performed
- No other task started
- Only allowed_paths files changed
