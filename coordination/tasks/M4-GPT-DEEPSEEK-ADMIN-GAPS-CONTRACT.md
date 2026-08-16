---
id: M4-GPT-DEEPSEEK-ADMIN-GAPS-CONTRACT
milestone: M4
title: Reconcile SiteSetting schema and home-nav domain layer for pending DeepSeek admin-UI work
risk: medium
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: main
base_sha: efa2984083e43b5e5ef10ed40c150215be54a3ce
depends_on: []
spec_refs:
  - docs/18-beranda-editable.md
allowed_paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "src/contracts/home-nav.ts"
  - "src/features/home-nav/**"
  - "coordination/handoffs/M4-GPT-DEEPSEEK-ADMIN-GAPS-CONTRACT-gpt.md"
readonly_paths:
  - "AGENTS.md"
  - "docs/**"
  - "coordination/tasks/M4-GPT-DEEPSEEK-ADMIN-GAPS-CONTRACT.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
contracts:
  - src/contracts/home-nav.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run prisma:validate
  - npm run build
token_class: M
status: draft
---

## Intent

DeepSeek built a batch of admin-UI features (Logo picker, Menu Builder,
Quick Link, Akademik, Taksonomi, Pengguna) on branch
`deepseek/continue-fuspi-20260805` (base `3d3e22c`), which is now 19 commits
behind current `main` (`efa2984`). A snapshot of that dirty work is preserved
in commit `419e94c` on branch `ai/claude/review-dirty-work-20260817` for
reference — it is **not** meant to be merged as-is.

Two hotspot areas overlap with work already merged into `main` since the
DeepSeek branch diverged, and both are GPT-owned per AGENTS.md, so DeepSeek
cannot resolve them itself:

1. **`prisma/schema.prisma` — `SiteSetting` model.** DeepSeek's branch adds
   `logoMediaId String?` + a `logo Media?` relation (migration
   `20260811052302_add_site_setting_logo`, generated against the *old* base).
   Since then, `main` merged `f1d533a fix: add home video facility migration`
   (`20260810002000_home_video_facility_site_media`), which also extends
   `SiteSetting`. These two additive migrations were never generated against
   the same base and need to be reconciled into one coherent migration
   sequence on top of current `main`.

2. **`src/features/home-nav/{administration,admin-query,admin-detail,public-query}.ts`.**
   DeepSeek's branch adds `mutateMenuItem` / `mutateQuickLink` (CREATE/UPDATE/
   DELETE, following the existing `mutateExternalLink` pattern) plus `MENU_ITEM`
   / `QUICK_LINK` cases in the admin query/detail layer, and a `logo` field on
   `getPublicSiteSetting`. Since DeepSeek's branch diverged, `main` merged
   `9fd0682 feat(m4): preserve backend domain expansion`, which touched these
   same files. The two versions have not been diffed against each other.

Reference implementation for both items lives in
`src/features/home-nav/administration.ts` (and siblings) and
`prisma/schema.prisma` on `deepseek/continue-fuspi-20260805` /
`ai/claude/review-dirty-work-20260817` — diff those against current `main` to
see exactly what DeepSeek added.

## Acceptance criteria

- `prisma/schema.prisma` has one coherent `SiteSetting.logoMediaId` addition
  (naming/shape decided by GPT) that applies cleanly after
  `20260810002000_home_video_facility_site_media`, with a fresh migration
  generated from current `main`'s schema state.
- `src/contracts/home-nav.ts` exposes the equivalent `logoMediaId` /
  `logo: PublicMediaViewSchema.nullable()` fields DeepSeek's UI expects.
- `src/features/home-nav/administration.ts`, `admin-query.ts`,
  `admin-detail.ts`, `public-query.ts` contain `mutateMenuItem`,
  `mutateQuickLink`, their query/detail cases, and the `logo` field on
  `getPublicSiteSetting`, reconciled with whatever `backend domain expansion`
  already changed in those files — no functionality from either side silently
  dropped.
- All `acceptance_commands` pass on top of current `main`.
- Handoff documents the final shape of the reconciled contract/schema so
  DeepSeek can rebase its admin-UI branch on top without guessing.

## Handoff requirements

Use `coordination/handoffs/TEMPLATE.md` and commit it as
`coordination/handoffs/M4-GPT-DEEPSEEK-ADMIN-GAPS-CONTRACT-gpt.md` with the
task. Note explicitly which of DeepSeek's two migrations/fields were kept,
renamed, or dropped, and why.
