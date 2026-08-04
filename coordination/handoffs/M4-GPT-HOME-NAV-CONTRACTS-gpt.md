# M4-GPT-HOME-NAV-CONTRACTS handoff

- Task: `M4-GPT-HOME-NAV-CONTRACTS`
- Branch: `ai/gpt/m4-home-nav-contracts`
- Task base SHA: `675d50578589ab5794ba0c05f9c29b834457932d`
- Branch merge-base SHA: `25d4087ad7460a80d0736e110f60b2b6c6eab45c`
- Implementation head SHA: `a9ead28a489f6e1bdd154065a63520104cfb50c8`
- Model: GPT

## Summary

Frozen strict contracts for MenuItem, QuickLink, ExternalLink, HomeSlider,
HomeSection, Statistic, and SiteSetting. The contract covers ADMIN
list/detail/create/update/delete/reorder boundaries according to each
resource's lifecycle, explicit version intent, safe configured links and
PUBLIC assets, ID-required translation inputs, deterministic public
navigation trees, and an exhaustive public homepage snapshot.

The snapshot includes navigation layers, related/footer links, visible section
controls, hero slides, quick links, statistics, safe site/dean/video settings,
the five FUSPI study programs in mandatory IAT/IH/AFI/SAA/TASPI order, public
post groups, and resource-constrained Service/Partnership/Event/Testimonial
cards. Empty dynamic sections cannot be represented as visible, and section
item limits are enforced by the output contract.

## Files changed

- `src/contracts/home-nav.ts`
- `tests/m4/contracts/home-nav-contracts.test.ts`
- `coordination/handoffs/M4-GPT-HOME-NAV-CONTRACTS-gpt.md`

## API, schema, migration impact

- No transport, domain, schema, migration, dependency, configuration, seed, or
  UI file changed.
- The frozen contract deliberately exposes four existing Prisma gaps that must
  be corrected additively before the domain task:
  1. `HomeSectionKey` lacks `INTRO` and `SERVICE`.
  2. `Statistic` lacks a separate nullable `suffix`.
  3. `SiteSetting` lacks `videoPosterMediaId` and its PUBLIC Media relation.
  4. `MenuItem.pageId` lacks a foreign-key relation to Page, allowing dangling
     CMS navigation references.

## Verification

- `npx vitest run tests/m4/contracts/home-nav-contracts.test.ts`
  - PASS: 1 file, 9/9 tests.
- `npm run lint`
  - PASS, no issues.
- `npm run typecheck`
  - PASS.
- `npm run test`
  - PASS: 72 files, 967/967 tests.
- `git diff --check`
  - PASS.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-HOME-NAV-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope`
  - PASS: 2 implementation files within lease before the handoff was added.

## Tested contract invariants

- Exact 15-key editable homepage registry, including INTRO and SERVICE.
- Required ID translations and strict unknown-key rejection.
- No selector injection or dual MenuItem destination.
- SSRF/private-host URL rejection and CTA label/destination pairing.
- Complete dean identity/photo and video URL/poster pairs.
- Statistic numeric value separated from display suffix.
- SiteSetting-only optimistic version intent; structural section/settings
  deletion is forbidden.
- Valid locale fallback metadata with no storage/governance fields in public
  navigation.
- Public snapshot resource-family separation, visible-content completeness,
  item limits, deterministic ordering, and five-program identity order.

## Untested areas, risks, and follow-ups

- PostgreSQL, domain behavior, revision/audit, and transport tests belong to the
  follow-up schema correction and Home/Nav domain tasks.
- Recursive navigation depth and cycle checks are domain invariants; the public
  contract bounds child counts but the domain must enforce maximum depth and
  reject cycles transactionally.
- The public snapshot contract permits an empty truthful site. No fictional
  statistics, people, media, links, or institutional claims are provided.

## Requested contract or dependency change

No dependency change. Open one GPT-owned additive schema correction for the
four gaps above before `M4-GPT-HOME-NAV-DOMAINS`.
