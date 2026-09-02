---
id: M4-GPT-PUBLIC-LINKS-THREE-PRODI
milestone: M4
owner: gpt
reviewer: user
tester: gpt
base_branch: feat/lecturer-portal-complaint-booking
base_sha: 84ac7f8f122d9db8e3abe9e16503dedc78ebe317
allowed_paths:
  - "coordination/tasks/M4-GPT-PUBLIC-LINKS-THREE-PRODI.md"
  - "coordination/handoffs/M4-GPT-PUBLIC-LINKS-THREE-PRODI-gpt.md"
  - "e2e/experience/shell.spec.ts"
  - "e2e/m4/public-shell-hardening.spec.ts"
  - "messages/ar.json"
  - "messages/en.json"
  - "messages/id.json"
  - "prisma/seed.ts"
  - "src/app/[locale]/(public)/akademik/page.tsx"
  - "src/app/[locale]/(public)/calon-mahasiswa/page.tsx"
  - "src/app/[locale]/(public)/dosen/page.tsx"
  - "src/app/[locale]/(public)/penelitian/page.tsx"
  - "src/app/[locale]/(public)/pengabdian/page.tsx"
  - "src/components/public/brand-mark.tsx"
  - "src/components/public/desktop-nav.tsx"
  - "src/components/public/mobile-nav.tsx"
  - "src/components/public/nav-items.test.ts"
  - "src/components/public/nav-items.ts"
  - "src/components/public/services-section.tsx"
  - "src/components/public/shell/utility-link.tsx"
  - "src/components/public/site-footer.tsx"
  - "src/components/public/site-header.tsx"
  - "src/components/public/top-bar.tsx"
  - "src/config/institution.test.ts"
  - "src/config/institution.ts"
  - "src/contracts/academic.ts"
  - "src/contracts/home-nav.ts"
  - "src/features/academic/people.ts"
  - "src/features/home-nav/domain.ts"
  - "src/features/search/domain.ts"
  - "src/test/fixtures.test.ts"
  - "src/test/identity-contracts.test.ts"
  - "tests/foundation/fixtures/study-program.ts"
  - "tests/m4/contracts/academic-directory-contracts.test.ts"
  - "tests/m4/contracts/home-nav-contracts.test.ts"
  - "tests/m4/runtime/academic-people.integration.test.ts"
  - "tests/m4/ui/public-shell-hardening.test.tsx"
  - "tests/platform/lecturer-portal/lecturer-csv-import.test.ts"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/migrations/**"
  - "src/generated/**"
  - "next-env.d.ts"
readonly_paths:
  - "docs/README.md"
  - "docs/24-implementation-plan-multi-model.md"
contracts:
  - "src/config/institution.ts"
  - "src/contracts/academic.ts"
  - "src/contracts/home-nav.ts"
acceptance_commands:
  - "npm run lint"
  - "npm run typecheck"
  - "npm run test"
  - "npm run prisma:validate"
  - "npm run build"
  - "npx playwright test e2e/experience/shell.spec.ts --project=chromium --workers=1"
  - "git diff --check"
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-LINKS-THREE-PRODI.md TASK_BASE=84ac7f8f122d9db8e3abe9e16503dedc78ebe317 npm run check:scope"
risk: medium
token_class: M
status: active
---

# Public links and three-prodi correction

Update the public FUSPI service links, replace the placeholder footer mark with
the UIN logo asset, and align the public study-program contract to the current
three active programs: IAT, IH, and AFI.
