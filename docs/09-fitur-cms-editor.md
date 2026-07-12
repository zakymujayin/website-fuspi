# 09 — Fitur CMS Lengkap (Editor, Import, Section Beranda)

Dokumen ini melengkapi gap fitur yang ditemukan dari audit kebutuhan FUSPI dan pemetaan situs FUDA (`fuda.uinbanten.ac.id`) sebagai referensi eksternal. Ia **memperluas** `02` (skema sudah ditambah), `04` (admin), dan `05` (publik). Data dan identitas FUDA tidak ikut disalin.

---

## A. Rich Text Editor (Tiptap) — spesifikasi penuh

Editor dipakai di form Berita, Pengumuman, Kolom, Halaman, dan deskripsi Prodi. Bangun sebagai komponen `RichEditor` yang dipakai ulang.

### Toolbar (wajib ada)
- **Teks:** Bold, Italic, Underline, Strikethrough, Inline code
- **Heading:** H2, H3, H4, Paragraf
- **Daftar:** bullet list, numbered list
- **Blockquote**, **horizontal rule**
- **Perataan teks:** kiri, tengah, kanan, justify (extension `TextAlign`)
- **Tautan:** tambah/hapus link (dengan opsi buka tab baru)
- **Gambar:** sisip gambar (dari media picker/upload) — lihat di bawah
- **Embed video:** sisip YouTube (lihat di bawah)
- **Tabel:** sisip/edit tabel (extension `Table`)
- **Undo / Redo**

Extension Tiptap yang dipakai:
```
@tiptap/starter-kit
@tiptap/extension-underline
@tiptap/extension-text-align
@tiptap/extension-link
@tiptap/extension-image
@tiptap/extension-youtube
@tiptap/extension-table (+ table-row, table-cell, table-header)
```

### Gambar dalam konten + atur posisi kiri/tengah/kanan (WAJIB)

Ini fitur yang diminta khusus. Saat menyisipkan gambar ke isi artikel, editor harus menyediakan kontrol **perataan** dan **lebar**.

Gunakan node image kustom (extend `@tiptap/extension-image`) yang menyimpan atribut `data-align` dan `width`.

> **PENTING (RTL):** simpan nilai align sebagai **`start` | `center` | `end`** — BUKAN `left`/`right`. Alasannya situs ini mendukung Arabic RTL (lihat `12`): "rata kiri" pada teks Arab harus menjadi rata kanan secara visual. Di UI editor, label tetap ditampilkan sebagai "Kiri/Tengah/Kanan" mengikuti arah bahasa yang sedang diedit, tapi yang disimpan adalah `start`/`end`. Render memakai `float: inline-start` / `inline-end` sehingga otomatis benar di kedua arah.

Saat gambar dipilih di editor, tampilkan **bubble toolbar** kecil berisi tombol: Rata Kiri · Rata Tengah · Rata Kanan · dan slider/pilihan lebar (25% / 50% / 75% / 100%).

Perilaku render:
- `align=start` → `float: inline-start; margin-inline-end: 1.5rem; margin-block-end: 1rem; max-width: 50%` (teks membungkus di sisi berlawanan).
- `align=end` → `float: inline-end; margin-inline-start: 1.5rem; margin-block-end: 1rem; max-width: 50%`.
- `align=center` → `display:block; margin: 1rem auto;` (blok, teks tidak membungkus).

Simpan sebagai HTML (`content` = LongText). Di frontend, render HTML lewat komponen `Prose` yang punya CSS untuk `figure[data-align]` sesuai aturan di atas. Sanitasi HTML sebelum render (pakai `isomorphic-dompurify` atau sejenis) untuk keamanan.

> Alur menyisipkan gambar: klik ikon gambar → buka **Media Picker** (komponen bersama dari `04`) → pilih/upload → gambar masuk ke editor dengan `align=center width=100%` default → pengguna atur posisi via bubble toolbar.

### Embed video (YouTube) dalam konten
Tombol "Sisip Video" meminta URL YouTube, lalu menyisipkan lewat extension `Youtube` (responsif, aspek 16:9). Ini berbeda dari section video beranda (bagian D).

