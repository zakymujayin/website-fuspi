# 14 — Sistem Tiket Pengaduan (dengan Kanal PPKS Terlindungi)

Menggantikan "pengaduan sebagai formulir sederhana" di `13-A`. Pengaduan kini menjadi **sistem tiket penuh**: nomor tiket, skala prioritas, status, penugasan petugas, SLA, dan pelacakan oleh pelapor.

> **⚠️ PERINGATAN UNTUK AGEN CODING:** kategori **Pelecehan Seksual (PPKS)** bukan kategori biasa. Ia menyangkut keselamatan dan martabat orang. Aturan akses, kerahasiaan, dan alur di **bagian D** bersifat **wajib dan tidak boleh disederhanakan** demi kemudahan implementasi. Jika ragu, pilih opsi yang lebih melindungi pelapor.

---

## A. Kategori & skala prioritas

### Kategori pengaduan (`ComplaintCategory`)
| Kategori | Cakupan |
|---|---|
| **AKADEMIK** | Nilai, KRS, jadwal, perkuliahan, dosen, layanan administrasi akademik |
| **KEMAHASISWAAN** | Beasiswa, organisasi mahasiswa, kegiatan, layanan kemahasiswaan |
| **SARANA** | Fasilitas, sarana-prasarana, kebersihan, keamanan gedung |
| **PELECEHAN_SEKSUAL** | Kekerasan/pelecehan seksual (PPKS) — **kanal terlindungi, lihat D** |
| **LAINNYA** | Di luar kategori di atas |

### Skala prioritas (`TicketPriority`) + SLA
| Prioritas | Definisi | Target respons awal | Target penyelesaian |
|---|---|---|---|
| **URGENT** | Ada ancaman keselamatan, kekerasan berlangsung, atau berdampak luas & mendesak | **1 × 24 jam** | 3 hari kerja |
| **TINGGI** | Menghambat hak akademik penting (mis. terancam gagal semester, nilai tidak keluar menjelang batas) | 2 hari kerja | 7 hari kerja |
| **SEDANG** | Gangguan layanan yang perlu ditindak namun tidak mendesak | 3 hari kerja | 10 hari kerja |
| **RENDAH** | Saran, keluhan ringan, permintaan informasi | 5 hari kerja | 14 hari kerja |

**Aturan penetapan prioritas:**
- Pelapor **boleh mengusulkan** prioritas, tetapi **petugas berwenang menyesuaikan** setelah verifikasi (cegah semua tiket ditandai "urgent").
- Tiket kategori **PELECEHAN_SEKSUAL** otomatis diset **minimal TINGGI**; bila pelapor menyatakan ada ancaman keselamatan/kekerasan berlangsung → otomatis **URGENT**.
- Simpan dua tenggat: `responseDueAt` dan `resolutionDueAt`. Keduanya dihitung dalam `Asia/Jakarta`, melewati Sabtu/Minggu dan tabel `Holiday` yang dikelola ADMIN.
- SLA berhenti saat status `MENUNGGU_PELAPOR`; waktu pause diakumulasikan dan tenggat digeser ketika pelapor membalas.
- Perubahan prioritas wajib mencatat alasan dan menghitung ulang tenggat dari waktu perubahan. Jangan menghapus tenggat/riwayat lama.
- Tiket yang melewati salah satu tenggat diberi penanda **"Respons terlambat"** atau **"Penyelesaian terlambat"**.

---

## B. Alur pelapor (publik)

### Halaman `/pengaduan`
Tampilkan **pilihan kanal** lebih dulu, jangan langsung form panjang:
1. **Pengaduan Layanan Akademik**
2. **Pengaduan Kemahasiswaan**
3. **Pengaduan Sarana & Prasarana**
4. **Pelaporan Kekerasan/Pelecehan Seksual** — ditampilkan dengan perlakuan berbeda (lihat D)
5. Lainnya

### Form pengaduan umum (kategori 1–3, 5)
- Identitas: Nama, Email, No. HP, NIM & Prodi (bila mahasiswa). **Boleh anonim** — bila anonim, pelapor tetap dapat nomor tiket & token pelacakan.
- Subjek, Uraian kejadian, Tanggal kejadian (opsional).
- **Lampiran** (opsional): PDF/gambar, maks 5MB per file, maks 3 file.
- Usulan prioritas (dengan penjelasan singkat tiap tingkat).
- Persetujuan: pernyataan bahwa laporan dibuat dengan benar.

