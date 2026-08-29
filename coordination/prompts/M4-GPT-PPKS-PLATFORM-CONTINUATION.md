# Prompt untuk agen GPT — lanjutan platform PPKS dan adopsi kontrak

Salin seluruh berkas ini sebagai prompt awal. Tidak ada konteks percakapan sebelumnya yang perlu Anda ketahui selain yang tertulis di sini.

---

## Situasi

Branch `feat/lecturer-portal-complaint-booking` berisi 8 commit di atas `main`
(`ad220d6` sampai `369210c`), sudah di-push ke `origin`, belum di-merge.

Branch itu dikerjakan lane Claude, tetapi **sebagian besar menyentuh lane GPT**
(Prisma, auth/RBAC, kripto, PPKS, kontrak, registry navigasi, kontrak env) atas
instruksi langsung pemilik proyek. Tugas Anda dimulai dari meninjau itu, bukan
dari menulis fitur baru.

Baca `coordination/handoffs/M4-CLAUDE-LECTURER-PROFILE-PAGES-claude.md` lebih dulu.
Sumber kebenaran untuk PPKS adalah `docs/14-sistem-tiket-pengaduan-ppks.md`,
khususnya **bagian D yang bersifat wajib dan tidak boleh disederhanakan**.

## Tugas 1 — Tinjau dan adopsi lintas-lane (prioritas tertinggi)

Sampai ini selesai, **lane lain tidak boleh rebase** di atas branch tersebut.

Berkas lane GPT yang berubah:

| Area | Berkas |
| --- | --- |
| Skema + migrasi | `prisma/schema.prisma`, `prisma/migrations/20260829120000_*`, `prisma/migrations/20260829180000_*`, `prisma/seed.ts` |
| Auth/RBAC | `src/contracts/auth.ts`, `src/lib/auth/permission-matrix.ts`, `src/lib/auth/runtime/credentials.ts`, `src/lib/auth/runtime/redirect.ts` |
| PPKS/kripto | `src/lib/tickets/ppks-encryption.ts`, `src/lib/tickets/tracking-secret.ts`, `src/features/tickets/workflow.ts`, `src/features/tickets/query-isolation.ts`, `src/features/tickets/boundary.ts` |
| Kontrak | `src/contracts/ticket.ts`, `src/contracts/lecturer-portal.ts` |
| Registry navigasi | `src/components/admin/admin-sidebar-data.ts` |
| Kontrak env | `.env.example` |

**Perhatikan `369210c` secara khusus.** Commit itu mengubah rahasia HMAC token
pelacakan dari literal ter-commit (`"dev-tracking-hmac-secret-min-32-chars!!"`)
ke `TOKEN_HMAC_SECRET`. Alasannya: `TRACKING_HMAC_SECRET` tidak pernah ada di
`.env` maupun `.env.example`, sehingga seluruh jalur tiket memakai konstanta yang
terbit di repositori, sementara jalur booking sudah benar. Konsekuensinya: **token
pelacakan yang pernah diterbitkan di lingkungan mana pun berhenti berlaku.** Aman
sebelum rilis; putuskan secara sadar, jangan diloloskan begitu saja.

## Tugas 2 — Lampiran bukti PPKS (paling mendesak dari yang belum ada)

Terverifikasi: `src/lib/storage/ppks-attachment.ts` **tidak punya pemanggil**
(hanya di-re-export `src/lib/storage/index.ts`), dan **tidak ada rute unduh
terproteksi** untuk lampiran PPKS.

Akibatnya pelapor yang memegang bukti foto atau tangkapan layar tidak punya jalur
aman, dan kemungkinan besar akan mengirimnya lewat kanal pribadi ke orang yang salah.

Yang perlu dibangun, mengikuti `docs/14` D2 dan D5:

- Unggah lampiran opsional pada intake (`submitPpksReport` di
  `src/features/tickets/workflow.ts`).
- Simpan **di luar** direktori publik. `PPKS_PRIVATE_DIR` sudah ada di `.env.example`.
- Sajikan lewat rute yang memeriksa role `SATGAS_PPKS` **sebelum** membaca berkas.
  URL tebakan tidak boleh membocorkan bukti.
- Catat setiap unduhan di `TicketAccessLog` dengan aksi `ATTACHMENT_DOWNLOAD`
  (nilai enum-nya sudah ada).
- Enkripsi lampiran wajib, AES-256-GCM dengan key version, memakai
  `getPpksSealingKey()` dan `createPpksKeyResolver()` dari
  `src/lib/tickets/ppks-encryption.ts`.

## Tugas 3 — Notifikasi email PPKS

`src/features/tickets/` tidak mengirim notifikasi apa pun. `docs/14` D5 mewajibkan
email yang **tidak memuat isi laporan** — cukup "ada laporan baru, silakan login".
Infrastruktur outbox sudah ada (`scripts/process-outbox.ts`, `SENSITIVE_OUTBOX`
pada `ProtectedDataPurposeSchema`); tiket belum tersambung ke sana.

