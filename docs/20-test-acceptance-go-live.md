# 20 — Test Plan, Acceptance Criteria & Gerbang Go-Live

Dokumen ini adalah definisi selesai. Fitur tidak dianggap selesai hanya karena UI dapat dibuka. Setiap acceptance gate di bawah wajib mempunyai bukti test otomatis atau catatan uji manual yang dapat diaudit.

## A. Strategi dan lingkungan

- **Unit:** Vitest untuk helper murni, validasi, authorization, locale, SLA, sequence, dan sanitasi.
- **Integration:** Vitest terhadap PostgreSQL dengan major yang sama seperti produksi dan skema dari migration produksi; jangan mengganti dengan SQLite karena perilaku transaction, locking, enum, JSON, dan full-text berbeda.
- **E2E:** Playwright pada build production dengan seed fixture deterministik.
- **Accessibility:** axe melalui Playwright + audit manual keyboard dan NVDA/VoiceOver.
- **Security:** test otomatis untuk IDOR/XSS/upload/token serta review manual konfigurasi header, cookie, storage, dan secret.
- Test tidak menggunakan data PPKS produksi. Fixture sensitif harus sintetis dan dibersihkan setelah suite.

Pipeline minimum: `prisma validate` → migration database kosong → seed → lint → typecheck → unit → integration → build → E2E → accessibility. Kegagalan satu tahap menghentikan deployment.

## B. Unit test wajib

### Locale dan konten

- Terjemahan locale aktif dipilih sebelum fallback ID.
- Locale tanpa translation menampilkan ID dan banner fallback tepat satu kali.
- Konten tanpa translation ID tidak dapat dipublish/diaktifkan.
- Slug netral tetap sama saat language switch dan URL mempertahankan halaman aktif.
- Format tanggal/angka memakai locale aktif dan zona `Asia/Jakarta`.

### Authorization

- Semua kombinasi pada matriks `06` diuji sebagai table-driven test.
- EDITOR hanya dapat view/update/delete/publish Post dan Media miliknya.
- ADMIN/PETUGAS selalu ditolak untuk detail, reply, identity, dan attachment PPKS.
- SATGAS_PPKS selalu ditolak untuk CMS, booking, dan tiket non-PPKS.
- Assignment ditolak bila role penerima tidak sesuai kategori tiket.
- User nonaktif ditolak meskipun masih membawa cookie session lama.

### Tiket dan booking

- Token mentah menghasilkan hash deterministik tetapi tidak dapat dipulihkan.
- Counter tahun berbeda mulai dari 1 dan request paralel tidak menghasilkan nomor sama.
- SLA melewati weekend/Holiday, pause saat menunggu pelapor, dan menghitung ulang setelah perubahan prioritas.
- `firstRespondedAt` hanya diisi oleh balasan publik petugas pertama.
- Rumus overlap mencakup buffer; boundary `newStart == existingEnd+buffer` tidak bentrok.
- Durasi >12 jam, lintas hari, di luar jam operasional, kapasitas berlebih, dan blackout ditolak.

### Input dan output

- Zod menolak payload terlalu panjang, enum asing, URL berbahaya, dan JSON shape salah.
- Sanitizer menghapus script, event handler, javascript URL, iframe asing, dan atribut berbahaya tetapi mempertahankan node Tiptap yang diizinkan.
- CSV export mencegah formula injection dengan meng-escape nilai yang diawali `=`, `+`, `-`, atau `@`.
- Redirect menolak URL eksternal, loop, chain, dan path tanpa leading slash.

## C. Integration test wajib

