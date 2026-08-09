# 08 — Panduan Deploy VPS + PostgreSQL

> Nama file lama dipertahankan agar tautan dokumentasi tidak putus. Hostinger Business bukan
> lagi target deployment. Keputusan aktif adalah VPS dan PostgreSQL melalui ADR-0003.

## Topologi produksi

- Satu VPS aplikasi atau dua node bila database dipisahkan.
- Node.js 22 LTS menjalankan artifact Next.js `standalone` sebagai user non-root.
- Nginx/Caddy menangani TLS, reverse proxy, batas request, dan file upload publik.
- PostgreSQL 17+ memakai database dan role khusus FUSPI; aplikasi bukan superuser.
- `/srv/fuspi/shared` menyimpan public/private/PPKS upload dan tidak diganti saat deploy.
- systemd atau container orchestrator menjaga proses aplikasi dan worker outbox.
- Backup database, public upload, private upload, PPKS terenkripsi, serta encryption key
  disimpan dan diuji pulih secara terpisah.

Staging harus memakai major PostgreSQL, filesystem layout, reverse proxy, dan start command
yang sama dengan produksi.

## 1. Provisioning PostgreSQL

Contoh dijalankan oleh administrator database; jangan memakai role `postgres` pada aplikasi:

```sql
CREATE ROLE fuspi_app LOGIN PASSWORD 'generated-secret';
CREATE DATABASE fuspi_production OWNER fuspi_app ENCODING 'UTF8';
REVOKE ALL ON DATABASE fuspi_production FROM PUBLIC;
GRANT CONNECT, TEMPORARY ON DATABASE fuspi_production TO fuspi_app;
```

Batasi `pg_hba.conf` ke host aplikasi, gunakan SCRAM-SHA-256, aktifkan TLS, dan jangan membuka
port 5432 ke internet umum. Bila database satu mesin, bind ke loopback/private interface.

`DATABASE_URL` produksi:

```bash
DATABASE_URL="postgresql://fuspi_app:URL_ENCODED_PASSWORD@DB_PRIVATE_HOST:5432/fuspi_production?connection_limit=20&sslmode=verify-full"
```

Gunakan CA yang benar untuk `verify-full`. `sslmode=require` hanya boleh menjadi transisi
terkendali karena mengenkripsi koneksi tanpa memverifikasi sertifikat pada adapter saat ini.

## 2. User dan direktori aplikasi

```text
/srv/fuspi/
├── releases/<sha>/
├── current -> releases/<sha>/
└── shared/
    ├── public/uploads/
    ├── private/uploads/
    └── ppks/
```

Service user FUSPI memiliki akses minimum. Reverse proxy hanya dapat membaca
`shared/public/uploads`; private dan PPKS tidak pernah dipetakan sebagai static location.

## 3. Build dan artifact

CI wajib menjalankan `npm ci`, lint, typecheck, Prisma validate, unit/integration tests,
production build, dan pemeriksaan migration sebelum membuat artifact. Deploy hanya commit yang
sudah lulus gate integration.

Artifact minimal berisi output `standalone`, `.next/static`, `public`, Prisma generated client,
dan migration yang telah direview. Dependency native seperti Sharp dibangun untuk OS/arsitektur
runtime yang sama atau melalui image container yang identik.

## 4. Environment produksi

Simpan secret di environment file berpermission `0600` milik service user atau secret manager,
bukan di Git maupun unit file yang dapat dibaca umum.

| Variabel | Kontrak |
|---|---|
| `DATABASE_URL` | PostgreSQL; remote wajib TLS; pool eksplisit |
| `AUTH_SECRET` | acak minimal 32 byte |
| `AUTH_URL` | origin final HTTPS |
| `UPLOAD_DIR` | `/srv/fuspi/shared/public/uploads` |
| `UPLOAD_PUBLIC_URL` | `https://fuspi.uinbanten.ac.id/uploads` |
| `UPLOAD_PRIVATE_DIR` | `/srv/fuspi/shared/private/uploads` |
| `PPKS_PRIVATE_DIR` | `/srv/fuspi/shared/ppks` |
| `PPKS_ENCRYPTION_KEY` | key 32 byte; backup terpisah dari data |
| `TOKEN_HMAC_SECRET` / `IP_HASH_SECRET` | secret berbeda satu sama lain dan dari Auth |
| `SMTP_*` / `MAIL_FROM` | kredensial SMTP institusional/transaksional |

