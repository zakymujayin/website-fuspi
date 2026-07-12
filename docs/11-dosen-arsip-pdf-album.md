# 11 — Direktori Dosen, Arsip Berita, Render PDF & Album

Dokumen ini menerjemahkan dua referensi yang Anda berikan ke spesifikasi konkret: **UIN Suka Ushuluddin** (`ushuluddin.uin-suka.ac.id` — bersih, rapi, punya arsip & album & render PDF) dan **Zaytuna Faculty** (`zaytuna.edu/faculty` — tampilan direktori dosen). Memperluas `04`, `05`, dan `02` (skema sudah ditambah).

---

## A. Direktori Dosen (pola Zaytuna)

### Halaman daftar `/dosen`
- **Grid kartu** responsif: 4 kolom (desktop) → 2 (tablet) → 1 (mobile). Setiap kartu: **foto** (aspect-square, object-cover, tidak terpotong aneh), **nama** (H4), **jabatan/prodi** (caption), cuplikan **bidang keahlian atau bio** (`line-clamp-2`), dan tautan **"Selengkapnya"**.
- **Filter** berdasarkan Program Studi (tab atau dropdown) dan **pencarian** nama.
- Urutan mengikuti field `order`, lalu nama. Foto hilang → tampilkan inisial dalam lingkaran `royal-100`.

### Halaman detail `/dosen/[id]`
Tata letak dua kolom (di mobile menumpuk): kiri foto + info ringkas (email, office hours, prodi, tautan Scholar/Sinta), kanan **biografi lengkap** (`bio`, dirender dari rich text). Struktur meniru Zaytuna: **Biography**, **Email**, **Office Hours**, **bidang keahlian**. Sertakan breadcrumb dan tombol kembali ke daftar.

Field yang dipakai (sudah di skema `Lecturer`): `name, photo, position, prodi, expertise, bio, officeHours, email, scholarUrl, sintaUrl`.

### Admin
Form Dosen menambahkan **Biografi** (RichEditor) dan **Office Hours**. Import massal (`09-B`) tetap berlaku; kolom `bio` opsional di template.

---

## B. Arsip Berita (news archive)

Selain daftar terbaru, sediakan **arsip yang bisa ditelusuri** seperti UIN Suka (`/id/list/berita`).

### Halaman `/berita` (arsip utama)
- Daftar semua berita `PUBLISHED`, terbaru dulu, **paginasi** (mis. 12 per halaman).
- **Sidebar/panel arsip:**
  - **Arsip per bulan/tahun** — daftar "Juli 2026 (12)", "Juni 2026 (9)", dst. Klik → `/berita/arsip/2026/07`.
  - **Kategori** — daftar kategori dengan jumlah.
  - **Tag populer** (opsional).
  - **Pencarian** berita.
- Setiap entri: thumbnail, judul, tanggal, kategori, ringkasan (`line-clamp-2`).

### Rute arsip
- `/berita/arsip/[tahun]` — semua berita di tahun itu.
- `/berita/arsip/[tahun]/[bulan]` — per bulan.
- `/berita/kategori/[slug]` — per kategori.
- `/tag/[slug]` — per tag.
Semua memakai paginasi dan menampilkan judul konteks ("Arsip: Juli 2026").

### Query
Kelompokkan arsip dengan agregasi tanggal `publishedAt` (mis. `GROUP BY YEAR, MONTH`). Cache hasil agregasi ringan bila perlu. Pola arsip ini juga dipakai untuk **Pengumuman** dan **Kolom**.

---

## C. Upload & render PDF (tampil langsung, bukan hanya unduh)

Untuk Dokumen, Pedoman Akademik, dokumen Kerjasama (MoU), dsb. — PDF harus **terender langsung** di halaman, seperti UIN Suka.

### Komponen `PdfViewer`
- Render PDF publik maupun privat memakai **`react-pdf`/pdf.js** ke canvas responsif. Ini pilihan final; iframe bukan viewer utama.
- Sediakan tombol: **Unduh**, **Buka di tab baru**, dan **layar penuh**.
- Set lebar canvas mengikuti kontainer, lazy-render halaman, dan konfigurasi CSP `worker-src` untuk worker pdf.js. Mobile tidak boleh mengalami scroll horizontal.

