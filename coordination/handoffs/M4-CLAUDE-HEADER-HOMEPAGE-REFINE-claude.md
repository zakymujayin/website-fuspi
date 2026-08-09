# Handoff — M4-CLAUDE-HEADER-HOMEPAGE-REFINE — claude

- Branch: `deepseek/continue-fuspi-20260805`
- Base SHA: `46e9a42271ee6f460d2a93028fede381137808d7`
- Head SHA: `284b9fc8e7568b03b29b9a4e53fa8a131fc72c1e`

## Result
Unified the public header into a single sticky bar per user feedback, turned **Profil** into a dropdown with direct sub-page links, replaced the inline locale buttons with a flag-icon language dropdown, and made the homepage Dean Welcome, Stats Counter, and News sections always render with fallback content when CMS data is absent.

## Files changed
- `src/components/public/site-header.tsx` — single 72px header combining logo, primary nav, utility links, and language switcher.
- `src/components/public/shell/sticky-header.tsx` — simplified sticky single bar; removed compaction transform and obsolete `header-scroll.ts`.
- `src/components/public/desktop-nav.tsx` — tighter item padding to fit the unified bar.
- `src/components/public/mobile-nav.tsx` — made content section optional so it can be passed when needed.
- `src/components/public/language-switcher.tsx` — Base UI dropdown trigger with inline SVG flags (ID/UK/SA).
- `src/components/public/nav-items.ts` — added `profileNav` dropdown children and `infoNav` publication group.
- `src/components/public/nav-items.test.ts` — imported `profileNav` for key coverage.
- `src/components/public/site-footer.tsx` — added content links column; grid expanded to 5 columns on desktop.
- `src/app/[locale]/(public)/layout.tsx` — updated `scroll-mt` from 148px to 72px.
- `src/app/[locale]/(public)/page.tsx` — always-visible Dean Welcome (with fallback text), Stats Counter, and News section with empty state.
- `src/app/[locale]/(public)/profil/page.tsx` — redirects to `/profil/sejarah` instead of card grid.
- `src/app/[locale]/(public)/profil/{sejarah,visi-misi,struktur,pimpinan,fasilitas}/page.tsx` — new placeholder sub-pages.
- `messages/{id,en,ar}.json` — new Nav keys (`history`, `visionMission`, `structure`, `leadership`, `facilities`, `publication`) and new Home keys (`deanFallback*`, `newsEmpty*`).
- `tests/m4/ui/public-shell-hardening.test.tsx` — updated to match single-header and language-dropdown behavior.
- `src/components/public/shell/header-scroll.ts` — removed (dead code).

## Contract/schema/migration impact
- No Prisma schema or migration changes.
- Navigation contract (`nav-items.ts`) gained `profileNav` and `infoNav`; message keys expanded.
- New public routes under `/profil/*` are SSG.

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass (3 pre-existing `no-img-element` warnings) |
| `npm run test` | 85 files, 1103 tests pass |
| `npm run build` | 220 pages generated successfully |

## Untested areas
- Visual regression of the single header at exactly 1024–1280px viewports (manual browser check recommended).
- Language dropdown hover/keyboard behavior is covered by Base UI primitives but not by a dedicated interaction test.
- Real flag SVG rendering in dark/RTL contexts.

## Risks and follow-ups
- The `/profil` index now redirects to `/profil/sejarah`; if a dedicated profile overview is desired later, the redirect should be replaced.
- Profile sub-pages are placeholders with `comingSoon` text; content owners need to fill in Sejarah, Visi-Misi, Struktur, Pimpinan, and Fasilitas copy.
- Dean photo still relies on `siteSetting.deanPhoto`; fallback shows a branded placeholder. Upload dean photo via admin Site Settings to replace it.
- Stats use live DB counts when available; lecturers/staff/partners show "—" when zero. Populate those tables or update the fallback strategy if hardcoded defaults are preferred.

## Requested shared changes
None.
