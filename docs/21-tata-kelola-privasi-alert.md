# 21 — Tata Kelola Konten, Privasi PDP, Alert & Status Layanan

Dokumen ini menutup gap operasional situs institusi: konten harus tetap benar setelah diterbitkan, pengguna harus dapat menjalankan hak atas data pribadinya, dan fakultas harus dapat mengumumkan informasi kritis tanpa deploy kode.

Semua fitur di dokumen ini **wajib untuk v1**, kecuali integrasi notifikasi lintas sistem yang secara eksplisit ditandai fase lanjutan.

## A. Siklus hidup dan kepemilikan konten

Konten yang masuk governance: `Post`, `Page`, `StudyProgram`, `Service`, `Unit`, `Document`, `Faq`, `Event`, `Room`, dan informasi legal/situs.

Setiap record menyimpan:

- `contentOwnerId` — user ADMIN yang bertanggung jawab, bukan selalu penulis.
- `lastReviewedAt` dan `lastReviewedById`.
- `reviewDueAt` — default 180 hari untuk halaman institusional, 365 hari untuk profil/prodi, dan tidak berlaku untuk berita historis.
- `expiresAt?` — wajib untuk beasiswa, agenda, alert, dan informasi berbatas waktu.
- `governanceStatus`: `CURRENT`, `REVIEW_DUE`, `STALE`, `EXPIRED`.

Aturan:

- Publish pertama menetapkan owner dan review due date berdasarkan tipe.
- Perubahan isi setelah review membuat `lastReviewedAt=null` dan menghitung ulang due date.
- Konten expired tidak dihapus. Event/beasiswa disembunyikan dari daftar aktif dan tetap tersedia di arsip bila secara hukum/SEO layak.
- Page legal, profil fakultas, prodi, akreditasi, layanan, dan kontak tidak boleh hard-delete; gunakan archive dan redirect.
- ADMIN dapat mengganti owner secara massal saat staf pindah tugas.

### Dashboard governance

Tambahkan `/admin/governance` dengan tab:

1. Perlu ditinjau dalam 30 hari.
2. Terlambat ditinjau.
3. Segera kedaluwarsa.
4. Translation stale/missing.
5. Broken link dan missing media/alt text.
6. Konten tanpa owner.

NotificationOutbox mengirim ringkasan mingguan kepada owner. Tidak ada email harian per item.

## B. Revision history dan pemulihan

Tambahkan `ContentRevision`:

- `resourceType`, `resourceId`, `locale?`, `version`, `snapshotJson`, `changeSummary?`, `actorId`, `createdAt`.
- Snapshot dibuat sebelum setiap mutation publishable, termasuk translation, menu, HomeSection, dan SiteSetting.
- Snapshot tidak boleh memuat password, token, data tiket, data booking pribadi, atau PPKS.
- ADMIN dapat melihat diff field-by-field dan memulihkan revision sebagai mutation baru; restore tidak menghapus histori sesudahnya.
- Simpan maksimum 50 revision per resource atau 2 tahun, mana yang lebih panjang. Page legal dan prodi tidak dibatasi jumlah revision.

## C. Workflow translation

Setiap row `*Translation` menambah:

- `translationStatus`: `DRAFT`, `REVIEWED`, `PUBLISHED`, `STALE`.
- `sourceVersion` — version induk ID yang menjadi dasar terjemahan.
- `translatedById?`, `reviewedById?`, `reviewedAt?`.

Aturan final:

- ID merupakan source. Perubahan field terjemahan ID menaikkan version induk dan menandai EN/AR `STALE`.
- Translation stale tetap dapat ditampilkan, tetapi diberi indikator internal dan masuk dashboard governance; jangan menampilkan label stale kepada publik.
- EN/AR hanya dipakai publik bila status `PUBLISHED`; jika tidak, fallback ID sesuai `12`.
- Sediakan glossary ID–EN–AR untuk nama unit, jabatan, prodi, istilah akademik, dan istilah PPKS. Glossary dikelola ADMIN dan ditampilkan sebagai bantuan editor, bukan auto-translate.

## D. Alert global dan status layanan

### `SiteAlert`

Field:

- `severity`: `INFO`, `WARNING`, `CRITICAL`.
- title/message translation, CTA label/URL, `startsAt`, `endsAt?`, `isDismissible`, `isActive`, `createdById`, timestamps.
- `audience`: `ALL`, `PUBLIC`, `ADMIN`; v1 hanya memakai `ALL/PUBLIC`.

Perilaku:

- Alert aktif tampil di atas header pada seluruh locale dan halaman, termasuk login.
- `CRITICAL` tidak dismissible kecuali ADMIN memilihnya secara eksplisit; memakai `role="alert"` dan tidak mengandalkan warna saja.
- Alert memiliki jadwal mulai/akhir, preview, dan audit revision.
- Maksimum satu CRITICAL dan dua alert non-critical tampil bersamaan; sisanya berada di pusat notifikasi.
- Mutation memanggil `revalidatePath("/", "layout")`; halaman juga membaca alert dengan cache pendek maksimal 60 detik.

### Status layanan

Tambahkan `/status` dan admin `/admin/status-layanan` dengan model:

