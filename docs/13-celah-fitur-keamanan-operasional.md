# 13 — Penutup Celah: Formulir, Interaksi, Aksesibilitas, Keamanan & Operasional

Dokumen ini menutup celah yang ditemukan saat membandingkan rencana kita dengan praktik situs universitas terkemuka (NN/g, Modern Campus, Kanopi, Optasy) dan kebutuhan institusi publik Indonesia. Semua di sini **wajib**, kecuali ditandai opsional.

---

## A. Formulir publik (Kontak, Pengaduan, Survei) — celah besar

Situs lama hanya menautkan ke Google Form eksternal. Sekarang formulir masuk ke sistem sendiri. `FormSubmission` hanya menampung KONTAK; SURVEI memakai model survei berversi dan PENGADUAN memakai `Ticket`.

### 1. Hubungi Kami (`/kontak`)
- Field: Nama, Email, Nomor telepon (opsional), Subjek, Pesan.
- Tampilkan juga: alamat 2 kampus, email, telepon, jam layanan, dan **peta lokasi tersemat** (Google Maps embed — lazy-load agar tidak memberatkan).
- Kirim → simpan `FormSubmission` → tampilkan konfirmasi ("Terima kasih, pesan Anda telah kami terima").

### 2. Pengaduan / Whistleblowing (`/pengaduan`)
Seluruh pengaduan menggunakan sistem `Ticket` pada `14`; **jangan** menyimpan pengaduan dalam `FormSubmission`. Aturan anonim, PPKS, token, lampiran, tracking, dan retensi hanya mengikuti dokumen 14.

### 3. Survei Kepuasan Layanan (`/survei`)
- Pertanyaan dikelola lewat `SurveyDefinition` berversi dan `SurveyQuestion`. Publik mengisi rating 1–5 per aspek serta saran terbuka.
- `SurveySubmission` menyimpan versi definisi dan `SurveyAnswer` terstruktur; jangan simpan jawaban historis sebagai JSON bebas.
- Setelah ada submission, versi pertanyaan dikunci. Perubahan pertanyaan membuat versi baru agar laporan lama tetap dapat direkonstruksi.
- Dashboard admin menampilkan **rata-rata rating** dan tren — berguna untuk dokumen akreditasi.

### Admin — Kotak Masuk (`/admin/kiriman`)
- Tabel semua kiriman, **filter per tipe** (Kontak/Pengaduan/Survei) dan **status** (Baru/Diproses/Selesai).
- Klik → detail; admin bisa ubah status dan menulis catatan internal (`adminNote`).
- Badge jumlah "Baru" di sidebar agar tidak terlewat.
- **Ekspor CSV** (khususnya survei, untuk lampiran akreditasi).
- Akses: **ADMIN saja** (EDITOR tidak boleh melihat pengaduan).

### Anti-spam (wajib untuk semua formulir publik)
- **Honeypot field** (input tersembunyi; bila terisi → tolak diam-diam).
- **Rate limiting** per IP (mis. maks 5 kiriman/jam) — simpan **hash** IP (`ipHash`), bukan IP mentah.
- **Cloudflare Turnstile** atau hCaptcha (lebih ramah privasi daripada reCAPTCHA). Opsional tapi sangat disarankan.
- Validasi Zod di server; batasi panjang pesan; sanitasi input.
- Jangan pernah merender input pengguna sebagai HTML mentah.

---

## B. FAQ (`/faq`)

- Daftar pertanyaan-jawaban dalam **accordion**, dikelompokkan per kategori (Akademik, Pendaftaran, Layanan, Beasiswa).
- Model `Faq` (+ `FaqTranslation` untuk question/answer, lihat `12`).
- Admin: CRUD + urutan drag (`SortableList` dari `10-A`).
- Tambahkan schema.org `FAQPage` (JSON-LD) untuk SEO.

---

## C. Testimoni & data outcome lulusan

Riset usabilitas menemukan calon mahasiswa mencari bukti hasil setelah lulus — angka dan sumbernya, bukan klaim kosong.