### Halaman & pemakaian
- `/dokumen` — daftar dokumen (judul, kategori, ukuran, tanggal) + tombol "Lihat" → `/dokumen/[id]` yang menampilkan `PdfViewer`.
- Field bukti Kerjasama (`documentUrl`), Penelitian (`fileUrl`), Pengabdian, Beasiswa — bila PDF, tampilkan tombol "Lihat" yang membuka `PdfViewer` dalam dialog.
- Upload PDF sudah didukung pipeline `07` (tipe `application/pdf` diizinkan). Simpan `fileSize` untuk ditampilkan.

### Keamanan
Sanitasi nama file; batasi tipe ke `application/pdf`; jangan mengeksekusi apa pun dari file. Serve sebagai statis dengan header `Content-Type: application/pdf`.

---

## D. Album / Galeri Foto (pola UIN Suka)

Fitur dokumentasi kegiatan berupa **album foto** (berbeda dari galeri yang menempel di satu kegiatan).

### Publik
- `/album` — grid kartu album (foto sampul + judul + tanggal + jumlah foto). Responsif 3→2→1.
- `/album/[slug]` — galeri **grid masonry/uniform** foto album; klik foto → **lightbox** (navigasi kiri/kanan, caption, tombol tutup, swipe di mobile). Gambar pakai aspect-ratio tetap agar rapi, lightbox menampilkan versi penuh tanpa terpotong.

### Admin `/admin/album`
- CRUD Album: judul → slug, deskripsi, tanggal, foto sampul.
- Dalam album: **upload banyak foto sekaligus**, atur caption, **urutkan dengan drag** (pakai `SortableList` dari `10-A`), hapus foto. Model `Album` + `AlbumPhoto` sudah di skema.

---

## E. Prinsip desain dari UIN Suka (bersih & rapi) — diadopsi ke `03`/`05`

- **Header bersih** dengan logo, menu utama ringkas, dan **switcher bahasa** di pojok (lihat catatan multibahasa di bawah).
- **Baris tautan cepat konten** di paling atas (berita · kolom · pengumuman · dokumen · album · agenda) — tautan langsung ke arsip tiap tipe. Bisa kita tiru sebagai bar tipis di atas header.
- Banyak ruang putih, kartu konten seragam, tipografi tenang. Ini selaras dengan arah "Dignified Academic Modern" di `03`.
- Semua tipe konten punya halaman **arsip `/list`-style** sendiri yang konsisten.

### Keputusan final (DIREVISI — multibahasa wajib)

> **REVISI PENTING:** keputusan "Bahasa Indonesia saja" **DIBATALKAN**. Website **wajib mendukung 3 bahasa (Indonesia, English, Arabic) dengan dukungan RTL penuh** untuk Arabic. Lihat **`12-multibahasa-rtl.md`** untuk spesifikasi lengkap — dokumen itu mengikat dan mengubah skema, routing, serta design system.

Ruang lingkup lain tetap:

- **Program: S1 saja** (5 prodi FUSPI). Field `degree` tetap ada di skema untuk masa depan, tapi UI tidak perlu mengelompokkan per jenjang S1/S2/S3.
- **Tracer Study / Alumni:** cukup **tautan eksternal** (via `ExternalLink`/menu) ke form tracer study + halaman statis "Profil Lulusan". TIDAK ada modul alumni tersendiri.

Agen: **multibahasa ID/EN/AR wajib dibangun** sesuai `12`. Yang tidak dibangun hanya pengelompokan jenjang S2/S3 dan modul alumni penuh.

---

## F. Ringkasan penambahan

| Kebutuhan (dari referensi) | Solusi | Lokasi |
|---|---|---|
| Tampilan dosen gaya Zaytuna (kartu → detail bio) | `bio`, `officeHours` + halaman detail | 11-A, 02 |
| Arsip berita bisa ditelusuri (per bulan/tahun/kategori) | rute `/berita/arsip/...` + panel arsip | 11-B |
| Upload PDF terender langsung | komponen `PdfViewer` (iframe / react-pdf) | 11-C |
| Album foto (galeri + lightbox) | model `Album`/`AlbumPhoto` + halaman | 11-D, 02 |
| Desain bersih & rapi | prinsip UIN Suka diadopsi | 11-E, 03 |
| Multibahasa | wajib ID/EN/AR + RTL | 12 |