---

## B. Import massal (Dosen, dan koleksi lain)

Fitur yang diminta: **import data dosen beserta foto**. Sediakan alur import yang bisa dipakai ulang untuk koleksi bervolume (Dosen, Penelitian, Pengabdian, Kerjasama).

### Alur import Dosen (`/admin/dosen/import`)
1. Tombol **"Import"** di halaman daftar Dosen.
2. Sediakan tombol **"Unduh Template"** → file CSV/XLSX contoh dengan kolom:
   `nama, nip, jabatan, bidang_keahlian, email, prodi_kode, scholar_url, sinta_url, nama_file_foto`
3. Pengguna mengisi template dan menyiapkan foto (nama file harus cocok dengan kolom `nama_file_foto`).
4. Upload dua bagian: **file CSV/XLSX** + **banyak file foto** sekaligus (multi-file).
5. Server memproses:
   - Parse CSV/XLSX (pakai `papaparse` untuk CSV atau `xlsx`/SheetJS untuk Excel).
   - Untuk tiap baris: validasi (Zod), cocokkan `prodi_kode` → `StudyProgram`, cocokkan `nama_file_foto` dengan foto terunggah → jalankan pipeline upload (`07`) → dapat URL → set `photo`.
   - Simpan ke `Lecturer`. Baris duplikat (berdasar `nip` atau `nama`) → opsi lewati atau perbarui.
6. Tampilkan **ringkasan hasil**: X berhasil, Y gagal (dengan alasan per baris), sebelum commit (mode pratinjau) atau setelah commit.

### Implementasi
- Endpoint `POST /api/import/lecturers` (multipart: `sheet` + `photos[]`), dilindungi auth.
- Maksimum 500 baris per file, diproses batch 50. Setiap baris memakai transaksi independen agar satu data buruk tidak membatalkan seluruh import.
- Kembalikan status per baris: CREATED, UPDATED, SKIPPED, atau FAILED beserta pesan validasi. Import wajib idempotent memakai NIP/kode unik; retry file yang sama tidak membuat duplikasi.

Pola yang sama (tanpa foto) berlaku untuk import **Penelitian**, **Pengabdian**, dan **Kerjasama** — cukup ganti kolom template & model target. Buat helper generik `parseSheet()` + validator per koleksi.

---

## C. Fitur CMS umum tambahan

Terapkan berikut agar setara CMS profesional:

- **Berita unggulan (`isFeatured`)** — toggle di form; beranda memakainya untuk highlight utama. Tabel daftar menampilkan bintang untuk yang unggulan.
- **Jadwal terbit** — bila `status=PUBLISHED` dan `publishedAt` di masa depan, konten belum tampil publik sampai waktunya. Query publik memfilter `publishedAt <= now()`. Beri label "Terjadwal" di admin.
- **Pratinjau draft** — tombol "Pratinjau" membuka `/berita/[slug]?preview=token` yang menampilkan draft hanya untuk sesi admin (cek auth di halaman preview).
- **SEO per konten** — field `metaTitle` & `metaDesc` (sudah di skema). `generateMetadata()` memakainya, fallback ke title/excerpt.
- **Tag** — input tag (buat-saat-ketik) pada Berita/Kolom; halaman publik `/tag/[slug]` menampilkan konten bertag.
- **Pencarian publik** — `/cari?q=` mencari tabel translation menggunakan FULLTEXT untuk ID/EN. Arabic memakai FULLTEXT bila konfigurasi MariaDB mendukungnya, selain itu fallback prefix/`LIKE` yang dibatasi. Fallback ID dideduplikasi berdasarkan parent ID.
- **Berita terkait** — di halaman detail, tampilkan 3 post satu kategori/tag terbaru.
- **Slug otomatis + cek unik** — dari judul, editable, tolak duplikat dengan pesan jelas.
- **Autosave draft wajib** untuk Post/Page: debounce 30 detik setelah perubahan, hanya saat DRAFT, dan menampilkan waktu simpan terakhir. Autosave mengirim `version`; konflik optimistic locking tidak boleh menimpa data.
- **Hitung tampilan** — `viewCount` naik saat halaman detail dibuka (server action ringan, hindari bot bila perlu).