### Setelah kirim
- Sistem membuat **nomor tiket** (format: `FUSPI-2026-0001`) lewat counter tahunan atomik + **token pelacakan 32 byte** acak.
- Tampilkan di layar **dan** kirim ke email pelapor (bila ada): nomor tiket + tautan lacak.
- **PENTING:** karena laporan boleh anonim, **token pelacakan adalah satu-satunya cara** pelapor melihat status. Tampilkan peringatan jelas: "Simpan nomor tiket dan tautan ini — tanpa itu Anda tidak dapat memantau laporan."

### Halaman lacak `/pengaduan/lacak`
- Input awal: nomor tiket + token melalui POST. Tautan email membuka halaman yang menukar token sekali menjadi cookie `HttpOnly; Secure; SameSite=Strict` berumur 30 menit, lalu membersihkan token dari URL dengan redirect. Token tidak boleh masuk analytics, log aplikasi, referrer, atau browser URL setelah pertukaran.
- Menampilkan: status, prioritas, riwayat balasan **publik** dari petugas (catatan internal **tidak** ditampilkan), dan kotak balasan agar pelapor bisa menambah informasi.
- **Jangan** pernah menampilkan identitas petugas secara detail berlebihan; cukup "Petugas Layanan" atau nama singkat sesuai kebijakan.

---

## C. Alur petugas (admin)

### Dashboard tiket `/admin/pengaduan`
- Tabel tiket: Nomor · Kategori · Subjek · Prioritas (badge warna) · Status · Petugas · Batas waktu · Umur tiket.
- **Filter**: kategori, prioritas, status, petugas, rentang tanggal, "Terlambat".
- **Badge warna prioritas** (pakai token `03`): URGENT → `danger` · TINGGI → `warning` · SEDANG → `info`/royal · RENDAH → `slate`.
- Badge jumlah tiket **BARU** di sidebar.

### Detail tiket umum `/admin/pengaduan/[id]`
- Ringkasan pelapor (atau "Anonim"), uraian, lampiran (PDF dirender dengan `PdfViewer` dari `11-C`).
- Aksi: ubah **status**, ubah **prioritas** (wajib isi alasan), **tugaskan** ke petugas, tulis **balasan publik** (terlihat pelapor) atau **catatan internal** (tidak terlihat pelapor — bedakan visualnya dengan jelas agar tidak salah kirim), tulis **resolusi** saat menutup.
- Riwayat lengkap (timeline) semua perubahan & balasan.

### Alur status
```
BARU → DIVERIFIKASI → DIPROSES → (MENUNGGU_PELAPOR ⇄ DIPROSES) → SELESAI
                                                              ↘ DITOLAK (wajib beri alasan)
```

### Notifikasi
- Email ke petugas saat tiket baru masuk (khususnya URGENT).
- Email ke pelapor saat status berubah atau ada balasan (bila pelapor mencantumkan email).
- Tanpa email → pelapor tetap bisa memantau lewat halaman lacak.

### Laporan
- Ekspor CSV + statistik: jumlah tiket per kategori/prioritas/status, rata-rata waktu penyelesaian, % tiket memenuhi SLA. **Berguna untuk dokumen akreditasi** (bukti layanan pengaduan berjalan).
- Statistik PPKS **hanya berupa angka agregat** (jumlah kasus & status) — tanpa detail apa pun.

---

## D. Kanal PPKS (Pelecehan Seksual) — ATURAN KHUSUS, WAJIB

Kanal ini menyangkut keselamatan orang. Perlakukan berbeda dari awal.

