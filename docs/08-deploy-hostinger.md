# 08 — Panduan Deploy di Hostinger Business

Paket Business mendukung aplikasi Node.js (sampai 5 app) dengan build & runtime dikelola Hostinger. Alur: push ke GitHub → import di hPanel → Hostinger build otomatis tiap push.

## Prasyarat

- Repo aplikasi sudah ada di GitHub (boleh privat).
- `next.config.ts` memakai `output: "standalone"` (lihat `01`).
- **Node.js 20.9+ (disarankan 22 LTS)** — Next.js 16 menolak berjalan di Node 18. **Verifikasi di hPanel bahwa versi Node yang tersedia memenuhi ini sebelum mulai membangun.** Bila Hostinger hanya menyediakan Node 18, hubungi support atau pertimbangkan VPS.
- Skrip di `package.json`:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "postinstall": "prisma generate"
  }
  ```

## Langkah 1 — Buat database MariaDB di hPanel

1. hPanel → **Databases → MySQL Databases** (MariaDB).
2. Buat database baru, catat: nama DB, username, password, host.
3. Susun `DATABASE_URL`:
   ```
   mysql://USER:PASSWORD@HOST:3306/NAMA_DB
   ```
   Host biasanya `localhost` bila DB & app satu server; bila beda, pakai host yang diberikan Hostinger. Untuk karakter khusus pada password, URL-encode.

## Langkah 2 — Siapkan folder uploads

1. hPanel → **File Manager** → masuk `domains/fuspi.uinbanten.ac.id/public_html/`.
2. Buat folder `uploads`. Ini tujuan upload persisten (lihat `07`).

## Langkah 3 — Deploy aplikasi Node.js

1. hPanel → **Websites → Add Website → Node.js Apps**.
2. Pilih **Import Git Repository**, authorize GitHub, pilih repo & branch (`main`).
3. Framework akan terdeteksi otomatis sebagai Next.js. Periksa build settings:
   - **Build command:** `npm run build`
   - **Output/entry:** biarkan sesuai deteksi Next.js (standalone).
   - **Node.js version:** pilih versi LTS yang didukung (mis. Node 20/22).
4. Isi **Environment Variables** (dari `.env`, JANGAN commit `.env`):
   ```
   DATABASE_URL=...
   AUTH_SECRET=...            (openssl rand -base64 32)
   AUTH_URL=https://fuspi.uinbanten.ac.id
   UPLOAD_DIR=/home/{username}/domains/fuspi.uinbanten.ac.id/public_html/uploads
   UPLOAD_PUBLIC_URL=https://fuspi.uinbanten.ac.id/uploads
   UPLOAD_MAX_SIZE=5242880
   ```
   Ganti `{username}` dengan username hosting Anda (lihat di File Manager path).
5. Klik **Deploy**. Hostinger menjalankan `npm install` + build otomatis (npm tidak bisa dijalankan via SSH pada Business, tapi berjalan otomatis saat deploy).

## Langkah 4 — Migrasi & seed database

`prisma migrate` tidak jalan otomatis di build Hostinger. Dua opsi:

**Opsi A (disarankan) — migrasi dari lokal ke DB produksi:**
Jalankan dari komputer Anda dengan `DATABASE_URL` produksi (pastikan DB Hostinger mengizinkan koneksi remote, atau lakukan lewat tunnel):
```bash
DATABASE_URL="mysql://...produksi..." npx prisma migrate deploy
DATABASE_URL="mysql://...produksi..." npx prisma db seed
```

**Opsi B — bila remote DB tertutup:**
Ekspor SQL dari `prisma migrate diff` / `prisma migrate deploy` lokal, lalu impor lewat **phpMyAdmin** di hPanel. Seed data awal (admin, prodi, setting) via SQL manual atau lewat halaman setup sekali pakai yang dibuat sementara.

> Setelah rilis, tiap perubahan skema: buat migrasi di lokal (`prisma migrate dev`), commit, lalu jalankan `prisma migrate deploy` ke DB produksi sebelum/seiring deploy kode.

## Langkah 5 — Domain & HTTPS

- Petakan domain/subdomain `fuspi.uinbanten.ac.id` ke aplikasi (hPanel → domain). SSL Let's Encrypt otomatis pada web hosting Hostinger.
- Set `AUTH_URL` sama persis dengan domain final (penting untuk Auth.js).

## Langkah 6 — Verifikasi pasca-deploy

Checklist:
- [ ] Halaman publik `/` tampil.
- [ ] Login `/id/login` berhasil dengan admin seed dan redirect mempertahankan locale.
- [ ] Buat 1 berita → muncul di `/berita`.
- [ ] Upload gambar → tampil, URL di `/uploads/...`.
- [ ] **Redeploy** (push commit kecil) → gambar tadi **masih ada** (uji persistensi).
- [ ] Role EDITOR tidak bisa buka `/id/admin/pengaturan`; ADMIN/PETUGAS tidak bisa membuka detail PPKS.

## Redeploy berikutnya

Karena terhubung GitHub, tiap `git push` ke branch `main` memicu rebuild otomatis. Untuk memaksa redeploy tanpa perubahan kode: hPanel → Website Dashboard → **Settings and redeploy**.

## Catatan performa

- Jika muncul peringatan **Max Process usage** tinggi untuk Next.js di web hosting, Hostinger punya optimasi platform yang mengurangi jumlah proses runtime — deployment baru menerapkannya otomatis; untuk app lama, aktifkan dari Website Dashboard → Deployments.
- Pantau grafik CPU/RAM/I-O di dashboard; bila mendekati batas paket, pertimbangkan upgrade ke Cloud.

## Ringkasan variabel lingkungan produksi

| Variabel | Contoh |
|---|---|
| `DATABASE_URL` | `mysql://user:pass@localhost:3306/fuspi_db` |
| `AUTH_SECRET` | string acak 32+ byte |
| `AUTH_URL` | `https://fuspi.uinbanten.ac.id` |
| `UPLOAD_DIR` | `/home/uXXXX/domains/fuspi.uinbanten.ac.id/public_html/uploads` |
| `UPLOAD_PUBLIC_URL` | `https://fuspi.uinbanten.ac.id/uploads` |
| `UPLOAD_MAX_SIZE` | `5242880` |
| `UPLOAD_PRIVATE_DIR` | `/home/uXXXX/domains/fuspi.uinbanten.ac.id/private_uploads` |
| `PPKS_PRIVATE_DIR` | `/home/uXXXX/domains/fuspi.uinbanten.ac.id/ppks_private` |
| `PPKS_ENCRYPTION_KEY` | base64 key 32 byte; simpan terpisah dari backup data |
| `TOKEN_HMAC_SECRET` | string acak 32+ byte, berbeda dari AUTH_SECRET |
| `IP_HASH_SECRET` | string acak 32+ byte, berbeda dari secret lain |
| `SMTP_HOST` | `smtp.hostinger.com` |
| `SMTP_PORT` / `SMTP_SECURE` | `465` / `true` |
| `SMTP_USER` / `SMTP_PASSWORD` | akun SMTP Hostinger |
| `MAIL_FROM` | `FUSPI UIN Banten <noreply@fuspi.uinbanten.ac.id>` |
| `NEXT_PUBLIC_GA_ID` | ID GA4; kosong untuk mematikan analytics |

## Cron produksi

- Jalankan worker transactional outbox setiap 5 menit melalui cron Hostinger.
- Worker menggunakan lock database agar dua proses tidak mengirim pesan yang sama, memilih record `PENDING/RETRY` yang jatuh tempo, dan menghormati idempotency key.
- Booking selesai dihitung saat query; tidak memerlukan cron status terpisah.
