# Dokumentasi Website & CMS Fakultas Ushuluddin dan Pemikiran Islam (FUSPI)

> **Batas identitas:** website yang dibangun adalah milik **FUSPI**. Situs eksternal yang ditunjuk pemilik hanya menjadi referensi audit struktur informasi; identitas, domain, email, program, data, seed, metadata, media, layout, serta copy publiknya tidak boleh masuk ke produk FUSPI.

Dokumen ini adalah spesifikasi teknis lengkap untuk membangun **website fakultas berbasis CMS** menggunakan Next.js, ditujukan untuk dikerjakan oleh agen coding AI (Claude Code / DeepSeek). Setiap dokumen ditulis dalam bentuk instruksi yang eksplisit dan bisa langsung dieksekusi.

> **Untuk agen coding:** Baca seluruh dokumen di folder ini sebelum menulis kode. Jangan mengarang keputusan arsitektur atau desain — semuanya sudah ditentukan di sini. Kalau ada yang ambigu, ikuti konvensi yang sudah ditetapkan di `01-arsitektur.md` dan `03-design-system.md`.

## Sumber kebenaran & preseden

Dokumen ini adalah satu paket spesifikasi. Bila dua bagian tampak bertentangan, gunakan urutan preseden berikut (yang lebih atas menang):

1. `02-database-schema.md` untuk model, field, relasi, indeks, dan kebijakan penghapusan.
2. `06-autentikasi-role.md`, `07-upload-media-hostinger.md`, dan `14-sistem-tiket-pengaduan-ppks.md` untuk batas keamanan.
3. Dokumen modul (`04`, `05`, `09`–`19`) untuk perilaku produk.
4. `26-fuspi-public-ia-design-brief.md` untuk IA publik, narasi beranda, template profil, dan arah visual.
5. `03-design-system.md` dan `17-komponen-ui-detail.md` untuk token serta interaksi yang belum diperinci oleh `26`.
6. `20-test-acceptance-go-live.md` untuk bukti kelulusan dan gerbang go-live.

Tidak ada transformasi skema yang diserahkan kepada implementer: skema di `02` adalah bentuk final. Kata **opsional** hanya berarti field boleh kosong atau fitur dinyatakan di luar scope v1; kata itu tidak boleh dipakai untuk menawarkan dua arsitektur berbeda.

## Keputusan implementasi yang dikunci

- Auth: Auth.js Credentials dengan **database session** 8 jam; tidak ada fallback JWT.
- Publikasi: EDITOR boleh menerbitkan dan menjadwalkan Post miliknya sendiri.
- Email: SMTP transaksional melalui outbox; kegagalan email tidak membatalkan transaksi bisnis.
- Konten awal: dimasukkan manual melalui CMS; impor konten/media/URL terdahulu bukan scope atau gerbang go-live v1.
- Pengaduan anonim: token pelacakan hanya disimpan sebagai hash; token asli ditampilkan/dikirim sekali.
- PPKS: isi dan lampiran terenkripsi, storage di luar document root, serta hanya dapat dibuka SATGAS_PPKS.
- Retensi PPKS: tidak ada penghapusan otomatis sampai kebijakan tertulis Satgas ditetapkan.

---

## Ringkasan proyek

Membangun website resmi FUSPI sebagai aplikasi Next.js dengan panel admin (CMS) untuk mengelola seluruh konten: berita, pengumuman, halaman statis, dosen, lima program studi, penelitian, kerjasama, dan lainnya. Tidak memakai Payload atau CMS pihak ketiga — panel admin dibangun kustom di atas stack yang sudah dikuasai tim.

**Tujuan utama:**

1. Konten dikelola sendiri oleh admin/editor fakultas tanpa menyentuh kode.
2. Berjalan pada **VPS** dengan Node.js, PostgreSQL, reverse proxy, dan storage persisten yang dikelola sendiri.
3. Tampilan publik dan panel admin yang rapi, konsisten, dan intentional — bukan template generik.

## Tech stack (final, tidak dinegosiasikan ulang)

| Lapisan | Teknologi |
|---|---|
| Framework | **Next.js 16** (App Router) + TypeScript + React 19.2 |
| Runtime | **Node.js 20.9+ (disarankan Node 22 LTS)** — wajib untuk Next 16 |
| ORM & Database | Prisma + **PostgreSQL 17+** |
| Autentikasi | Auth.js v5 (NextAuth) — Credentials + session database |
| Styling | Tailwind CSS + shadcn/ui |
| Rich text editor | Tiptap |
| Validasi | Zod |
| Ikon | lucide-react |
| Tabel data admin | TanStack Table |
| Upload | Native ke direktori persisten VPS di luar build (lihat `07`) |
| Deploy | GitHub Actions → VPS, systemd/container + reverse proxy |

## Bahasa & arah teks

Website **wajib 3 bahasa**: **Indonesia** (default), **English**, dan **Arabic** — dengan **dukungan RTL penuh** untuk Arabic. Ini memengaruhi routing, skema database (tabel terjemahan), design system (logical properties + font Arab), dan panel admin (tab bahasa per konten).

> **Agen: baca `12-multibahasa-rtl.md` SEBELUM menulis kode.** Multibahasa & RTL harus dibangun sejak awal — menambahkannya belakangan berarti membongkar routing dan mengganti seluruh utilitas arah CSS.

## Peran pengguna