### D1. Akses sangat terbatas (paling penting)
- Daftar/detail PPKS memakai namespace terpisah `/admin/pengaduan/ppks` dan `/admin/pengaduan/ppks/[id]`; route umum selalu menolak category PPKS sebelum memilih field.
- Tiket berkategori `PELECEHAN_SEKSUAL` **hanya dapat dibuka oleh user berrole `SATGAS_PPKS`**.
- **Role `ADMIN` dan `PETUGAS` TIDAK dapat melihat isi tiket PPKS** — mereka hanya melihat **jumlah agregat** (mis. "3 laporan aktif"), tanpa subjek, uraian, identitas, maupun lampiran.
- Ini disengaja: pelaku bisa saja orang dalam. Membatasi akses adalah perlindungan, bukan birokrasi.
- Penegakan di **query level**, bukan sekadar menyembunyikan di UI: setiap query tiket wajib memfilter `category = PELECEHAN_SEKSUAL` kecuali `role === "SATGAS_PPKS"`. Terapkan di satu helper terpusat (`lib/queries/ticket.ts`) sehingga tidak mungkin terlewat di satu tempat.
- **Setiap akses dicatat** di `TicketAccessLog` (siapa, tiket mana, kapan, aksi apa). Log ini tidak bisa dihapus dari UI.
- `TicketAccessLog` juga mencatat akses ditolak, view, download, update, assign, close, dan export. SATGAS_PPKS hanya dapat membaca log kasus yang boleh diaksesnya; tidak ada action hapus. Database user aplikasi tidak diberi jalur delete log dari UI.

### D2. Form PPKS — rancang untuk korban, bukan untuk sistem
- **Anonim sepenuhnya diizinkan.** Jangan pernah mewajibkan nama, NIM, atau email.
- Jangan memaksa pelapor menceritakan detail. Uraian bebas, tanpa field wajib yang invasif. Tidak ada pertanyaan yang menyalahkan (jangan tanya "apa yang Anda kenakan", dsb.).
- Izinkan **melapor sebagai saksi/pihak ketiga**, bukan hanya korban langsung.
- Lampiran bukti bersifat opsional.
- Checkbox: "Ada ancaman keselamatan langsung" → set prioritas **URGENT** otomatis.

### D3. Dukungan di halaman form (WAJIB ditampilkan)
Di atas dan di bawah form, tampilkan dengan jelas:
- Pernyataan kerahasiaan: laporan hanya dibaca Satgas PPKS.
- Bahwa pelapor **berhak didampingi** dan berhak mencabut laporan.
- **Kontak Satgas PPKS** fakultas/universitas (nama unit, email, nomor).
- **Kontak layanan darurat & pendampingan** — misalnya SAPA 129 (layanan pengaduan kekerasan terhadap perempuan & anak, Kemen PPPA), serta layanan konseling kampus. **Verifikasi nomor & layanan yang berlaku saat implementasi** dan sesuaikan dengan kebijakan UIN SMH Banten.
- Kalimat jelas: **"Jika Anda dalam bahaya langsung, segera hubungi pihak berwajib (110) atau orang yang Anda percaya."**
- Nada halaman harus tenang, mendukung, dan tidak menghakimi.

### D4. Kepatuhan regulasi
Penanganan kekerasan seksual di perguruan tinggi Indonesia diatur oleh Permendikbudristek tentang PPKS/PPKPT dan aturan turunan PTKIN. **Agen: jangan mengarang isi regulasi.** Sebelum go-live, pemilik proyek wajib memverifikasi ke **Satgas PPKS UIN SMH Banten** hal-hal berikut, lalu sesuaikan sistem:
- Siapa yang berhak mengakses laporan dan bagaimana alur penanganannya.
- Batas waktu penanganan resmi.
- Kewajiban pelaporan ke tingkat universitas.
- Format/isi laporan yang dibutuhkan.

Sistem ini adalah **kanal penerimaan laporan**, bukan pengganti proses penanganan resmi Satgas.

### D5. Keamanan teknis tambahan
- Lampiran tiket PPKS **jangan** disimpan di folder `/uploads` publik (yang bisa diakses siapa saja yang tahu URL-nya). Simpan di direktori **di luar `public_html`** dan sajikan lewat route terproteksi yang mengecek role `SATGAS_PPKS` sebelum mengirim file. Ini krusial — URL tebakan tidak boleh membocorkan bukti.
- Jangan kirim isi laporan di badan email notifikasi; cukup "Ada laporan baru, silakan login".
- Jangan catat IP mentah; cukup `ipHash`.
- Jangan tampilkan laporan PPKS di log aktivitas umum, statistik publik, atau ekspor CSV umum.
- `subject`, `description`, identitas pelapor, reply, resolution, dan attachment PPKS **wajib dienkripsi di tingkat aplikasi** memakai AES-256-GCM serta key version. Field pencarian/filter PPKS dibatasi ke metadata non-sensitif.

