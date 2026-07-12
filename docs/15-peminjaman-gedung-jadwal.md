# 15 — Peminjaman Gedung/Ruangan & Jadwal Publik

Sistem agar sivitas (prodi, ormawa, unit, mahasiswa) dapat **mengajukan peminjaman ruangan/gedung fakultas**, admin **menyetujui/menolak**, dan **jadwal pemakaian tampil di website** sehingga semua orang tahu ruangan terpakai kapan.

Model: `Room` + `Booking` (lihat `02`).

---

## A. Data ruangan (`Room`)

Dikelola admin di `/admin/ruangan`. Contoh isi untuk FUSPI: Aula, Ruang Sidang/Rapat, Ruang Seminar, Laboratorium (LSQH, dsb.), Ruang Teater/Multimedia.

Field: nama, kode (`AULA-01`), kapasitas, lokasi (gedung/lantai), foto, fasilitas, **jadwal operasional per hari** dalam menit lokal, buffer antar-kegiatan (default 30 menit), butuh persetujuan, aktif, dan urutan. Tambahkan `RoomBlackout` untuk maintenance/libur/penutupan sementara.

> Jam operasional dipakai untuk memvalidasi pengajuan — pengajuan di luar jam operasional ditolak otomatis dengan pesan jelas.

---

## B. Alur pemohon (publik)

### 1. Lihat ketersediaan dulu — `/jadwal-ruangan`
**Ini halaman kuncinya.** Tampilkan **kalender** berisi semua booking berstatus `DISETUJUI`.

- **Library: FullCalendar** (`@fullcalendar/react`). Dipilih karena punya **dukungan RTL bawaan** — penting karena situs ini wajib mendukung Arabic (lihat `12`). Alternatif `react-big-calendar` tidak sekuat itu untuk RTL.
- Tampilan: **Bulan / Minggu / Hari**, plus **filter per ruangan** (dropdown atau warna berbeda per ruangan).
- Isi setiap entri jadwal: **nama kegiatan, ruangan, jam**.
- **Privasi:** JANGAN tampilkan email, nomor HP, atau NIM pemohon di jadwal publik. Cukup nama kegiatan + unit/organisasi penyelenggara.
- Booking dengan `isPublic = false` (mis. rapat internal tertutup) tetap **memblokir slot** tetapi ditampilkan sebagai **"Terpakai"** tanpa detail kegiatan.
- Responsif: di mobile, kalender bulan sulit dibaca — **default ke tampilan daftar/agenda** di layar kecil (FullCalendar punya view `listWeek`). Jangan biarkan kalender terpotong (lihat aturan mobile `03`).

### 2. Ajukan peminjaman — `/peminjaman`
Form:
- **Ruangan** (select; tampilkan kapasitas & fasilitas saat dipilih).
- **Tanggal & jam mulai–selesai** (datetime picker).
- **Cek ketersediaan langsung**: setelah memilih ruangan + waktu, sistem menampilkan **"Tersedia ✓"** atau **"Bentrok dengan kegiatan lain"** secara real-time, sebelum submit. Ini mencegah frustrasi.
- Nama kegiatan, Maksud/keperluan, Perkiraan jumlah peserta.
- Pemohon: Nama, Unit/Prodi/Ormawa, Email, No. HP, NIM/NIP.
- **Surat permohonan** PDF maksimal 10 MB; field boleh kosong saat submit dan wajib diisi sebelum ADMIN/PETUGAS menyetujui booking yang `needsApproval=true`.
- Kebutuhan tambahan (kursi, sound system, dll.).
- Checkbox: tampilkan kegiatan ini di jadwal publik (`isPublic`), dan usul tampil di Agenda fakultas (`publishToAgenda`).
- Persetujuan tata tertib pemakaian.

Setelah submit → **nomor pengajuan** (`PJM-2026-0001`) + **token pelacakan**, dikirim ke layar & email pemohon. Status awal: `PENGAJUAN`.

### 3. Lacak status — `/peminjaman/lacak`
Masukkan nomor + token → lihat status (Diajukan / Disetujui / Ditolak beserta alasan), dan tombol **Batalkan** (bila belum terlaksana).

---

## C. Deteksi bentrok (paling penting secara teknis)

Booking ganda adalah kegagalan paling fatal di sistem seperti ini. Tangani dengan benar:

**Aturan overlap hard conflict:** dua booking `DISETUJUI` pada ruangan yang sama bentrok bila
```
newStart < existingEnd  AND  newEnd > existingStart
```
(slot diperluas dengan buffer ruangan). Booking `PENGAJUAN` lain tidak mengunci slot; UI memberi peringatan "ada permohonan lain pada waktu ini", tetapi submission tetap boleh. Hanya satu yang dapat disetujui.

**Wajib:**
- Saat submit, cek ketersediaan untuk memberi peringatan dan validasi blackout. Saat approve/auto-approve, cek hard conflict **di server** dalam satu transaksi Serializable; client-side tidak pernah menjadi pengaman.
- Saat admin **menyetujui** tiket, cek ulang bentrok terhadap booking `DISETUJUI` lain. Bila bentrok → tolak persetujuan dengan pesan jelas ("Bentrok dengan PJM-2026-0007").
- Validasi final: `endTime > startTime`, durasi maksimum 12 jam, tidak melewati tanggal lokal, tidak di masa lalu, berada dalam jam operasional, tidak mengenai blackout, peserta tidak melebihi kapasitas, dan buffer ikut overlap.
- Gunakan interactive `$transaction` dengan `isolationLevel: Serializable` dan retry maksimal 5 kali untuk `P2034`. Transaksi melakukan cek overlap lalu update status; bila konflik, kembalikan nomor booking penyebab tanpa data pemohon.
- `needsApproval=false` tetap menjalankan transaksi yang sama saat submit, lalu langsung menjadi `DISETUJUI` bila bebas konflik.

