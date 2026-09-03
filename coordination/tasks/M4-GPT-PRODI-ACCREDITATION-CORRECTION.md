---
id: M4-GPT-PRODI-ACCREDITATION-CORRECTION
milestone: M4
title: Correct study-program accreditation values
risk: low
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: b24437a
depends_on:
  - M4-GPT-PRODI-CMS-ADMIN-NAV
allowed_paths:
  - prisma/seed.ts
  - tests/m4/contracts/study-program-accreditation.test.ts
  - coordination/tasks/M4-GPT-PRODI-ACCREDITATION-CORRECTION.md
  - coordination/handoffs/M4-GPT-PRODI-ACCREDITATION-CORRECTION-gpt.md
  - coordination/ownership.yml
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/schema.prisma
  - prisma/migrations/**
  - src/generated/**
  - src/contracts/**
  - src/features/**
  - src/app/**
  - src/components/**
status: active
---

# Accreditation correction

Persist the owner-confirmed accreditation values for the three active FUSPI
study programs: IAT = Unggul, IH = B, AFI = B. Do not infer validity dates.
