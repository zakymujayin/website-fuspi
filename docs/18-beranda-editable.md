# 18 — Beranda: Setiap Section Dapat Diedit dari Admin

**Prinsip mengikat:** tidak ada satu pun teks, angka, gambar, atau logo di beranda yang di-hardcode. Admin harus dapat mengubah **seluruh isi beranda tanpa menyentuh kode** — termasuk judul section, urutan section, dan menyembunyikan section yang tidak dipakai.

> **Untuk agen:** bila Anda tergoda menulis judul section langsung di JSX (mis. `<h2>Berita Terbaru</h2>`), **berhenti**. Judul itu harus diambil dari `HomeSection` (lihat di bawah). Satu-satunya yang boleh hardcode adalah label UI generik (mis. tombol "Selengkapnya"), yang tetap diterjemahkan lewat kamus i18n.

---

## A. Peta lengkap: section → model → halaman admin

| # | Section beranda | Sumber data | Yang bisa diubah admin | Halaman admin |
|---|---|---|---|---|
| 1 | **Hero / Slider** | `HomeSlider` | Gambar, judul, subjudul, label & URL tombol, urutan (drag), aktif/nonaktif | `/admin/beranda/slider` |
| 2 | **Akses Cepat** | `QuickLink` | Label, ikon, URL, urutan, aktif | `/admin/beranda/akses-cepat` |
| 3 | **Sambutan Dekan** | `SiteSetting` | **Foto dekan, nama, jabatan, kalimat sambutan** | `/admin/beranda/dekan` |
| 4 | **Statistik (counter)** | `Statistic` | **Tambah/hapus counter**, label, angka, sufiks (+/%), ikon, urutan | `/admin/beranda/statistik` |
| 5 | **Berita Terbaru** | `Post` (BERITA) | Otomatis 4 terbaru. Judul section & jumlah tampil dapat diatur | otomatis + `/admin/beranda` |
| 6 | **Pengumuman & Informasi** | `Post` (PENGUMUMAN) | Otomatis terbaru | otomatis |
| 7 | **Program Studi** | `StudyProgram` | Nama, akreditasi, logo, urutan | `/admin/program-studi` |
| 8 | **Logo Kerjasama (marquee)** | `Partnership` | **Logo mitra**, urutan, aktif → langsung tampil di marquee | `/admin/kerjasama` |
| 9 | **Video** | `SiteSetting` | URL YouTube, judul, deskripsi | `/admin/beranda/video` |
| 10 | **Agenda** | `Event` | Otomatis (agenda mendatang) | `/admin/agenda` |
| 11 | **Testimoni Alumni** | `Testimonial` | Foto, nama, tahun lulus, pekerjaan, kutipan | `/admin/testimoni` |
| 12 | **Kolom / Opini** | `Post` (KOLOM) | Otomatis per rubrik | otomatis |
| 13 | **CTA Akhir** | `HomeSection` | Judul, subjudul, label & URL tombol, gambar latar | `/admin/beranda` |

**Semua section** (1–13) juga punya kontrol universal lewat `HomeSection`:
- **Judul & subjudul section** (diterjemahkan ID/EN/AR)
- **Tampil / sembunyi** (`isVisible`)
- **Urutan section** (`order`, diatur dengan drag)
- **Jumlah item** (`itemLimit`, default 4; minimum 1, maksimum 12) untuk section otomatis

---

## B. Halaman `/admin/beranda` — pusat kendali

Ini halaman utama pengaturan beranda. Isinya **daftar section yang bisa di-drag**, mirip menu builder (`10-A`), memakai komponen `SortableList` yang sama.

Setiap baris menampilkan:
```
⠿  [ikon]  Sambutan Dekan          [Judul: "Sambutan Dekan"]   [👁 Tampil]  [Kelola →]
⠿  [ikon]  Statistik               [Judul: "FUSPI dalam Angka"] [👁 Tampil]  [Kelola →]
⠿  [ikon]  Logo Kerjasama          [Judul: "Mitra Kerja Sama"] [👁 Sembunyi] [Kelola →]
```

- **⠿ drag** → ubah urutan section di beranda (pakai `@dnd-kit`, simpan `order` dalam satu transaksi).
- **Judul/subjudul** → dapat diedit inline atau lewat dialog, **dengan tab bahasa** (ID/EN/AR sesuai `12-D`).
- **Toggle tampil/sembunyi** → langsung menyembunyikan section dari beranda.
- **Kelola →** → menuju halaman detail section (kolom terakhir tabel di bagian A).

Setelah menyimpan, panggil `revalidatePath("/", "layout")` agar beranda publik langsung ter-update.

`HomeSection.key` menggunakan enum di `02`, bukan string bebas dan tidak dapat diedit admin. Renderer memiliki mapping exhaustif satu key ke satu komponen; build TypeScript harus gagal bila enum baru belum memiliki renderer.

---

## C. Detail tiga section yang Anda tanyakan

### 1. Sambutan Dekan — `/admin/beranda/dekan`
Form tunggal, menulis ke `SiteSetting`:
- **Foto Dekan** — media picker (`04`), pratinjau langsung. Disimpan ke `deanPhoto`.
- **Nama Dekan** — teks (`deanName`).
- **Jabatan** — teks (diterjemahkan; mis. "Dekan" / "Dean" / "عميد").
- **Kalimat sambutan** — textarea/rich text (`deanMessage`), dengan **tab bahasa**.

