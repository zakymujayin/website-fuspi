# Handoff — M4-GPT-PUBLIC-IA-MENU-REMAP — gpt

- Branch: ai/gpt/m4-public-ia-menu-remap
- Base SHA: e29a9f17036838333350de19b8da92ceb818c2a8
- Head SHA: pending

## Result

Academic submenu resource links now land in the academic page context instead of the generic document list. The `/akademik` page has dedicated anchored sections for Jadwal Perkuliahan, Kalender Akademik, Kurikulum, Mata Kuliah per Tahun Ajaran, Dokumen Akademik, Akreditasi, and Pedoman Akademik, plus a Program Studi section.

Browser audit of internal public menu links returned HTTP 200 for every checked link. The remaining mismatch outside this task scope is `/profil`, which renders an H1 of `Sejarah`; desktop dropdown parents are triggers, but the route itself needs a dedicated profile landing in a separate leased task.

## Files changed

- `src/components/public/nav-items.ts`
- `src/app/[locale]/(public)/akademik/page.tsx`
- `src/components/public/nav-items.test.ts`
- `messages/id.json`
- `messages/en.json`
- `messages/ar.json`
- `coordination/handoffs/M4-GPT-PUBLIC-IA-MENU-REMAP-gpt.md`

## Contract/schema/migration impact

None. No schema, migration, dependency, auth, proxy, env, or shared contract changes.

## Verification

| Command | Result |
|---|---|
| `npx shadcn@latest info` | Passed; confirmed Next.js 16.2.10, shadcn base-nova, Tailwind v4, lucide, RTL enabled |
| `npx vitest run src/components/public/nav-items.test.ts tests/m4/ui/public-shell-hardening.test.tsx src/test/identity-contracts.test.ts` | Passed; 3 files, 65 tests |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test` | Passed; 116 files, 1404 tests |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-IA-MENU-REMAP.md TASK_BASE=e29a9f17036838333350de19b8da92ceb818c2a8 npm run check:scope` | Passed after sandbox escalation; pre-commit check reported 0 committed files relative to HEAD |
| Browser audit `http://127.0.0.1:3004/id/akademik#jadwal-perkuliahan` | Passed; H1 `Akademik`, anchor title `Jadwal Perkuliahan`, anchor visible on desktop and mobile |
| Browser crawl of checked internal public menu links | Passed; all checked links returned 200 |

## Untested areas

- Did not run full Playwright E2E suite.
- Did not implement category filtering on `/dokumen`; resource-specific document lists still depend on a later query/template task.

## Risks and follow-ups

- `/profil` currently renders `Sejarah` as its H1. It should get a dedicated profile landing or be removed from sitemap/direct route expectations in a separate lease.
- `/dokumen?kategori=...` still does not read the category query. The primary Akademik submenu no longer lands there, but related document CTAs need a future document-category filtering task.

## Requested shared changes

None.