---

## D. Section beranda tambahan (memperluas 05)

Selain 10 section di `05`, tambahkan berikut agar setara situs lama:

### Section Video (baru)
- Sumber: `SiteSetting.videoUrl` (YouTube) + `videoTitle` + `videoDesc`.
- Tampilan: judul section + garis brass, di kiri teks pengantar, di kanan pemutar YouTube responsif (16:9) dengan thumbnail + tombol play (lazy-load iframe saat diklik, demi performa).
- Dikelola di `/admin/pengaturan` (atau submenu "Beranda").

### Section Kerjasama — logo marquee berjalan (diperjelas)
- Sumber: `Partnership` dengan `isActive=true` yang punya `logo`.
- Tampilan: **marquee auto-scroll** (baris logo bergerak kontinu dari kanan ke kiri, loop mulus). Implementasi CSS `@keyframes` translateX dengan konten diduplikasi untuk loop tanpa jeda; **pause saat hover**; hormati `prefers-reduced-motion` (bila aktif, tampilkan grid statis tanpa animasi). Bisa dua baris dengan arah berlawanan untuk kesan dinamis.
- Logo grayscale → berwarna saat hover (opsional, halus).

### Section Akses Cepat (dikelola)
- Sumber: model `QuickLink` (label, ikon lucide, url, urutan, aktif).
- Tampilan: grid kartu ikon (Layanan, Pengaduan, Survei, E-Journal, PMB, E-Learning). Dikelola di `/admin/quicklink`.

### Section Agenda / Events
- Sumber: `Event` mendatang (`startDate >= now()`), urut terdekat.
- Tampilan: kartu tanggal (kotak tanggal besar) + judul + lokasi. Bila kosong, sembunyikan section (bukan tampilkan "tidak ada").
- Halaman publik `/agenda` + `/agenda/[slug]`. Admin `/admin/agenda` (CRUD standar).

### Langganan Newsletter — di luar scope v1
- Model `Subscriber` dipertahankan untuk ekspansi, tetapi v1 tidak menampilkan form publik dan tidak mengirim newsletter.

---

## E. Tambahan panel admin (memperluas 04)

Tambahkan ke sidebar & bangun:
- **Import** pada Dosen (dan Penelitian/Pengabdian/Kerjasama) — bagian B.
- **Agenda** (CRUD Event) — grup Konten.
- **Akses Cepat** (CRUD QuickLink) — grup Beranda.
- **Tag** — kelola tag (grup Konten).
- **Video Beranda** — bagian dari form Pengaturan/Beranda.
- **Subscriber** — daftar email (baca + ekspor CSV), ADMIN saja.
- Di form Berita/Kolom: tambah kontrol **Unggulan**, **Jadwal terbit**, **Tag**, **SEO (meta)**, tombol **Pratinjau**.

---

## Ringkasan: peta fitur → status setelah pembaruan

| Fitur | Status |
|---|---|
| Berita + gambar sampul | ✅ 04 |
| Gambar dalam konten + posisi kiri/tengah/kanan + lebar | ✅ 09-A |
| Editor lengkap (heading, tabel, link, align, embed) | ✅ 09-A |
| Import massal dosen + foto | ✅ 09-B |
| Buat halaman baru | ✅ 04 |
| Media library + picker | ✅ 04, 07 |
| Berita unggulan, jadwal, pratinjau, SEO, tag, pencarian, terkait | ✅ 09-C |
| Section berita beranda | ✅ 05 |
| Section video beranda (YouTube) | ✅ 09-D |
| Logo kerjasama marquee berjalan | ✅ 09-D |
| Akses cepat, agenda/events, newsletter | ✅ 09-D |
| Galeri foto kegiatan | ✅ 02 (ActivityImage) |