- Create/update induk dan seluruh translation commit atau rollback bersama.
- Optimistic locking menolak overwrite saat version sudah berubah.
- Menonaktifkan user/mengubah password/role mencabut seluruh Session dalam transaksi yang sama.
- Pembuatan tiket/booking dan NotificationOutbox bersifat atomik.
- Retry outbox tidak mengirim ganda untuk idempotency key yang sama.
- AnnualSequence diuji dengan minimal 20 request paralel; semua nomor unik dan berurutan.
- Dua approval booking pada slot sama dijalankan paralel; tepat satu berhasil, satu menerima conflict terkontrol. Retry P2034 tidak membuat data ganda.
- Publish booking ke Event dua kali menghasilkan satu Event.
- Upload yang gagal insert database tidak meninggalkan file; file yang direferensikan tidak dapat dihapus.
- PPKS ciphertext dapat didekripsi dengan key version benar dan gagal bila tag dimodifikasi.
- TicketAccessLog dibuat untuk view/download yang diizinkan maupun ditolak.
- Search mengembalikan locale aktif, deduplikasi fallback, ranking title sebelum body, dan batas jumlah hasil.

## D. Security test wajib

### Auth dan IDOR

- Request tanpa session ke seluruh admin/action/download ditolak server-side.
- Mengganti ID pada URL/action tidak pernah melewati ownership atau role.
- Cookie session memiliki HttpOnly, Secure produksi, SameSite=Lax, Path=/, dan expiry 8 jam.
- Login dibatasi setelah 5 gagal/15 menit tanpa mengungkap keberadaan email.
- CSRF diuji untuk sign-in, mutation, upload, dan logout.

### PPKS dan token publik

- ADMIN/PETUGAS tidak menerima subject, snippet, identity, filename, URL, atau ciphertext PPKS dalam HTML, RSC payload, JSON, CSV, log, dashboard, dan error.
- Attachment PPKS tidak dapat diakses sebagai static URL atau setelah mengganti attachment ID.
- Token tracking tidak tersimpan plaintext di database, log, analytics, history URL, atau referrer.
- Token salah/rate-limited memberi respons generik yang sama dengan nomor tidak ada.
- Email PPKS tidak memuat isi kasus.

### Upload dan render

- Tolak MIME spoof, ekstensi ganda, SVG, HTML, executable, path traversal, null byte, file terlalu besar, pixel bomb, dan PDF palsu.
- File privat mempunyai `Cache-Control: private, no-store`, `nosniff`, dan Content-Disposition aman.
- XSS corpus diuji pada Tiptap, caption, nama file, FAQ, search query, toast/error, dan metadata.
- CSP produksi tidak memakai `unsafe-eval`; hanya host YouTube, Maps, GA4, SMTP tidak relevan ke browser, serta worker pdf.js yang diperlukan.

## E. E2E berdasarkan peran

### ADMIN

- Login, wajib ganti password awal, kelola user, konten, menu, branding, beranda, booking, tiket non-PPKS, outbox, Holiday, dan redirect.
- Tidak dapat membuka detail atau attachment PPKS.
- Tidak dapat menonaktifkan diri sendiri atau satu-satunya ADMIN aktif.

### EDITOR

- Membuat draft, autosave, preview, publish sekarang, schedule, edit, archive, dan hapus Post miliknya.
- Hanya melihat Post/Media miliknya dan ditolak dari CMS lain meski memakai URL/action langsung.
- Konflik edit memberi pesan tanpa kehilangan salinan perubahan lokal.

### PETUGAS

- Melihat dan menangani tiket non-PPKS, mengelola booking, menulis public reply/internal note, mengubah priority dengan alasan, serta ekspor aman.
- Tidak dapat membuka CMS atau PPKS.

### SATGAS_PPKS

- Melihat, membalas, assign, download, dan menutup PPKS; setiap akses masuk log.
- Tidak dapat melihat modul di luar PPKS.

### Publik anonim

- Mengirim tiket umum dan PPKS, menerima token sekali, melacak, membalas, dan mengunduh attachment sendiri tanpa melihat catatan internal.
- Mengajukan booking, melihat peringatan permohonan bersaing, melacak, dan membatalkan sebelum waktu mulai.
- Token hilang tidak dapat dipulihkan dari database atau oleh admin.

## F. Multibahasa, RTL, UI, dan aksesibilitas

