# Handoff — M4-GPT-HISTORY-PAGE-NARRATIVE — gpt

- Branch: `ai/gpt/m4-history-page-narrative`
- Base SHA: `c16133d5841886fb0d5cade820c39aff5fb11096`
- Head SHA: 574294b

## Result

Replaced the public history page placeholder with a FUSPI-specific narrative
based on owner-provided facts only. The page now states that FUSPI was
established on 1 July 2026, explains the institutional separation from Fakultas
Ushuluddin dan Adab into FUSPI and Fakultas Adab dan Humaniora, and presents
Dr. Masykur, M.Hum. as the first dean in a narrative note.

After owner visual review, the page was refined again to remove the large
highlight panel, two boxed fact cards, and dean portrait aside. The final page
uses a structured article layout: intro, narrative sections, and a compact
chronology.

The external profile page was used only as a visual/content-structure reference.
No public copy, identity, program list, contact data, or claims were copied from
that source.

## Files Changed

- `src/app/[locale]/(public)/profil/sejarah/page.tsx` — replaced invented
  placeholder milestones with ID/EN/AR localized FUSPI history copy; refined
  the page into a text-led narrative layout and removed the portrait block.
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
| `npm run test` | pass; 116 files, 1404 tests |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-HISTORY-PAGE-NARRATIVE.md TASK_BASE=HEAD~1 npm run check:scope` | blocked by sandbox `spawnSync git EPERM`; rerun with escalation passed, 4 changed files within lease |
| `npm run build` | pass; `/id/profil/sejarah`, `/en/profil/sejarah`, and `/ar/profil/sejarah` generated as SSG |
| Browser screenshot `http://127.0.0.1:3004/id/profil/sejarah` | pass; desktop and mobile show narrative layout with no main-content image |

## Untested areas

- The owner-supplied replacement dean photo for the homepage welcome section
  was not applied in this task because `src/components/public/dean-welcome-section.tsx`,
  `src/lib/data/dummy-dean.ts`, and `public/images/leadership/dekan-masykur.webp`
  are readonly in the active history task manifest.

## Risks and follow-ups

- Public page copy now relies on owner-provided historical facts. If an official
  rector decree number or faculty statute should be cited, add it through a
  future content task rather than guessing.
- Apply the owner-supplied portrait to the Dean Welcome/CMS media flow in a
  separate task or CMS update with an asset/media lease.
- This branch currently starts from `feat/lecturer-portal-complaint-booking`,
  matching the provided working directory, not from `origin/integration/m4-features`.

## Requested shared changes

None.