## Tugas 4 — Persetujuan peminjaman ruangan

`executeBookingCommand` di `src/features/booking/domain.ts` **tidak punya pemanggil
sama sekali**. Domainnya lengkap termasuk deteksi tumpang tindih pada isolasi
Serializable dan jeda antar-pemakaian. Yang belum ada hanya UI petugas untuk
menyetujui, menolak, dan membatalkan, plus pembatalan oleh pemohon.

## Tugas 5 — Sentralisasi penjagaan role

`decideProtectedRoute` di `src/lib/auth/runtime/request-session.ts` **tidak
menyebut `role` sama sekali** — ia hanya memeriksa validitas sesi dan
`mustChangePassword`. Artinya setiap user terautentikasi dapat memuat shell
`/admin`.

Tambalan saat ini hanya di `src/app/[locale]/admin/layout.tsx` lewat
`canAccessAdminShell`. Ini **bukan lubang aktif** karena otorisasi sesungguhnya
ditegakkan di domain, tetapi pemeriksaannya seharusnya terpusat, bukan disalin
per layout.

## Tugas 6 — Keputusan kontrak

1. **XLSX**: impor CSV sudah jalan (`src/features/academic/lecturer-csv-import.ts`,
   memakai `papaparse` yang sudah terpasang). XLSX butuh dependensi baru —
   keputusan kontrak, bukan keputusan implementasi. Parser dirancang menerima teks
   sehingga XLSX tinggal dicolok ke pipeline yang sama.
2. **Jumlah prodi**: `src/config/institution.ts` memuat **tiga** program studi
   (IAT, IH, AFI), sedangkan `AGENTS.md` menyebut **lima** (menambah SAA dan TASPI).
   `StudyProgramCodeSchema` di `src/contracts/academic.ts:35` sendiri sudah memuat
   kelimanya. Kontraknya tidak sinkron di dalam kode itu sendiri.

## Yang TIDAK boleh Anda kerjakan

`src/config/ppks-support.ts` sengaja dibiarkan kosong untuk kontak Satgas fakultas
dan universitas. `docs/14` **D4 melarang agen mengarang isi regulasi atau detail
layanan**. Hanya kontak nasional yang disebut dokumen itu sendiri (110, SAPA 129)
yang diisi.

Pengisiannya menunggu konfirmasi langsung ke Satgas PPKS UIN SMH Banten, bersama
verifikasi D4 lainnya: siapa berhak mengakses laporan, batas waktu penanganan
resmi, dan kewajiban pelaporan ke tingkat universitas. **Itu tugas pemilik proyek,
bukan tugas Anda.** Jangan mengisinya dengan nomor yang tampak masuk akal.

## Cara memverifikasi

```bash
npm run ci:quick        # check:scope, lint, typecheck, prisma:validate, test
```

Untuk suite integrasi, `.env` harus dimuat manual — skrip `test:integration`
tidak memuatnya, sehingga sebagian besar suite gagal karena `DATABASE_URL` dan
rahasia HMAC tidak tersetel. Ini sudah terjadi sebelum branch ini:

```bash
set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true \
  npx vitest run --config vitest.integration.config.ts tests/security/
```

Kondisi saat branch ditinggalkan: **1358 tes unit** dan **111 tes integrasi
keamanan** lolos; `lint`, `typecheck`, `prisma validate` bersih.

`npm run build` gagal di lingkungan pengembangan terakhir karena
`next/font/google` tidak dapat menjangkau Google Fonts. Keempat keluarga font itu
sudah dipakai layout admin dan auth yang ter-commit sejak lama, jadi kode yang
belum disentuh pun gagal sama. Seharusnya lolos di lingkungan yang punya jaringan.

## Invarian yang tidak boleh dilanggar

Diuji di `tests/security/ppks-intake-adversarial.integration.test.ts`. Jangan
melemahkan satu pun tanpa keputusan sadar dan tertulis:

- Tidak ada plaintext PPKS tersisa di basis data.
- `SATGAS_PPKS` membaca persis yang dilaporkan, dan aksesnya tercatat.
- `ADMIN` mendapat `NOT_FOUND` pada detail, dan hanya melihat jumlah agregat.
- Endpoint pelacakan publik yang membawa isi menolak PPKS meski tokennya benar.
- Pelacakan status PPKS berhasil, tetapi tidak membawa isi, identitas, maupun lampiran.
- Intake umum menolak kategori `PELECEHAN_SEKSUAL`.
- Catatan internal tidak muncul di tampilan pelapor mana pun.
- Kunci enkripsi PPKS tidak punya fallback pengembangan; salah konfigurasi
  menghentikan permintaan.

## Setelah selesai

Tulis handoff di `coordination/handoffs/<TASK-ID>-gpt.md` sesuai `AGENTS.md`:
task ID, branch, base SHA, head SHA, ringkasan, berkas berubah, dampak
API/skema/migrasi, perintah dan hasilnya, area yang belum teruji, risiko, dan
tindak lanjut.
