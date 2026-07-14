# 25 — Foundation & VPS Capability Record

Baseline M0 tanggal 12 Juli 2026 sebelumnya memakai MariaDB/Hostinger. ADR-0003 tanggal
15 Juli 2026 mengganti kontrak aktif menjadi PostgreSQL di VPS. Bukti lama tetap sah sebagai
rekaman historis untuk kode saat itu, tetapi tidak dapat dipakai untuk menutup gate database atau
deployment yang baru.

## Baseline aktif

| Area | Keputusan | Bukti/gate |
|---|---|---|
| Runtime | Node `>=20.9`, CI Node 22 | `package.json`, workflow CI |
| Web | Next.js 16.2.6, App Router, standalone | lint, typecheck, build, E2E |
| Locale | `id` default; `id/en` LTR; `ar` RTL | Playwright desktop/mobile |
| UI | Tailwind CSS 4 + shadcn, semantic token, RTL | component dan accessibility tests |
| Database | Prisma 7.8, provider `postgresql`, adapter `@prisma/adapter-pg` | fresh migration, double seed, integration tests |
| Test | ESLint, TypeScript strict, Vitest, Playwright | `ci:merge`, database integration, E2E |
| Koordinasi | task manifest, ownership lease, scope check | `coordination/**`, `.github/**` |

`prisma/schema.prisma` adalah kontrak implementasi v1. Perubahan schema/provider tetap melalui
task GPT, ADR, migration baru, dan database test. Moodle kelak memakai database/role terpisah.

## Capability VPS yang wajib dibuktikan

| Capability | Status | Bukti yang dibutuhkan |
|---|---|---|
| Node 22 + Next standalone sebagai non-root | `PENDING VPS` | versi, unit/container config, restart dan rollback |
| PostgreSQL major produksi dan role non-superuser | `LOCAL PG16 VERIFIED; STAGING PENDING` | versi target, grants, TLS, migration database kosong |
| Migration + double seed | `LOCAL EVIDENCE REQUIRED PER CHANGE` | deploy baseline, seed dua kali, count/checksum stabil |
| `SERIALIZABLE`, advisory/row lock, retry | `PENDING FEATURE TEST` | booking/sequence paralel pada staging |
| Full-text `tsvector` + GIN | `PENDING SEARCH TASK` | migration index dan ranking ID/EN/AR |
| Public persistent filesystem | `PENDING VPS` | upload, restart/redeploy, file tetap tersedia |
| Private dan PPKS filesystem | `PENDING VPS` | tidak dapat diakses HTTP; permission dan restore lulus |
| Sharp/native binary | `LOCALLY VERIFIED` | transform pada artifact/image produksi |
| SMTP TLS + outbox worker | `PENDING VPS` | SPF/DKIM/DMARC, retry, lock dan idempotency |
| TLS/reverse proxy/body limit | `PENDING VPS` | forwarded header trust, upload limit, headers |
| Database/storage backup restore | `PENDING VPS` | restore drill ke lingkungan kosong dan smoke test |
| Monitoring | `PENDING VPS` | CPU, RAM, disk/inode, PostgreSQL, app error, certificate |

Status `PENDING VPS` tidak boleh ditutup dengan asumsi lokal. Catat versi, command, timestamp,
hasil, dan artifact bukti dari staging yang topologinya sama dengan produksi.

## Dependency advisory

Jalankan `npm audit` pada setiap dependency contract. Jangan memakai `npm audit fix --force`
tanpa ADR dan regression test. Auth.js masih versi beta yang dipin; upgrade memerlukan review
session/cookie/CSRF dan database adapter. Advisory yang tidak dapat ditutup segera harus memiliki
owner, dampak runtime, mitigasi, dan tenggat.

## Gate lokal minimum

```bash
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run prisma:seed
npm run ci:merge
npm run test:e2e
```

Gate database dijalankan pada PostgreSQL kosong dengan major yang sama seperti target produksi.
SQLite, mock adapter, atau bukti MariaDB lama tidak menggantikannya.