- Jalankan template publik dan admin pada ID, EN, AR serta fallback ID.
- Uji 360, 390, 768, 1024, dan 1440 px tanpa horizontal scroll halaman.
- Arabic mengubah `html dir=rtl`, sidebar/drawer, panah, carousel, marquee, dialog, tabel, dan editor; logo/foto/video/PDF tidak dicerminkan.
- Language switch mempertahankan route, slug, query/filter yang aman, serta preference cookie.
- hreflang ID/EN/AR + x-default dan sitemap tiga locale tervalidasi.
- axe/Lighthouse accessibility minimal 95 pada setiap template, tanpa violation critical/serious.
- Keyboard-only mencakup menu, dialog, lightbox, editor, drag reorder dengan alternatif tombol, calendar list, form tiket, dan booking.
- Screen reader manual mencakup beranda → daftar/detail berita serta login → tulis berita; calendar memiliki list view yang ekuivalen.
- `prefers-reduced-motion` menghentikan marquee/count-up/carousel autoplay.

## G. Migrasi WordPress

- Dry run dan final run menghasilkan laporan jumlah source/created/updated/skipped/failed per tipe dan tahun.
- Rekonsiliasi wajib 100% untuk konten yang masuk scope; setiap exclusion tercatat dengan alasan dan persetujuan pemilik konten.
- Semua media mempunyai checksum; missing/corrupt media nol sebelum cutover.
- Sampling visual minimum: 20 berita, 10 halaman, seluruh prodi, seluruh menu, dan semua tipe dokumen.
- Crawl staging tidak menemukan internal 404, redirect chain/loop, mixed content, missing canonical, atau broken hreflang.
- Setiap URL publik WordPress yang ditemukan sitemap/database/log memiliki redirect 301 atau exclusion tertulis.
- Menjalankan importer ulang tidak membuat duplikasi.

## H. Operasional, backup, dan deployment

- SMTP test mengirim ID/EN/AR; simulasi timeout menghasilkan retry tanpa menggandakan email.
- Cron 5 menit dan fallback trigger admin memproses outbox dengan lock.
- Backup mencakup database, public upload, private upload, PPKS ciphertext, serta backup key terpisah.
- Restore drill ke lingkungan terisolasi berhasil: login, buka konten/media, lacak booking sintetis, dan dekripsi satu fixture PPKS.
- Deploy baru tidak menghapus uploads; rollback aplikasi tetap dapat membaca skema yang kompatibel atau disertai prosedur rollback migration.
- Security headers, HTTPS redirect, robots, sitemap, analytics consent, 404/500, dan health check diverifikasi di domain staging/produksi.
- Monitoring uptime dan kapasitas disk aktif; alert disk pada 70%, critical pada 85%.

## I. Gerbang go-live

Go-live hanya boleh dilakukan bila semua kondisi terpenuhi:

- Tidak ada defect severity Critical atau High; Medium memiliki owner dan tanggal penyelesaian.
- Migration, seed, build, seluruh test otomatis, dan crawl staging lulus.
- Restore drill berhasil dan bukti hasil disimpan.
- SMTP/outbox/cron diuji di lingkungan produksi.
- Satgas PPKS menyetujui kontak bantuan, wording, role, alur, SLA, dan retention hold secara tertulis.
- Seluruh secret produksi tersedia, berbeda satu sama lain, tidak berada di repo/log, dan mempunyai prosedur rotasi.
- Migrasi WordPress serta redirect 301 direkonsiliasi.
- Checklist RTL, mobile, accessibility, privacy, dan cookie consent ditandatangani penanggung jawab.
- Tidak ada konten institusional tanpa owner/review date; alert/status dan privacy request telah diuji (`21`).
- Hub calon mahasiswa, direktori, structured data, performance budget, dan analytics tanpa PII telah diuji (`22`).
- Seluruh tautan SILA sehat dan tidak ada database/session/PII SILA yang disalin ke website (`23`).

Setelah go-live, lakukan smoke test pada homepage, login, satu konten, search, pengaduan sintetis non-PPKS, booking sintetis, email, dan satu file publik/privat. Jangan mengirim laporan PPKS sintetis ke kanal produksi tanpa koordinasi Satgas.