- **Testimoni** (`Testimonial` + translation): foto, nama, tahun lulus, pekerjaan/jabatan sekarang, kutipan, prodi. Ditampilkan di beranda (carousel) dan di halaman prodi terkait.
- **Data outcome** di halaman Profil Lulusan / prodi: masa tunggu kerja, bidang kerja lulusan, persentase melanjutkan studi. Cukup dikelola sebagai konten `Page` + tabel/infografik sederhana, dengan **mencantumkan sumber & tahun data** (mis. "Tracer Study 2025"). Jangan menampilkan angka tanpa sumber.
- Tautan ke form Tracer Study eksternal tetap ada.

---

## D. Interlinking konten (profil yang saling terhubung)

Situs kampus terbaik menghubungkan profil dosen dengan berita, publikasi, dan bidang risetnya. Tambahkan relasi berikut:

- **`Lecturer` ↔ `Research` / `CommunityService`** — relasi many-to-many (dosen bisa punya banyak publikasi). Halaman detail dosen menampilkan daftar publikasinya.
- **`Lecturer` ↔ `Post`** — pivot many-to-many wajib untuk relasi "disebut dalam berita", sehingga satu berita dapat terkait beberapa dosen tanpa mengubah author CMS.
- **`StudyProgram` → daftar dosen, berita terkait, dan album kegiatan prodi** — halaman prodi menjadi hub, bukan halaman mati.

> Implementasi final: gunakan pivot eksplisit `LecturerResearch`, `LecturerCommunityService`, `LecturerPost`, `StudyProgramPost`, dan `StudyProgramAlbum` seperti kontrak `02`.

---

## E. Halaman Program Studi yang "berlapis" (penting untuk akreditasi)

Halaman prodi jangan cuma deskripsi. Struktur wajib:

1. Ringkasan prodi + **badge akreditasi** (Unggul → brass).
2. **Visi, misi, tujuan** prodi.
3. **Capaian Pembelajaran Lulusan (CPL)** — daftar terstruktur. (Selaras dengan kebutuhan dokumen akreditasi.)
4. **Profil lulusan & prospek karier** — apa yang bisa dikerjakan lulusan. Ini yang paling dicari calon mahasiswa.
5. **Struktur kurikulum / daftar mata kuliah** — bisa tabel atau tautan ke dokumen PDF (dirender dengan `PdfViewer`, lihat `11-C`).
6. **Dosen prodi** — grid otomatis dari relasi.
7. **Berita & kegiatan prodi** — otomatis dari relasi.
8. **CTA**: "Daftar Sekarang" (PMB) dan "Unduh Brosur".

Gunakan field terstruktur `vision`, `mission`, `objectives`, `learningOutcomes`, `graduateProfile`, dan `careerProspects` pada `StudyProgramTranslation`. `description` hanya untuk ringkasan; jangan menumpuk semua section di satu rich text.

---

## F. Pencarian situs yang layak

- Kotak cari di navbar → halaman `/cari?q=`.
- **Saran saat mengetik (autocomplete)** — aktif setelah minimum 3 karakter, debounce 300ms, maksimum 5 hasil, dan rate limit 60 request/menit per HMAC IP.
- Cari lintas: Berita, Pengumuman, Halaman, Dosen, Prodi, Dokumen, FAQ. Kelompokkan hasil per tipe.
- **Toleransi salah ketik** — FULLTEXT pada tabel translation ID/EN. Arabic memakai FULLTEXT bila tersedia pada konfigurasi MariaDB; selain itu prefix/`LIKE` dibatasi query 3–100 karakter, maksimum 50 kandidat per tipe. Ranking: exact title → title prefix → FULLTEXT score → excerpt. Deduplikasi berdasarkan parent ID.
- Hasil kosong → sarankan kata kunci lain + tautan ke halaman populer.
- Hormati locale aktif (cari di terjemahan bahasa yang sedang dipakai, fallback ke `id`).

---

## G. Aksesibilitas (WCAG 2.2 AA) — WAJIB

Institusi publik harus dapat diakses semua orang. Ini bukan opsional.

