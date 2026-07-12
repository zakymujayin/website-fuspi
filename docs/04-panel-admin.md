# 04 — Spesifikasi Panel Admin

Semua rute admin berada di bawah `/[locale]/admin`; proxy memberi redirect UX dan setiap loader/action/handler menjalankan otorisasi server (lihat `06`). Struktur tiap modul konten mengikuti pola CRUD bersama.

## Pola CRUD standar (template untuk semua koleksi)

Setiap koleksi punya tiga layar:

1. **Daftar** (`/admin/{modul}`) — `DataTable` (TanStack Table) dengan: kolom relevan, pencarian, filter status, paginasi, aksi per baris (Edit, Hapus). Tombol "Tambah" di kanan atas. Hapus memunculkan dialog konfirmasi.
2. **Tambah** (`/admin/{modul}/baru`) — form kosong.
3. **Edit** (`/admin/{modul}/[id]`) — form terisi.

Form memakai komponen `FormField` bersama + validasi Zod (skema di `lib/validations/`). Submit memanggil Server Action → validasi → Prisma → `revalidatePath()` rute publik terkait → redirect ke daftar + toast sukses. Error ditampilkan per field, dengan bahasa yang jelas ("Judul wajib diisi", bukan "validation error").

## Sidebar admin (`config/nav-admin.ts`)

Kelompokkan menu:

- **Dashboard**
- **Konten**: Berita · Pengumuman · Kolom · Halaman
- **Akademik**: Program Studi · Dosen · Tenaga Kependidikan · Penelitian · Pengabdian · Dokumen
- **Kemahasiswaan**: Beasiswa · Prestasi · Kegiatan
- **Relasi**: Kerjasama · Layanan
- **Beranda**: Slider · Sambutan Dekan & Statistik · Mitra Logo
- **Media**
- **Pengaturan** (ADMIN): Pengguna · Menu · Link Terkait · Pengaturan Situs
- **Tata Kelola** (ADMIN): Review Konten · Revision · Translation · Alert · Status Layanan · Privasi/PDP · Accessibility Issue

Item bertanda (ADMIN) hanya tampil untuk ADMIN. PETUGAS hanya melihat Dashboard, Pengaduan non-PPKS, Ruangan, dan Peminjaman. SATGAS_PPKS hanya melihat Dashboard dan Pengaduan PPKS. Sidebar bukan kontrol keamanan; handler tetap memeriksa permission matrix.

## Dashboard (`/admin`)

- 4 kartu statistik: total Berita published, total Halaman, total Dosen, total item Media.
- Daftar 5 berita terbaru (judul, status badge, tanggal, tombol edit).
- Aksi cepat: "Tulis Berita", "Tambah Pengumuman".

## Modul konten — detail field per form

### Berita / Pengumuman / Informasi (`Post`, type sesuai modul)
- **Judul** (text, wajib) → auto-generate **Slug** (editable, unik).
- **Ringkasan** (textarea, maks 500 char) — dipakai di kartu & meta description.
- **Gambar sampul** (media picker → `coverImage`).
- **Isi** (RichEditor Tiptap, wajib).
- **Kategori** (select dari `Category`).
- **Status** (DRAFT/PUBLISHED/ARCHIVED). Saat set PUBLISHED pertama kali, isi `publishedAt = now()`.
- Penulis diisi otomatis dari sesi (`authorId`).
- Tabel daftar: Judul · Kategori · Status · Tanggal · Aksi. Filter: status. Pencarian: judul.

### Kolom (`Post` type=KOLOM)
Sama seperti Berita, tambah field **Rubrik** (`columnType`: Dekan/Dosen/Mahasiswa).

### Halaman (`Page`)
- Judul → Slug, Isi (RichEditor), Gambar hero (opsional), Status (DRAFT/PUBLISHED), Induk (select Page untuk hierarki), Urutan.
- Tabel: Judul · Induk · Status · Terakhir diubah.

### Program Studi (`StudyProgram`)
- Nama, Kode (unik), Jenjang, Akreditasi, Tahun akreditasi, Deskripsi (RichEditor), Logo, **URL eksternal** (untuk prodi bersubdomain), Urutan, Aktif.

### Dosen (`Lecturer`)
- Nama, NIP, Foto, Jabatan, Bidang keahlian, Email, Scholar URL, Sinta URL, Prodi (select), Urutan, Aktif.
- Tabel: Foto · Nama · Prodi · Jabatan · Aktif.

### Tenaga Kependidikan (`Staff`)
- Nama, Foto, Jabatan, Unit, Urutan, Aktif.

### Penelitian (`Research`) & Pengabdian (`CommunityService`)
- Judul, Penulis (teks), Tahun, Tipe (Dosen/Mahasiswa), Abstrak/Deskripsi, File (upload PDF → `fileUrl`).
- Filter: tipe, tahun.

### Beasiswa (`Scholarship`)
- Judul, Penyelenggara, Deskripsi, Batas waktu (date), File, Aktif.

### Prestasi Mahasiswa (`Achievement`)
- Nama mahasiswa, Judul prestasi, Tingkat (Internasional/Nasional/Regional/Lokal), Tahun, Deskripsi, Gambar.

### Kegiatan Kemahasiswaan (`StudentActivity`)
- Judul, Deskripsi, Tanggal, Gambar.

