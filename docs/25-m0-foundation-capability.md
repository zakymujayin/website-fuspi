# 25 — M0 Foundation & Capability Record

Tanggal verifikasi lokal: 12 Juli 2026. Dokumen ini mencatat apa yang sudah terbukti di repo dan apa yang masih memerlukan bukti dari akun Hostinger. Status `PENDING HOSTINGER` bukan izin untuk berasumsi; operator wajib mengisinya sebelum M7/deploy.

## Baseline yang dibekukan

| Area | Keputusan M0 | Bukti/gate |
|---|---|---|
| Runtime | Node `>=20.9`, CI Node 22 | `package.json`, `.github/workflows/ci.yml` |
| Web | Next.js 16.2.6, App Router, standalone output | `npm run build` lulus |
| Locale | `id` default; `id/en` LTR; `ar` RTL | 6 tes Playwright desktop/mobile lulus |
| UI | Tailwind CSS 4 + shadcn `base-nova`, semantic token, RTL registry | `components.json`, `globals.css` |
| Database | Prisma 7.8, provider `mysql` untuk MariaDB, driver adapter MariaDB | format, validate, generate lulus |
| Test | ESLint, TypeScript strict, Vitest, Playwright | `ci:quick`, unit, build, E2E lulus lokal |
| Koordinasi | task manifest, ownership/lease, scope check, PR template, CODEOWNERS | `coordination/**`, `.github/**` |

Skema `prisma/schema.prisma` adalah kontrak implementasi fase v1. Model fase 2 `Curriculum/Course` tetap tidak dimaterialisasikan sesuai scope dokumen 24. Perubahan skema setelah M0 hanya dilakukan GPT/integrator melalui ADR dan migration terpisah.

## Capability Hostinger

| Capability | Status | Bukti yang masih dibutuhkan |
|---|---|---|
| Menjalankan Node 22 dan proses Next standalone | `PENDING HOSTINGER` | screenshot/CLI versi Node, start command, restart policy |
| MariaDB dan hak membuat index/migration | `PENDING HOSTINGER` | versi server, user grants, migration pada DB staging kosong |
| Transaksi `SERIALIZABLE` + retry deadlock | `PENDING HOSTINGER` | integration test booking paralel pada staging |
| `FULLTEXT` MariaDB | `PENDING HOSTINGER` | create/query index pada tabel spike staging |
| Public persistent filesystem | `PENDING HOSTINGER` | upload, restart app, file tetap tersedia dan dapat diakses |
| Private filesystem di luar web root | `PENDING HOSTINGER` | file tidak dapat diakses via HTTP dan tetap ada setelah restart |
| Sharp/native binary | `LOCALLY VERIFIED` | ulangi transform gambar pada runtime Hostinger |
| PDF.js/worker | `PACKAGE VERIFIED` | render PDF di browser staging dengan CSP final |
| SMTP TLS | `PENDING HOSTINGER` | kirim ke mailbox uji; periksa SPF/DKIM/DMARC dan retry |
| Cron/scheduler | `PENDING HOSTINGER` | job outbox per menit dan cleanup terkontrol |
| TLS, reverse proxy, body limit | `PENDING HOSTINGER` | header, max upload, forwarded IP/protocol dari staging |

Jika Hostinger gagal pada Node/native module/private storage/cron, jangan mengubah security contract. Eskalasi ADR deployment: VPS/container atau object storage/private worker terpisah.

## Advisory dependency

Audit setelah bootstrap tidak lagi memiliki severity high/critical. Auth.js beta saat verifikasi mengunci peer Nodemailer 7 yang terdampak advisory, sehingga Auth.js/Nodemailer sengaja belum dipasang pada M0. Model adapter database sudah tersedia; GPT wajib membuat dependency contract M2 setelah kombinasi versi aman dan kompatibel tersedia. Advisory moderate yang tersisa berasal dari rantai Next/PostCSS dan Prisma dev tooling. Jalankan `npm audit` pada setiap dependency PR; jangan memakai `npm audit fix --force` tanpa ADR dan regression test.

## Perintah gate M0

```bash
cp .env.example .env.local
npm ci
npm run prisma:generate
npm run ci:merge
npx playwright install chromium
npm run test:e2e
```

`DATABASE_URL` harus tersedia untuk Prisma config. Gate seed/migration terhadap MariaDB nyata dipindahkan ke awal M1 karena M0 belum diberi kredensial database lokal/staging.