**Checklist wajib:**
- Kontras teks minimal **4.5:1** (teks biasa) dan **3:1** (teks besar). Cek warna `royal-500` di atas putih dan sebaliknya; jangan pakai `slate-400` untuk teks penting.
- Semua gambar punya **alt text** (field `Media.alt` sudah ada — jadikan **wajib diisi** saat upload; boleh kosong hanya untuk gambar dekoratif dengan `alt=""`).
- **Navigasi keyboard penuh** — semua menu, dropdown, dialog, drag-and-drop punya alternatif keyboard (di menu builder, sediakan tombol panah naik/turun).
- **Fokus terlihat** (`ring-2 ring-royal-500 ring-offset-2`) — jangan pernah `outline: none` tanpa pengganti.
- **Skip to content** link di awal halaman.
- Struktur heading benar (satu `h1` per halaman, tidak melompat level).
- Form: setiap input punya `<label>` terkait; error diumumkan (`aria-live`).
- Dialog/modal: fokus terperangkap di dalamnya, `Esc` menutup.
- `prefers-reduced-motion` dihormati (marquee logo & animasi count-up berhenti).
- Video publik wajib memiliki judul aksesibel dan field transcript/caption link; bila caption belum tersedia, video tidak boleh autoplay dan admin diberi peringatan kelengkapan.
- **Halaman Pernyataan Aksesibilitas** (`/aksesibilitas`) — komitmen + kontak untuk melaporkan hambatan.

**Uji:** jalankan axe DevTools / Lighthouse pada setiap template halaman; target skor aksesibilitas ≥ 95. Uji juga dengan keyboard saja dan dengan screen reader (NVDA/VoiceOver) pada alur utama (beranda → berita → detail; login admin → tulis berita).

---

## H. Halaman sistem & legal

- **404** — halaman kustom ramah: pesan jelas, kotak cari, tautan ke beranda/berita/prodi. Jangan halaman kosong.
- **500 / error** — pesan sopan + tombol coba lagi. Pakai `error.tsx` & `not-found.tsx` Next.js.
- **Sitemap HTML** (`/sitemap`) — daftar semua halaman utama untuk pengunjung (berbeda dari `sitemap.xml` untuk mesin pencari).
- **Kebijakan Privasi** (`/privasi`) — data apa yang dikumpulkan (formulir, analytics, cookie).
- **Syarat Penggunaan** (opsional).
- **Pernyataan Aksesibilitas** (`/aksesibilitas`) — lihat G.
- Halaman-halaman ini cukup dibuat sebagai `Page` (konten dikelola admin).

---

## I. Analytics & cookie consent

- **Google Analytics 4** adalah pilihan final v1. Pasang lewat env `NEXT_PUBLIC_GA_ID` agar bisa dimatikan.
- **Cookie consent banner** — muncul sekali, simpan pilihan di cookie. Analytics **baru aktif setelah** pengguna setuju. Sederhana: tombol "Terima" & "Tolak", tautan ke Kebijakan Privasi.
- `viewCount` bertambah maksimal sekali per Post per cookie first-party 24 jam, mengabaikan preview/admin dan user-agent bot yang dikenal. Counter tidak menyimpan identitas dan tidak dianggap analytics personal.

---

## J. Keamanan (memperluas `06`)

