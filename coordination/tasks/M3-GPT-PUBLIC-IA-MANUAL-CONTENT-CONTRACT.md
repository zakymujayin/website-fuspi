---
id: M3-GPT-PUBLIC-IA-MANUAL-CONTENT-CONTRACT
milestone: M3
owner: gpt
reviewer: claude-sonnet-5
tester: deepseek-v4-pro
base_sha: 311292f
allowed_paths:
  - "docs/README.md"
  - "docs/05-halaman-publik.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/10-menu-branding-referensi.md"
  - "docs/13-celah-fitur-keamanan-operasional.md"
  - "docs/16-audit-kelengkapan.md"
  - "docs/18-beranda-editable.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "coordination/handoffs/M3-GPT-PUBLIC-IA-MANUAL-CONTENT-CONTRACT-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
  - "messages/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/04-panel-admin.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/22-calon-mahasiswa-akademik-discoverability.md"
  - "docs/23-integrasi-sila-e-layanan.md"
  - "src/config/institution.ts"
  - "src/components/public/nav-items.ts"
  - "src/app/[locale]/(public)/page.tsx"
depends_on:
  - M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA-RETEST
contracts:
  - src/config/institution.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run prisma:validate
  - node scripts/check-fuspi-identity.mjs
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-PUBLIC-IA-MANUAL-CONTENT-CONTRACT.md TASK_BASE=origin/coordination/m3-gpt-public-ia-manual-content-contract-assignment npm run check:scope
risk: medium
token_class: M
status: assigned
---

# M3 GPT Public IA + Manual Content Contract

Record the owner's revised product direction before any additional public/admin UI task opens.
This task changes documentation and future acceptance scope only; it must not implement routes,
components, navigation code, CMS runtime, schema, seed data, or browser tests.

## Binding owner decisions

1. The new FUSPI site launches with newly entered content. Importing legacy articles, pages,
   media, metadata, or URLs is not part of v1 and is not a go-live gate.
2. News and other editorial content will be entered manually through the new CMS. Seed data must
   remain synthetic/neutral and must not invent leadership names, statistics, contact details,
   institutional history, or public claims.
3. The externally designated faculty site is an information-architecture reference only. Preserve
   useful content categories and menu discoverability, but do not copy its identity, public copy,
   people, contacts, statistics, programs, URLs, media, layout, theme, or visual composition.
4. The public product is FUSPI only. Public source/messages/metadata/fixtures must contain no
   external-faculty identity wording. Internal immutable governance/history files are not public
   copy and are outside this task.
5. The only study programs are, in order, IAT, IH, AFI, SAA, and TASPI.
6. Homepage content must include editable hero media, quick access, Dean welcome and photo,
   student/lecturer/staff counters, faculty introduction, programs, information/announcements,
   services, latest news, partnerships, academic highlights/opinion, video, agenda, and a final
   admissions CTA. Every section must handle empty/manual-content states safely.
7. Profile-family pages must receive deliberate templates, including faculty profile/history,
   vision-mission-goals-strategy, leadership/organization, lecturers, staff, facilities, and
   graduate profile. Do not leave them as generic rich-text pages.
8. The visual brief must be clearly different from the reference: contemporary editorial FUSPI,
   asymmetric but readable, image-led, restrained institutional palette, accessible typography,
   multilingual/RTL from the first implementation, and no generic university-template imitation.

## Deliverables

- Add one canonical public IA/design brief with menu tree, homepage narrative, page-template
  briefs, visual direction, content ownership, empty states, accessibility/RTL, and acceptance.
- Reconcile existing documentation so legacy-data import/reconciliation is removed from required
  scope and replaced by manual initial-content readiness.
- Preserve generic safe redirect infrastructure for future URL changes, but remove any requirement
  to populate it from a legacy site.
- Produce a durable handoff listing exact scope changes and follow-up Claude/DeepSeek tasks.

Run all acceptance commands, commit and push branch
`ai/gpt/m3-public-ia-manual-content-contract`, then stop. Do not merge or start UI implementation.