### Kerjasama (`Partnership`) — penting untuk akreditasi
- Nama mitra, Logo, **Tingkat** (Internasional/Nasional/Lokal), Negara, Bidang/kategori, Tanggal mulai, Tanggal berakhir, Dokumen (MoU/MoA upload), Website, Deskripsi, Aktif, Urutan.
- Tabel: Logo · Mitra · Tingkat · Bidang · Periode · Dokumen. Filter: tingkat.
- Sediakan tombol **"Ekspor CSV"** di halaman daftar — memudahkan penyusunan lampiran akreditasi.

### Layanan (`Service`)
- Nama, Kategori (Akademik/Laboratorium/Umum), Deskripsi, Link, Ikon (opsional), Urutan, Aktif.

### Dokumen / Unduhan (`Document`)
- Judul, Kategori, File (upload).

## Modul beranda (singleton-ish)

### Slider (`HomeSlider`)
CRUD ringan: Gambar (wajib), Judul, Subjudul, Label CTA, URL CTA, Urutan, Aktif. Urutan **wajib** diatur dengan drag; field `order` tetap disimpan sebagai hasil reorder.

### Sambutan Dekan & Statistik (bagian dari `SiteSetting`)
Form tunggal: Nama dekan, Foto dekan, Pesan sambutan (textarea), Statistik Mahasiswa/Dosen/Tendik (angka).

### Mitra Logo
Dikelola lewat modul Kerjasama (logo mitra dengan `isActive` tampil di carousel beranda). Tidak perlu modul terpisah.

## Media Library (`/admin/media`)

- Grid thumbnail semua `Media`, terbaru dulu, paginasi/infinite scroll.
- Tombol **Upload** (multi-file). Klik item → panel detail: pratinjau, URL (tombol salin), alt text (editable), ukuran, tombol Hapus.
- **Media picker**: komponen dialog yang dipanggil dari field "Gambar sampul"/"Foto" di form mana pun — bisa pilih dari library atau upload baru, mengembalikan URL. Bangun sekali, pakai di semua form.
- Mekanisme upload di `07`.

## Pengaturan (ADMIN saja)

### Pengguna (`/admin/pengguna`)
- Daftar user (Nama, Email, Role, Aktif). Tambah/Edit: Nama, Email, Password (kosongkan saat edit bila tak diubah), Role, Aktif. Password di-hash bcrypt di server action.
- ADMIN tidak bisa menghapus/menonaktifkan dirinya sendiri (cegah lockout).

### Menu (`/admin/menu`) — menu builder drag & drop
- Kelola `MenuItem` per lokasi (Topbar/Header/Footer). Fitur: **tambah** item, **hapus** item, **drag untuk mengurutkan**, dan **drag untuk membuat sub-menu** (hierarki 2 level). Tandai item sebagai link eksternal.
- Perubahan urutan/hierarki disimpan lewat server action yang menulis ulang `order` & `parentId`. Detail implementasi drag & drop ada di `10`.
- Ini yang mengisi navigasi publik (lihat `05`).

### Link Terkait (`/admin/link`)
- Kelola `ExternalLink` (kategori Terkait/Jurnal) untuk footer.

### Pengaturan Situs (`/admin/pengaturan`)
- Form tunggal `SiteSetting`: Nama fakultas, Tagline, Logo, Alamat kampus 1 & 2, Email, Telepon, Sosial media (FB/IG/YT/Twitter). Simpan → update baris singleton.

### Tata Kelola (`/admin/governance`)

- Dashboard review/expiry/translation/broken link mengikuti `21-A`.
- Revision diff/restore mengikuti `21-B`; restore selalu membuat revision baru.
- Alert dan status layanan mengikuti `21-D`.
- Privacy request, retention, consent, export log, dan incident register mengikuti `21-E`.
- Accessibility issue dan alternative-format request mengikuti `21-F`.
- Hanya ADMIN; action/query/download tetap memanggil permission server-side.

## Aturan otorisasi (model kepemilikan)

| Aksi | ADMIN | EDITOR (penulis) |
|---|---|---|
| Berita/Pengumuman/Kolom — buat | ✅ | ✅ |
| Berita/Pengumuman/Kolom — edit & hapus | ✅ semua | ✅ **hanya miliknya** |
| Berita/Pengumuman/Kolom — terbitkan & jadwalkan | ✅ semua | ✅ **hanya miliknya** |
| Melihat daftar berita | ✅ semua | ✅ **hanya miliknya** |
| Simpan draft sebelum terbit | ✅ | ✅ |
| Media (upload) | ✅ | ✅ |
| Halaman, Prodi, Dosen, Tendik, Penelitian, Pengabdian, Kerjasama, Layanan, Dokumen | ✅ | ❌ |
| Beranda (Slider, Video, Statistik, QuickLink), Agenda | ✅ | ❌ |
| Pengguna, Menu, Link, Pengaturan Situs, Branding/Logo | ✅ | ❌ |

**Penegakan (lihat `06`):**
- EDITOR dibatasi middleware ke `/admin`, `/admin/berita`, `/admin/pengumuman`, `/admin/kolom`, `/admin/media` saja. Rute lain via URL langsung → ditolak.
- Kepemilikan berita ditegakkan di server action lewat `requireOwnPost(id)` — bukan hanya disembunyikan dari UI.
- Sidebar EDITOR hanya menampilkan: Dashboard, Berita, Pengumuman, Kolom, Media. Sisanya disembunyikan berdasarkan role.
- Query daftar berita untuk EDITOR difilter `authorId = dirinya`.