- **ADMIN** — akses penuh: semua konten & modul, semua berita, kelola user, menu, branding/logo, pengaturan situs. **Pengecualian: TIDAK dapat membuka isi tiket PPKS** (lihat `14`).
- **EDITOR (penulis)** — hanya berita: membuat berita, serta mengedit/menghapus **berita yang dibuatnya sendiri**. Bisa menyimpan draft sebelum terbit. (Detail penegakan di `06`.)
- **PETUGAS** — menangani tiket pengaduan **non-PPKS** (akademik, kemahasiswaan, sarana, lainnya).
- **SATGAS_PPKS** — **satu-satunya** role yang dapat membuka laporan kekerasan/pelecehan seksual. Akses tercatat di jejak audit.

## Indeks dokumentasi

| File | Isi |
|---|---|
| `01-arsitektur.md` | Struktur folder, konvensi kode, environment variables |
| `02-database-schema.md` | Skema Prisma lengkap (PostgreSQL) + penjelasan tiap model |
| `03-design-system.md` | Design tokens (#4169E1), tipografi, komponen — panduan anti-slop |
| `04-panel-admin.md` | Spesifikasi tiap halaman admin & alur CRUD |
| `05-halaman-publik.md` | Peta situs, template halaman, section beranda |
| `06-autentikasi-role.md` | Setup Auth.js v5, RBAC, middleware proteksi |
| `07-upload-media-hostinger.md` | Mekanisme upload di storage persisten VPS |
| `08-deploy-hostinger.md` | Panduan deploy VPS + PostgreSQL |
| `09-fitur-cms-editor.md` | Editor (gambar+posisi, tabel, embed), import massal, section beranda tambahan |
| `10-menu-branding-referensi.md` | Menu builder drag & drop, branding/logo, peran kepemilikan, referensi desain |
| `11-dosen-arsip-pdf-album.md` | Direktori dosen (gaya Zaytuna), arsip berita, render PDF inline, album foto |
| `12-multibahasa-rtl.md` | **3 bahasa (ID/EN/AR) + RTL** — routing, tabel terjemahan, tab bahasa, aturan RTL |
| `13-celah-fitur-keamanan-operasional.md` | Formulir (kontak/survei), FAQ, testimoni, pencarian, aksesibilitas WCAG, keamanan, backup |
| `14-sistem-tiket-pengaduan-ppks.md` | **Sistem tiket pengaduan** — kategori, prioritas & SLA, pelacakan, **kanal PPKS terlindungi** |
| `15-peminjaman-gedung-jadwal.md` | **Peminjaman ruangan/gedung** — pengajuan, persetujuan, deteksi bentrok, kalender jadwal publik |
| `16-audit-kelengkapan.md` | **Audit final** — apa yang sudah lengkap, apa yang sengaja tidak dibangun, celah operasional |
| `17-komponen-ui-detail.md` | **Spesifikasi komponen UI** — spacing presisi, header, footer, sidebar, toast, dialog, form, referensi desain |
| `18-beranda-editable.md` | **Beranda editable** — tiap section (dekan, counter, marquee) dikelola admin tanpa ubah kode |
| `19-halaman-berita-detail.md` | **Halaman berita** — daftar, detail 2 kolom, sidebar "Berita Terbaru", bagikan, terkait |
| `20-test-acceptance-go-live.md` | **Test plan & gerbang go-live** — unit, integration, security, E2E, kesiapan konten, restore, acceptance |
| `21-tata-kelola-privasi-alert.md` | **Governance operasional** — review/expiry/revision konten, translation workflow, alert/status, PDP, accessibility issue |
| `22-calon-mahasiswa-akademik-discoverability.md` | **Pengalaman akademik** — hub calon mahasiswa, direktori, katalog kurikulum, profil riset, structured data, CWV |
| `23-integrasi-sila-e-layanan.md` | **Batas & roadmap SILA** — deep link v1, API read-only fase 2, SSO fase 3 tanpa duplikasi data |
| `24-implementation-plan-multi-model.md` | **Rencana implementasi tiga model** — worktree, ownership, merge queue, model/cost per tahap, CI dan recovery |
| `25-m0-foundation-capability.md` | **Rekaman M0** — baseline lama dan capability VPS/PostgreSQL yang perlu dibuktikan |
| `26-fuspi-public-ia-design-brief.md` | **Kontrak IA & desain publik** — menu, narasi beranda, template profil, visual, dan kesiapan konten manual |

## Urutan pengerjaan yang disarankan

1. Setup proyek + **next-intl + routing `[locale]`** (`01`, `12`) — **sejak awal**
2. Prisma + PostgreSQL + **tabel terjemahan** (`02`, `12`)
3. Design system + **logical properties & font Arab** (`03`, `12`) — **sejak awal**
4. Autentikasi + proteksi rute admin (`06`)
5. Panel admin per modul + **tab bahasa** (`04`, `12`)
6. Mekanisme upload (`07`)
7. Halaman publik + language switcher + hreflang (`05`, `12`)
8. Siapkan dan setujui konten awal secara manual melalui CMS (`26`)
9. Governance, alert/status, PDP, calon mahasiswa, direktori, structured data & performance (`21`, `22`)
10. Hubungkan CTA layanan ke SILA tanpa berbagi database/session (`23`)
11. Jalankan proyek dengan lane/worktree/model/cost gate pada `24`
12. Jalankan seluruh acceptance gate (`20`), uji restore, lalu deploy (`08`)