## 5. Migration dan deployment atomik

1. Backup dan verifikasi koneksi database.
2. Upload artifact ke `/srv/fuspi/releases/<sha>`.
3. Jalankan `npx prisma migrate deploy` menggunakan environment produksi.
4. Seed hanya pada provisioning awal atau saat seed idempotent memang menjadi bagian rilis.
5. Alihkan symlink `current` secara atomik dan restart service.
6. Jalankan smoke test publik, login, authorization, upload, dan health check.
7. Simpan release sebelumnya untuk rollback aplikasi. Migration database memerlukan prosedur
   forward-fix; jangan mengedit migration yang sudah diterapkan.

Migration tidak dijalankan secara otomatis oleh request aplikasi dan tidak memakai `migrate dev`
di staging/produksi.

### Catatan deploy `main` 2026-08-10

Commit produksi yang sudah dipush ke GitHub `main`:

```text
f1d533a46c38115a7e24a180f337af9caffcc30d
```

Server production cukup melakukan pull pada clone aplikasi FUSPI, yaitu folder repo
`website-fuspi`. Folder kerja lokal agent seperti `fuspi-claude`, `fuspi-deepseek`,
`fuspi-gpt`, `fuspi-integration`, dan `/tmp/fuspi-*` bukan bagian deploy production.

Urutan minimal pada server production:

```bash
cd /path/ke/website-fuspi
git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

Setelah build berhasil, restart process manager yang menjalankan aplikasi, misalnya service
systemd, PM2, atau container sesuai konfigurasi server. Jangan gunakan `prisma migrate dev` di
production. Rilis ini menambahkan migration:

```text
prisma/migrations/20260810002000_home_video_facility_site_media/migration.sql
```

Migration tersebut membuat tabel `HomeVideo`, `Facility`, translation terkait, enum
`FacilityType`, serta kolom media pada `SiteSetting`. Karena itu `npx prisma migrate deploy`
wajib dijalankan sebelum aplikasi production melayani traffic baru.

## 6. Reverse proxy dan process manager

- Teruskan host/protocol/IP hanya dari proxy tepercaya.
- Terapkan TLS modern, HSTS setelah domain stabil, security headers, request timeout, dan ukuran
  body sesuai kontrak upload.
- Jalankan web dan worker outbox sebagai unit berbeda dengan restart policy dan resource limit.
- Batasi endpoint worker dengan command internal/queue; jangan membuka cron secret di URL publik.

## 7. Backup dan restore

- Database: `pg_dump` format custom setiap hari dan backup fisik/PITR sesuai RPO institusi.
- Upload: snapshot incremental public/private/PPKS.
- Key PPKS: backup terenkripsi terpisah; kehilangan key berarti kehilangan data.
- Salin backup ke lokasi/offsite account berbeda dan terapkan retensi.
- Lakukan restore drill ke PostgreSQL kosong dan storage kosong sebelum go-live, lalu berkala.

Backup dianggap valid hanya setelah restore dan smoke test berhasil.

## 8. Checklist pasca-deploy

- [ ] Migration status bersih dan aplikasi memakai role non-superuser.
- [ ] `/id`, `/en`, `/ar` serta RTL Arab benar.
- [ ] Login, logout, password change, expiry, dan revocation lulus.
- [ ] ADMIN/EDITOR/PETUGAS/SATGAS_PPKS dibatasi server-side sesuai scope.
- [ ] Upload publik bertahan setelah redeploy.
- [ ] Private/PPKS tidak dapat diakses langsung melalui HTTP.
- [ ] Outbox retry/idempotency berjalan dari worker.
- [ ] Backup database dan ketiga kelas storage berhasil dipulihkan.
- [ ] Monitoring CPU, RAM, disk, inode, PostgreSQL, error rate, dan certificate expiry aktif.

## Cutover data MariaDB bila pernah terisi

Repo masih pre-production sehingga migration PostgreSQL baru menjadi baseline aktif. Bila ada
database MariaDB berisi data nyata di luar repo, jangan menjalankan SQL migration PostgreSQL di
atasnya. Gunakan export → transform tipe/enum/timestamp → import melalui Prisma/ETL → hitung dan
checksum ulang → sampling relasi/media → freeze MariaDB read-only → cutover. Simpan laporan
rekonsiliasi sebagai bukti go-live.