---

## E. Integrasi & catatan implementasi

- **Nomor tiket**: `FUSPI-{tahun}-{urut 4 digit}` menggunakan `AnnualSequence(kind=TICKET, year)` yang di-increment atomik dalam transaksi Serializable. Retry maksimal 5 kali untuk error konflik/deadlock Prisma `P2034`.
- **Token pelacakan**: 32 byte dari `crypto.randomBytes`; hanya HMAC-SHA-256 dengan `TOKEN_HMAC_SECRET` yang disimpan sebagai `trackingTokenHash`. Token asli ditampilkan/dikirim sekali dan tidak bisa dipulihkan dari database.
- Percobaan lacak dibatasi 10/15 menit per HMAC IP dan 5/15 menit per nomor tiket. Respons gagal selalu generik agar nomor valid tidak dapat dienumerasi.
- **Anti-spam**: honeypot + rate limit per IP-hash + Turnstile (lihat `13-A`). Namun **jangan pasang captcha yang menyulitkan** di form PPKS — jangan sampai hambatan teknis membuat korban urung melapor; cukup honeypot + rate limit longgar.
- **Multibahasa**: label kategori, prioritas, status, dan teks bantuan harus diterjemahkan (ID/EN/AR) sesuai `12`. Isi laporan disimpan apa adanya (bahasa pelapor).
- **Aksesibilitas**: form pengaduan wajib dapat dinavigasi keyboard & screen reader (`13-G`).
- **Hapus/retensi data**: sampai kebijakan tertulis Satgas disahkan, semua tiket PPKS berada dalam retention hold: tidak ada delete UI, cascade delete user, atau job penghapusan otomatis. User yang dinonaktifkan dipertahankan sebagai identitas audit. Kebijakan final wajib ditetapkan sebelum hold boleh diubah.

### Transactional outbox email

- Pembuatan tiket, perubahan status, dan balasan menulis `NotificationOutbox` dalam transaksi yang sama dengan data tiket.
- SMTP Hostinger mengirim outbox melalui cron setiap 5 menit. Retry eksponensial maksimal 5 kali; kegagalan permanen tampil di dashboard ADMIN/SATGAS sesuai sensitivitas.
- Kegagalan SMTP tidak membatalkan tiket/balasan. Idempotency key mencegah email ganda.
- Email PPKS hanya berbunyi bahwa ada pembaruan dan meminta penerima login; subject, identitas, uraian, serta lampiran tidak pernah masuk email.

### Definisi pelaporan SLA

- `firstRespondedAt` diisi pada balasan publik pertama oleh petugas, bukan catatan internal.
- Response SLA terpenuhi bila `firstRespondedAt <= responseDueAt`.
- Resolution SLA terpenuhi bila `closedAt <= resolutionDueAt` setelah mengurangi interval pause.
- Statistik menyimpan dan membaca timeline historis; perubahan priority/status tidak boleh menulis ulang fakta lama.

## F. Perubahan pada dokumen lain

- **`02`** — `Role` bertambah: `PETUGAS`, `SATGAS_PPKS`. Model baru: `Ticket`, `TicketReply`, `TicketAttachment`, `TicketAccessLog`, enum `ComplaintCategory`/`TicketPriority`/`TicketStatus`. `FormSubmission` hanya untuk KONTAK; SURVEI memakai model berversi.
- **`13-A`** — bagian "Pengaduan" digantikan dokumen ini.
- **`06`** — middleware & otorisasi harus mengenali role `PETUGAS` (akses `/admin/pengaduan` non-PPKS) dan `SATGAS_PPKS` (akses tiket PPKS). `ADMIN` **tidak** otomatis mendapat akses PPKS.
- **`07`** — tambahkan jalur penyimpanan terproteksi (di luar `public_html`) untuk lampiran PPKS.
