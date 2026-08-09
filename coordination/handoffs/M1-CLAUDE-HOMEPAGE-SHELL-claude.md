# HANDOFF — M1-CLAUDE-HOMEPAGE-SHELL

- **Task:** M1-CLAUDE-HOMEPAGE-SHELL
- **Owner:** claude (Public Experience)
- **Branch:** `ai/claude/m1-homepage-shell`
- **Base SHA:** `0c90627` (branch tip at start; manifest `base_sha: 2da38f7` is its parent)
- **Head SHA:** `a1f392e` (implementation commit; this handoff's SHA note lands in the commit after it)
- **Status:** implementation + tests complete, committed, pushed. Not merged.

## Summary

Closed the homepage route contract request from the original Claude handoff. The locale homepage now renders inside the shared public shell instead of owning its own `<main>`. This is a routing/shell task only: no homepage redesign, and the M4 editable homepage remains out of scope.

1. Moved `src/app/[locale]/page.tsx` → `src/app/[locale]/(public)/page.tsx` (via `git mv`, history preserved) so `/id`, `/en`, `/ar` render inside the public header / footer / skip-link shell.
2. Removed the nested `<main>` landmark. The public layout at `src/app/[locale]/(public)/layout.tsx` owns the single page `<main id="main" tabIndex={-1}>`, which is also the skip-link target.
3. Preserved all M0 foundation copy, the `role="status"` line, and the in-page locale switcher. All `M0` message keys and locale behavior are untouched.
4. Added `e2e/experience/homepage-shell.spec.ts`.

## Files changed

| File | Change |
|---|---|
| `src/app/[locale]/page.tsx` | deleted (moved) |
| `src/app/[locale]/(public)/page.tsx` | added (moved); nested `<main>` → `<div>` wrapper |
| `e2e/experience/homepage-shell.spec.ts` | added |
| `coordination/handoffs/M1-CLAUDE-HOMEPAGE-SHELL-claude.md` | added |

All four are inside `allowed_paths`. No `forbidden_paths` or `readonly_paths` were touched: no changes to messages, `globals.css`, shared components, schema, dependencies, proxy, contracts, or security code.

## One judgment call to review

The old page's outer wrapper used the `.foundation-shell` class, which is `display: grid; min-height: 100vh; place-items: center`. That was correct for a standalone page that owned the viewport, but inside the public shell the layout already applies `min-h-screen flex flex-col` with `flex-1` on `<main>`. Keeping `.foundation-shell` would double-count the viewport height and push the footer a full screen below the fold.

`src/app/globals.css` is in both `forbidden_paths` and `readonly_paths`, so I did not touch the class. Instead the page now wraps the card in `<div className="grid place-items-center px-6 py-12 md:py-20">` and keeps `.foundation-card` (pure card styling, no viewport assumptions). Visual copy and status are unchanged.

Follow-up for the CSS owner (Claude/UI lane, separate task): `.foundation-shell` is now unused, and its comment at `globals.css:307` still points at the old path `src/app/[locale]/page.tsx`. It should be deleted or re-pointed. I left it in place rather than edit a forbidden path.

## API / schema / migration impact

None. No schema, migration, action, route handler, or contract change. No new dependency.

## Commands and results

Run in `/home/zhev/myproject/fuspi-claude`. All `acceptance_commands` pass.

| Command | Result |
|---|---|
| `npm run lint` | PASS — "ESLint: No issues found" |
| `npm run typecheck` | PASS — 0 errors |
| `npm test` | PASS — 10 files, 86 passed, 2 skipped |
| `npm run test:e2e` | PASS — 90 passed (chromium + mobile) |
| `npm run build` | PASS — compiled clean; `/id`, `/en`, `/ar` still SSG-prerendered |

### Two pre-existing environment failures I had to clear (no tracked files changed)

`npm run typecheck` initially failed with 9 errors in `prisma/seed.ts`, `src/lib/outbox/enqueue.ts`, and `tests/platform/platform-db.integration.test.ts` (`contentOwnerId`, `scopeKey`, outbox `payload`). **These are not mine.** I confirmed they reproduce on the clean base with my changes stashed. Cause: a stale generated Prisma client in this worktree — the schema has the fields, the generated client did not. Fixed with `npm run prisma:generate`, which writes only to `src/generated/prisma` (gitignored). GPT lane may want to confirm CI regenerates the client before typecheck, or those errors will surface there too.

A stale `.next/dev/types/validator.ts` also still referenced the moved `src/app/[locale]/page.js`. Cleared with `rm -rf .next`. Build artifact only.

## Test coverage added

`e2e/experience/homepage-shell.spec.ts`, across `id` / `en` / `ar` and both Playwright projects:

- exactly one `<main>` landmark on the homepage, plus header (`banner`) and footer (`contentinfo`) present;
- exactly one `h1`, matching the per-locale M0 headline, inside `main`;
- M0 `role="status"` copy still rendered;
- `html[lang]` and `html[dir]` (`rtl` for `ar`, `ltr` otherwise);
- FUSPI identity present; zero `FUDA` matches and zero `fuda.uinbanten.ac.id` links;
- no horizontal overflow at 360 / 390 / 768 / 1024 / 1440 px;
- skip link is the first tab stop, is `href="#main"`, and moves focus to the shell `<main>`;
- RTL: `.foundation-status` logical inline-start border mirrors to the right edge in Arabic.

## Untested areas, risks, follow-ups

- **Risk: low.** Routing/presentation only; no data, auth, or action surface.
- No axe/Lighthouse run in this task — the shell's a11y is already covered by `e2e/experience/shell.spec.ts` (contrast, drawer focus trap), and this task adds no new interactive component.
- The homepage keeps its own in-page locale nav, which now duplicates the header language switcher. Preserved deliberately per manifest item 3 ("preserve existing locale behavior"). Worth removing when the M4 editable homepage replaces this content.
- `.foundation-shell` dead CSS — see the follow-up above.

## Requested contract / dependency changes

None.
