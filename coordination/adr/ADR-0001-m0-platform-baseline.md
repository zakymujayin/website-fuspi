# ADR-0001: M0 platform baseline

- Status: accepted
- Date: 2026-07-12
- Owner: GPT / integrator

## Decision

Gunakan Next.js 16 App Router, TypeScript strict, Node 22 untuk CI, Tailwind CSS 4, shadcn base-nova, next-intl dengan route wajib `[locale]`, Prisma 7 + MariaDB driver adapter, Auth.js database-session models, Vitest, dan Playwright.

Root layout, dependency lockfile, Prisma, proxy, CI, contract lintas lane, dan file governance merupakan hotspot serial milik GPT/integrator. UI primitives/token merupakan hotspot serial milik Claude setelah M0.

## Consequences

- Ketiga lane memakai type/schema dan lockfile yang sama.
- Locale Arab harus mengubah `dir` menjadi `rtl`; logical CSS adalah default.
- Tidak ada migration/seed ke production dari feature branch.
- Fitur yang bergantung capability Hostinger belum boleh dinyatakan siap deploy sebelum bukti pada dokumen 25 lengkap.