---

## D. Alur admin

### `/admin/peminjaman`
- Tabel pengajuan: Nomor · Ruangan · Kegiatan · Pemohon/Unit · Waktu · Status · Diajukan pada.
- **Filter**: status, ruangan, rentang tanggal. Badge jumlah **PENGAJUAN** (menunggu) di sidebar.
- **Tampilan kalender admin** juga tersedia (menampilkan `PENGAJUAN` + `DISETUJUI` dengan warna berbeda) agar mudah melihat konflik.

### Detail pengajuan
- Semua data pemohon + surat permohonan (PDF dirender dengan `PdfViewer` dari `11-C`).
- Tombol: **Setujui** · **Tolak** (wajib isi alasan) · **Ubah waktu/ruangan** (bila menawarkan alternatif).
- Saat **Setujui**: cek bentrok ulang → set `status=DISETUJUI`, `approvedById`, `approvedAt` → kirim email ke pemohon → jadwal langsung muncul di kalender publik (`revalidatePath`).
- Saat **Tolak**: isi `rejectReason` → email ke pemohon.
- Bila `publishToAgenda` dicentang & disetujui → tombol **"Terbitkan ke Agenda"** melakukan upsert berdasarkan relasi unik `Event.sourceBookingId`, sehingga klik ulang tidak membuat agenda ganda.

### Otomatis
- Booking `DISETUJUI` dengan `endTime < now()` ditampilkan sebagai selesai secara turunan saat query. Status persisten diselaraskan ketika record berikutnya dimutasi; tidak memerlukan cron khusus.

### Hak akses
- **ADMIN** dan **PETUGAS** dapat mengelola peminjaman. **EDITOR** tidak.

---

## E. Integrasi & tampilan di website

- **Menu:** tambahkan **"Peminjaman Ruangan"** di grup Layanan, dengan submenu: Jadwal Ruangan · Ajukan Peminjaman · Lacak Pengajuan.
- **Beranda:** tambahkan **Akses Cepat** (`QuickLink`) ke "Jadwal Ruangan" dan "Ajukan Peminjaman".
- **Section beranda (opsional):** "Kegiatan Minggu Ini" — daftar ringkas booking disetujui dalam 7 hari ke depan. Sembunyikan bila kosong.
- **Halaman ruangan** `/ruangan` dan `/ruangan/[code]`: profil tiap ruangan (foto, kapasitas, fasilitas) + kalender khusus ruangan itu + tombol "Ajukan Peminjaman".

---

## F. Catatan implementasi

- **Zona waktu:** simpan `DateTime` UTC, tampilkan `Asia/Jakarta`. Kalender **wajib** memakai timezone eksplisit — kesalahan zona waktu di sistem booking menghasilkan jadwal meleset berjam-jam.
- **Multibahasa:** nama & fasilitas ruangan diterjemahkan (`RoomTranslation`, lihat `12`). Label kalender (Bulan/Minggu/Hari, nama hari) ikut locale; FullCalendar mendukung locale `id`/`en`/`ar` dan `direction: 'rtl'`.
- **Anti-spam:** honeypot + rate limit (lihat `13-A`). Wajibkan email valid.
- **Notifikasi email:** pengajuan diterima, disetujui, ditolak, dan dibatalkan dikirim melalui SMTP Hostinger + transactional outbox. Kegagalan email tidak membatalkan perubahan booking.
- **Nomor & token:** `PJM-{tahun}-{urut}` memakai `AnnualSequence` atomik. Token 32 byte hanya disimpan sebagai HMAC-SHA-256 dan mengikuti mekanisme cookie pertukaran yang sama dengan tiket.
- **Pembatalan:** pemohon dapat membatalkan dengan token hanya sebelum `startTime`. Pembatalan dicatat dalam `BookingHistory`; booking lampau tidak dapat dibatalkan.
- **Aksesibilitas:** kalender harus dapat dinavigasi keyboard; sediakan **tampilan daftar** sebagai alternatif tabel kalender bagi pengguna screen reader.
- **Ekspor:** admin bisa ekspor CSV pemakaian ruangan per periode — berguna untuk laporan sarana-prasarana & akreditasi.

---

## G. Perubahan pada dokumen lain

- **`02`** — model baru `Room`, `Booking`; enum `BookingStatus`; relasi `Booking.approvedBy` ke `User`.
- **`04`** — sidebar admin bertambah grup **Sarana**: Ruangan · Peminjaman.
- **`05`** — rute publik baru: `/jadwal-ruangan`, `/peminjaman`, `/peminjaman/lacak`, `/ruangan`, `/ruangan/[code]`.
- **`12`** — `RoomTranslation` (name, facilities); label kalender per locale + RTL.

---

## Catatan: Pengumuman & Agenda (sudah ada sebelumnya)

Untuk memastikan tidak ada kebingungan — keduanya **sudah tercakup** di dokumentasi:

- **Pengumuman** = `Post` dengan `type=PENGUMUMAN`. Punya: form admin (`04`), section beranda 2 kolom bersama Informasi (`05`), halaman `/pengumuman`, arsip per bulan/kategori (`11-B`).
- **Agenda kegiatan** = model `Event` (`02`). Punya: CRUD admin (`09-E`), section beranda berupa kartu tanggal + judul + lokasi yang otomatis tersembunyi bila kosong (`09-D`), halaman `/agenda` dan `/agenda/[slug]`.

Kini Agenda dan Peminjaman saling melengkapi: booking yang disetujui dan bersifat terbuka dapat **diterbitkan menjadi Agenda** dengan satu tombol.