- `ServiceEndpoint`: nama layanan (Website FUSPI, SILA/e-layanan, SIAKAD, E-Learning, PMB), URL publik, owner, aktif.
- `ServiceIncident`: endpoint, severity, status `INVESTIGATING/IDENTIFIED/MONITORING/RESOLVED`, message translation, startedAt, resolvedAt, updates timeline.

V1 mengandalkan update manual oleh ADMIN. Health-check otomatis dan sinkronisasi status SILA adalah fase lanjutan. Insiden aktif dapat membuat SiteAlert; resolve incident menutup alert terkait tanpa menghapus histori.

## E. Operasional UU Pelindungan Data Pribadi

Privacy page saja tidak cukup. Tambahkan modul `/privasi/permintaan-data` dan `/admin/privasi`.

### Model dan alur

- `PrivacyNotice`: version, locale, content, effectiveAt, retiredAt; versi yang berlaku ditampilkan pada setiap form.
- `ConsentRecord`: noticeVersion, purpose enum, granted/denied, HMAC IP, user/session reference bila ada, createdAt. Jangan menyimpan cookie analytics sebelum consent.
- `DataSubjectRequest`: nomor, type `ACCESS/CORRECTION/ERASURE/RESTRICTION/OBJECTION`, identitas kontak, verification state, status, dueAt, assignee, resolution, timestamps.
- `DataIncident`: severity, discoveredAt, systemsAffected, dataCategories, containment, status, owner, timeline; detail hanya ADMIN yang diberi permission `PRIVACY_MANAGE`.
- `DataExportLog`: actor, scope, reason, record count, createdAt; berlaku pada ekspor formulir, survei, tiket, booking, user, dan data personal lain.

Aturan:

- Pengguna menerima nomor + token hash untuk melacak permintaan tanpa akun.
- Identitas harus diverifikasi sebelum data diberikan/diubah/dihapus. Metode verifikasi tidak boleh meminta lebih banyak data daripada yang diperlukan.
- Erasure mengikuti retention matrix: data yang wajib dipertahankan ditolak sebagian dengan alasan; PPKS retention hold tetap menang.
- CSV/JSON export memakai private storage, URL sekali pakai, expiry 24 jam, dan audit download.
- Error/log/outbox tidak boleh memuat data pribadi lebih banyak dari kebutuhan operasional.
- Tim institusi menetapkan SLA hukum, penanggung jawab, dan template respons sebelum go-live; sistem menyediakan konfigurasi tanpa hardcode angka hukum yang belum disahkan.

### Retention matrix

Admin mengelola `RetentionPolicy` per resource: dasar, masa aktif, masa arsip, disposition `DELETE/ANONYMIZE/HOLD`, serta approver. Perubahan policy tidak langsung menjalankan delete; job menghasilkan preview dan membutuhkan approval dua ADMIN. PPKS selalu `HOLD` sampai kebijakan tertulis Satgas tersedia.

## F. Accessibility governance

Tambahkan `AccessibilityIssue` pada `/admin/governance/accessibility`:

- URL/template, WCAG criterion, severity, deskripsi, bukti, owner, status, target date, fixedAt, retest result.
- Pernyataan aksesibilitas publik menampilkan tanggal audit terakhir, tingkat conformance, known issues, target perbaikan, kontak, serta cara meminta format alternatif.
- Permintaan format alternatif masuk sebagai `DataSubjectRequest` terpisah? **Tidak.** Gunakan `AccessibilityRequest` agar kebutuhan disabilitas tidak tercampur dengan permintaan PDP.
- Audit otomatis tidak menggantikan pengujian keyboard dan screen reader pada `20`.

## G. Otorisasi

- Hanya ADMIN mengelola governance, alert, status, privacy, retention, dan accessibility issue.
- EDITOR dapat melihat due date/revision Post miliknya dan menandai “siap direview”, tetapi tidak mengubah owner/policy.
- PETUGAS/SATGAS tidak mendapat akses modul ini kecuali data agregat yang memang ada pada dashboard mereka.
- Permission privacy dan export diperiksa di action/query/download; menyembunyikan menu tidak cukup.

## H. Uji terima

- Konten melewati reviewDueAt muncul sebagai stale dan memicu digest tepat sekali per minggu.
- Perubahan ID menandai translation lama stale; fallback publik tetap benar.
- Restore revision menghasilkan revision baru dan dapat dibatalkan lagi.
- Alert terjadwal muncul/hilang tepat waktu pada ID/EN/AR, mobile, dan screen reader.
- Insiden status dapat membuat dan menyelesaikan alert tanpa kehilangan timeline.
- Consent versi lama tetap dapat diaudit setelah privacy notice baru terbit.
- Data request tidak dapat dilacak dengan nomor tanpa token dan export kedaluwarsa setelah 24 jam.
- Erasure preview menghormati retention hold dan tidak menghapus audit log.
- Accessibility statement dapat memuat known issues dan permintaan format alternatif berhasil dilacak.

## Referensi kebijakan

- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi: https://peraturan.bpk.go.id/Details/229798/uuno-27-tahun-2022
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WAI accessibility statement/reporting principles: https://www.w3.org/WAI/planning/statements/
