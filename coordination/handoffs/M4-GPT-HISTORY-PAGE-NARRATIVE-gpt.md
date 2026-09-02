# Handoff — M4-GPT-HISTORY-PAGE-NARRATIVE — gpt

- Branch: `ai/gpt/m4-history-page-narrative`
- Base SHA: `c16133d5841886fb0d5cade820c39aff5fb11096`
- Head SHA: final branch commit after this handoff is committed

## Result

Replaced the public history page placeholder with a FUSPI-specific narrative
based on owner-provided facts only. The page now states that FUSPI was
established on 1 July 2026, explains the institutional separation from Fakultas
Ushuluddin dan Adab into FUSPI and Fakultas Adab dan Humaniora, and presents
Dr. Masykur, M.Hum. as the first dean using the same portrait asset as the dean
welcome/pimpinan section.

The external profile page was used only as a visual/content-structure reference.
No public copy, identity, program list, contact data, or claims were copied from
that source.

## Files Changed

- `src/app/[locale]/(public)/profil/sejarah/page.tsx` — replaced invented
  placeholder milestones with ID/EN/AR localized FUSPI history copy; added
  an editorial intro panel and first-dean portrait block.
- `coordination/tasks/M4-GPT-HISTORY-PAGE-NARRATIVE.md` — task manifest with
  allowed paths, acceptance criteria, and verification commands.
- `coordination/ownership.yml` — added a non-overlapping active lease for this
  bounded history-page task.
- `coordination/handoffs/M4-GPT-HISTORY-PAGE-NARRATIVE-gpt.md` — this handoff.

## Contract/schema/migration impact

None. No Prisma schema, migration, dependency, API, auth, proxy, contract, or
global style changes.

## Verification

| Command | Result |
|---|---|
| `npx shadcn@latest info --json` | pass; project is Next.js 16.2.10, RSC, Tailwind v4, shadcn `base-nova` |
| `git diff --check` | pass |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run test` | pass; 115 files, 1388 tests |

## Untested areas

- No browser screenshot/Playwright visual pass was run because the task only
  changes one server-rendered static content page and the manifest acceptance
  commands did not require visual regression.

## Risks and follow-ups

- Public page copy now relies on owner-provided historical facts. If an official
  rector decree number or faculty statute should be cited, add it through a
  future content task rather than guessing.
- This branch currently starts from `feat/lecturer-portal-complaint-booking`,
  matching the provided working directory, not from `origin/integration/m4-features`.

## Requested shared changes

None.