Tampilan publik: 2 kolom (foto di satu sisi, teks di sisi lain), menumpuk jadi 1 kolom di mobile. Foto `aspect-square` `object-cover` `rounded-xl` — tidak akan terpotong aneh.

### 2. Counter Statistik — `/admin/beranda/statistik`
**Ini yang saya perbaiki.** Sebelumnya angka terkunci di 3 field (`statMahasiswa`, `statDosen`, `statTendik`) — kalau FUSPI mau menambah "Alumni" atau "Guru Besar", harus ubah kode. Sekarang memakai model `Statistic` yang fleksibel:

CRUD dengan drag-reorder. Tiap entri:
- **Label** (diterjemahkan: "Mahasiswa" / "Students" / "طلاب")
- **Angka** (mis. `1000`)
- **Sufiks** (opsional: `+`, `%`)
- **Ikon** (lucide, opsional)
- Urutan, aktif/nonaktif

Admin bisa **menambah counter baru kapan saja** tanpa developer.

Tampilan publik: latar `royal-900`, teks putih, grid 3–4 kolom (mobile: 2 kolom). **Animasi count-up** saat masuk viewport (`IntersectionObserver`, durasi ~1.5 detik, ease-out). **Wajib hormati `prefers-reduced-motion`** — bila aktif, tampilkan angka final langsung tanpa animasi.

### 3. Marquee Logo Kerjasama — dari `/admin/kerjasama`
Tidak ada halaman terpisah — **logo diambil otomatis** dari `Partnership` yang `isActive = true` dan punya `logo`. Jadi saat admin menambah mitra kerjasama baru beserta logonya, logo itu **langsung muncul di marquee beranda**. Ini disengaja: satu sumber data, tidak ada duplikasi.

Yang bisa diatur: logo, urutan (`order`), aktif/nonaktif — semua di modul Kerjasama.

Tampilan publik (spesifikasi teknis marquee):
- Baris logo bergerak kontinu. Konten **diduplikasi 2×** dalam container agar loop mulus tanpa jeda (`translateX(-50%)` lalu reset).
- Animasi: CSS `@keyframes` pada `transform` saja (bukan `left`) — agar hemat GPU. Durasi ~`30s` linear infinite.
- **Pause saat hover** (`animation-play-state: paused`).
- Tinggi logo `48px` (mobile `36px`), `object-contain`, grayscale → berwarna saat hover.
- **RTL:** arah gerak dibalik saat `dir="rtl"` (lihat `12-E`).
- **`prefers-reduced-motion`:** ganti jadi **grid statis** tanpa animasi — jangan dipaksa bergerak.
- Jangan pakai library marquee berat; CSS murni sudah cukup.

---

## D. Seed awal (agar beranda tidak kosong saat pertama deploy)

`prisma/seed.ts` wajib mengisi:
1. **13 baris `HomeSection`** sesuai daftar di bagian A, dengan judul default Indonesia + urutan default.
2. **3 `Statistic`** default: Mahasiswa (1000+), Dosen, Tenaga Kependidikan — sesuai data FUSPI.
3. **Beberapa `QuickLink`**: Layanan, Pengaduan, Survei, Peminjaman Ruangan, PMB, E-Learning.
4. **1 `HomeSlider`** placeholder.
5. `SiteSetting` dengan data dekan.

---

## E. Perubahan pada dokumen lain

- **`02`** — model baru `Statistic` dan `HomeSection`. Field `statMahasiswa`/`statDosen`/`statTendik` **DIHAPUS** dari `SiteSetting` (digantikan `Statistic`).
- **`04`** — sidebar admin: grup **Beranda** kini berisi: Pengaturan Beranda · Slider · Akses Cepat · Sambutan Dekan · Statistik · Video.
- **`05`** — urutan section beranda tidak lagi tetap di kode; dibaca dari `HomeSection.order` dan disaring `isVisible`.
- **`12`** — tambah `StatisticTranslation` (label) dan `HomeSectionTranslation` (title, subtitle).
- **`02`** — `deanPosition` berada di `SiteSettingTranslation`; `HomeSection` memakai `HomeSectionKey` dan memiliki `itemLimit`.

---

## F. Uji terima (bukti bahwa beranda benar-benar editable)

Sebelum dianggap selesai, pastikan admin dapat melakukan semua ini **tanpa developer**:

- [ ] Mengganti foto & kalimat sambutan Dekan.
- [ ] Mengubah angka statistik, **menambah counter baru** (mis. "Alumni: 5000+").
- [ ] Menambah mitra kerjasama → logonya **otomatis muncul di marquee**.
- [ ] Mengganti judul section dari "Berita Terbaru" menjadi "Kabar FUSPI".
- [ ] **Menyembunyikan** section Video sepenuhnya.
- [ ] **Memindahkan** section Testimoni ke atas section Berita (drag).
- [ ] Mengganti gambar & tombol hero slider.
- [ ] Melakukan semuanya juga dalam **bahasa Inggris dan Arab**.