- **Security headers** di `next.config.ts`: HSTS, `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, Permissions-Policy, dan CSP nonce-based tanpa `unsafe-eval`. CSP mengizinkan hanya origin sendiri, YouTube, Maps, GA4 setelah consent, serta worker pdf.js yang dibutuhkan; tidak ada wildcard umum.
- **Rate limit persisten** memakai `RateLimitBucket` MariaDB, bukan memory proses. Login: 5 gagal/15 menit; kontak/survei: 5/jam; tiket PPKS: 10/hari dengan pesan suportif; autocomplete: 60/menit; lacak token mengikuti `14`. Kunci memakai HMAC IP dari trusted proxy chain dan `IP_HASH_SECRET`, bukan IP mentah.
- **Sanitasi HTML** dari editor sebelum render (`isomorphic-dompurify`) — mencegah XSS dari konten editor.
- **Validasi upload ketat** (tipe MIME + ekstensi + ukuran; tolak SVG dari pengguna karena bisa memuat script, atau sanitasi SVG).
- Jangan tampilkan pesan error teknis ke publik.
- Simpan `AUTH_SECRET` & kredensial DB hanya di env Hostinger, tidak pernah di repo.

---

## K. Backup & operasional — RISIKO SERIUS bila diabaikan

Konten fakultas (berita bertahun-tahun, dokumen akreditasi) tidak boleh hilang.

- **Backup database** — jadwalkan `mysqldump` berkala. Hostinger menyediakan backup otomatis pada paket Business; **verifikasi** frekuensinya di hPanel, dan **tambahan**: unduh dump manual berkala ke penyimpanan lain (mis. Google Drive) minimal bulanan.
- **Backup file** mencakup public uploads, private uploads, dan PPKS encrypted storage. Kunci enkripsi PPKS dibackup terpisah dari data.
- **Uji restore wajib** sebelum go-live dan setiap 6 bulan: restore database + ketiga storage ke lingkungan terisolasi, verifikasi checksum dan satu file terenkripsi, lalu catat hasilnya.
- **Log aktivitas admin** (`ActivityLog`, disebut di `10-D`) — siapa mengubah apa; membantu melacak bila ada kesalahan.
- **Monitoring uptime** sederhana (mis. UptimeRobot gratis) + cek broken link berkala.
- **Redirect dari URL WordPress lama** memakai tabel `Redirect` dan status 301. Tidak boleh ada loop atau chain; destination selalu URL locale final.

### Migrasi WordPress — workstream wajib

1. Inventaris seluruh post type, page, kategori, tag, author, menu, attachment, dokumen, tanggal, status, slug, dan URL publik lama.
2. Buat skrip import idempotent dengan tabel mapping ID WordPress → ID baru. Konten lama masuk sebagai translation `id`; EN/AR dibiarkan kosong.
3. Sanitasi HTML, transformasikan block/shortcode yang didukung, salin media dengan checksum SHA-256, deduplikasi, dan perbaiki internal URL.
4. Buat satu redirect 301 untuk setiap URL lama menuju URL `/id/...` final. Redirect chain dan loop adalah kegagalan migrasi.
5. Dry run menghasilkan jumlah source, created, updated, skipped, failed, missing media, dan broken internal links.
6. Sebelum cutover, rekonsiliasi jumlah per tipe/status/tahun, sampling visual konten, lalu crawl staging untuk 404, missing media, canonical, hreflang, dan redirect.
7. Backup WordPress lama dipertahankan sampai restore situs baru dan rekonsiliasi produksi disetujui.

### SMTP Hostinger & transactional outbox

- Semua email aplikasi menggunakan SMTP Hostinger dari env di `01`; tidak ada provider alternatif pada v1.
- Mutation bisnis menulis `NotificationOutbox` dalam transaksi yang sama. Cron Hostinger memprosesnya setiap 5 menit dengan exponential backoff, maksimal 5 percobaan.
- Kegagalan email tidak menggagalkan tiket, booking, atau balasan. Outbox memakai `idempotencyKey` unique untuk mencegah duplikasi.
- Error permanen tampil di dashboard sesuai role dan dapat di-retry manual. Template tersedia ID/EN/AR berdasarkan locale pengirim.

---

## L. Di luar scope v1

- **Virtual tour / peta kampus** — embed video 360° atau Google Maps interaktif di halaman Fasilitas. Calon mahasiswa menyukainya.
- **Brosur prodi (PDF)** dan tombol bagikan WhatsApp/Facebook/X **tetap masuk v1** karena sudah menjadi bagian halaman prodi/berita.
- **RSS feed** berita **tetap masuk v1**.
- Mode cetak rapi masuk backlog setelah v1.
- **Feed Instagram** fakultas di beranda (via embed resmi; hindari library pihak ketiga yang membebani).

---

## M. Ringkasan model & halaman baru

**Model final ada di `02`:** Form kontak, survei berversi, FAQ, Testimonial, seluruh pivot interlinking, ActivityLog, Redirect, RateLimitBucket, NotificationOutbox, dan translation. Tidak ada model opsional yang harus dipilih implementer.

**Halaman publik baru:** `/kontak`, `/pengaduan`, `/survei`, `/faq`, `/cari`, `/sitemap`, `/privasi`, `/aksesibilitas`, 404 & error.

**Halaman admin baru:** `/admin/kiriman` (kotak masuk — ADMIN saja), `/admin/faq`, `/admin/testimoni`.
