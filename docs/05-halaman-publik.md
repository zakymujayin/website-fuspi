# 05 — Halaman Publik & Peta Situs

Rute publik berada di route group `(public)` dengan layout berisi Navbar dan Footer. Semua halaman publik adalah Server Components yang membaca data via `lib/queries/` (hanya konten `PUBLISHED`).

## Struktur navigasi (FINAL — tiga lapis)

Navigasi diambil dari tabel `MenuItem` (bisa diedit di admin), dengan default berikut.

**Prinsip:** navigasi yang rapi bukan mengurangi isi, melainkan memisahkan kebutuhan pengguna menjadi tiga lapis:
- **Lapis konten** (yang sering diperbarui: berita, pengumuman, agenda…) → bar tipis di atas header.
- **Lapis utilitas** (portal, integrasi, dan locale) → topbar ringkas.
- **Lapis struktur** (identitas institusi: profil, akademik, riset, dan layanan) → menu utama.

Kategori informasi mengikuti kebutuhan yang ditemukan dalam audit referensi eksternal, tetapi penamaan, pengelompokan, identitas, dan pengalaman visual ditetapkan khusus untuk FUSPI. Kontrak lengkap ada di `26`.

### Lapis 1 — Bar konten (paling atas, tipis)
Tautan langsung ke arsip tiap tipe konten:
```
Berita · Pengumuman · Kolom · Agenda · Album · Dokumen
```
→ `/berita` · `/pengumuman` · `/kolom` · `/agenda` · `/album` · `/dokumen`

### Lapis 2 — Topbar utilitas (kanan atas)
```
Calon Mahasiswa · Portal PMB · SILA · SIAKAD · E-Learning · GKM        [ID | EN | AR]
```
`Calon Mahasiswa` menuju hub internal `/calon-mahasiswa`; lainnya link eksternal, termasuk SILA dari konfigurasi `NEXT_PUBLIC_SILA_URL`, ditambah language switcher (`12-F`). URL SILA tidak di-hardcode sebelum fase integrasi.

### Lapis 3 — Menu utama

```
1. PROFIL
   ├─ Profil Fakultas          /halaman/profil-fakultas
   ├─ Sejarah                  /halaman/sejarah
   ├─ Visi & Misi              /halaman/visi-misi
   ├─ Pimpinan & Struktur      /halaman/struktur-organisasi
   ├─ Dosen                    /dosen
   ├─ Tenaga Kependidikan      /tenaga-kependidikan
   └─ Fasilitas                /halaman/fasilitas

2. AKADEMIK
   ├─ Program Studi
   │  ├─ Ilmu Al-Qur’an dan Tafsir (IAT)    /program-studi/iat
   │  ├─ Ilmu Hadis (IH)                    /program-studi/ih
   │  ├─ Aqidah dan Filsafat Islam (AFI)    /program-studi/afi
   │  ├─ Studi Agama-Agama (SAA)            /program-studi/saa
   │  └─ Tasawuf dan Psikoterapi (TASPI)    /program-studi/taspi
   ├─ Kurikulum                /halaman/kurikulum
   ├─ Kalender Akademik        /halaman/kalender-akademik
   ├─ Monitoring & Evaluasi    /halaman/monev
   ├─ Pedoman Akademik         /dokumen?kategori=pedoman
   ├─ Tugas Akhir & Skripsi    /halaman/tugas-akhir
   └─ Yudisium                 /halaman/yudisium

3. PENELITIAN & PKM
   ├─ Penelitian Dosen         /penelitian?pelaku=dosen
   ├─ Penelitian Mahasiswa     /penelitian?pelaku=mahasiswa
   ├─ Pengabdian Dosen         /pengabdian?pelaku=dosen
   ├─ Pengabdian Mahasiswa     /pengabdian?pelaku=mahasiswa
   ├─ Panduan Teknis           /dokumen?kategori=penelitian-pkm
   ├─ Pusat Studi & Laboratorium  /unit
   └─ Jurnal                   (eksternal)

4. KEMAHASISWAAN
   ├─ Beasiswa                 /beasiswa
   ├─ Prestasi Mahasiswa       /prestasi
   ├─ Kegiatan Mahasiswa       /kegiatan
   ├─ Organisasi Mahasiswa     /unit?tipe=ormawa
   └─ Tracer Study & Alumni    (eksternal / halaman)

5. KERJA SAMA
   ├─ Internasional            /kerjasama?cakupan=internasional
   ├─ Nasional                 /kerjasama?cakupan=nasional
   └─ Lokal                    /kerjasama?cakupan=lokal

6. AKREDITASI                  /halaman/akreditasi

7. LAYANAN
   ├─ Informasi Layanan        /layanan
   ├─ e-Layanan Akademik SILA  (eksternal)
   ├─ Pengaduan                /pengaduan
   ├─ Lacak Pengaduan          /pengaduan/lacak
   ├─ Peminjaman Ruangan       /peminjaman
   ├─ Jadwal Ruangan           /jadwal-ruangan
   ├─ Survei Kepuasan          /survei
   ├─ FAQ                      /faq
   ├─ Kontak                   /kontak
   ├─ Status Layanan           /status
   └─ PPID                     /halaman/ppid
```

### Penyederhanaan arsitektur informasi
- ❌ **Menu "Lainnya"** — dihapus. Keranjang serba-ada selalu jadi tempat sampah navigasi.
- ❌ **Program Studi ganda** — ditempatkan konsisten di bawah Akademik dan tetap diberi akses kontekstual dari beranda.
- ❌ **Berita/Pengumuman di menu utama** — dipindah ke bar konten.
- ✅ **Menu "Layanan" jadi menu utama** — ini pembeda FUSPI (pengaduan bertiket + peminjaman ruangan), pantas ditonjolkan.
- ✅ **Akreditasi menjadi tautan utama** — mudah ditemukan tanpa terselip dalam dropdown panjang.
- ✅ Link eksternal (SIAKAD, E-Learning, GKM, jurnal) dikumpulkan di topbar & footer, bukan berserak di menu.

### Mobile
Di bawah `md`: bar konten + topbar + menu utama semuanya masuk ke **hamburger → drawer**, dengan sub-menu accordion. Language switcher di bagian atas drawer. Target sentuh ≥44px (lihat `03`).

## Daftar rute & template

| Rute | Sumber data | Template |
|---|---|---|
| `/` | banyak (lihat beranda) | Homepage |
| `/berita` | Post type=BERITA, PUBLISHED | **Daftar 2 kolom + sidebar arsip** — lihat `19-B` |
| `/berita/[slug]` | Post by slug | **Detail 2 kolom + sidebar "Berita Terbaru"** — lihat `19-C` |
| `/pengumuman`, `/pengumuman/[slug]` | Post type=PENGUMUMAN | Template sama seperti Berita (`19`) |
| `/kolom`, `/kolom/[slug]` | Post type=KOLOM | Template sama + rubrik (`19`) |
| `/halaman/[slug]` | Page by slug | Halaman statis |
| `/program-studi`, `/program-studi/[code]` | StudyProgram | Grid + Detail (prodi eksternal langsung redirect) |
| `/dosen`, `/dosen/[id]` | Lecturer | Grid (filter prodi) + Detail |
| `/tenaga-kependidikan` | Staff | Grid |
| `/penelitian`, `/pengabdian` | Research / CommunityService | Daftar (filter tipe & tahun) |
| `/beasiswa`, `/prestasi`, `/kegiatan` | masing-masing | Daftar |
| `/kerjasama` | Partnership | Daftar (tab: Internasional/Nasional/Lokal) + logo grid |
| `/layanan` | Service | Daftar per kategori |
| `/dokumen` | Document | Daftar unduhan |
| `/calon-mahasiswa` | AdmissionInfo, StudyProgram, Scholarship, Event, FAQ | Hub keputusan + CTA PMB eksternal (`22-A`) |
| `/direktori` | Lecturer, Staff, StudyProgram, Unit, Room, Service | Pencarian/filter direktori publik (`22-D`) |
| `/status` | ServiceEndpoint, ServiceIncident | Status layanan & histori insiden (`21-D`) |
| `/privasi/permintaan-data` | DataSubjectRequest | Permintaan hak data + tracking token (`21-E`) |
| `/program-studi/[code]/kurikulum` | Curriculum, Course | Katalog kurikulum fase 2 (`22-B`) |
| `/mata-kuliah/[code]` | Course | Detail mata kuliah fase 2 (`22-B`) |

## Template — komponen bersama

- **Navbar** (client): logo + menu dropdown + topbar. Sticky, menyusut saat scroll. Mobile: drawer.
- **Footer**: 4 kolom — Alamat 2 kampus + email · Program Studi (link) · Website Terkait & Jurnal (dari `ExternalLink`) · Sosial media. bg `navy-900`, teks `slate-300`.
- **PageHeader**: judul halaman + breadcrumb + garis brass signature. Dipakai di semua halaman non-beranda.
- **PostCard**: gambar sampul (aspek 16:9), kategori (caption), judul (H4, clamp 2 baris), tanggal, ringkasan (clamp 2 baris). Hover naik shadow.
- **Pagination**, **EmptyState** ("Belum ada konten untuk kategori ini."), **SectionHeading** (judul + garis brass).

## Beranda (`/`) — susunan awal section

Seluruh urutan dan visibilitas dibaca dari `HomeSection`. Susunan awal mengikuti kontrak `26`:

1. **Hero** — media resmi FUSPI, satu pesan utama, dan maksimal dua CTA. Carousel bukan keharusan; bila digunakan, kontrol manual dan reduced motion wajib.
2. **Akses cepat** — 6 kartu ikon: Layanan, Pengaduan, Survei, E-Journal, PMB, E-Learning. Grid responsif.
3. **Sambutan Dekan** — foto dekan + nama/jabatan + kutipan sambutan (dari `SiteSetting`). Layout 2 kolom.
4. **Statistik** — mahasiswa, dosen, dan tenaga kependidikan; tampil hanya setelah angka diverifikasi.
5. **Pengantar fakultas** — ringkasan profil dengan tautan ke profil, visi-misi, dan struktur organisasi.
6. **Program Studi** — lima program resmi dalam urutan `src/config/institution.ts`.
7. **Pengumuman & Informasi** — daftar ringkas yang mengutamakan tanggal dan status.
8. **Layanan** — pintasan layanan akademik, umum, laboratorium, dan pengaduan.
9. **Berita Terbaru** — satu berita utama dan beberapa berita pendamping.
10. **Kerja Sama** — logo/grid mitra (`Partnership` aktif) dengan aset resmi.
11. **Sorotan Akademik / Kolom** — karya atau kolom Dekan, dosen, dan mahasiswa.
12. **Video** — profil/tur/liputan resmi dengan poster image.
13. **Agenda** — agenda mendatang dengan tanggal, lokasi, dan CTA detail.
14. **Testimoni Alumni** — opsional dan tersembunyi sampai materi serta izin tersedia.
15. **CTA akhir** — ajakan menuju hub calon mahasiswa atau PMB terkonfigurasi.

Tidak ada bagian yang memakai angka, nama, foto, atau klaim contoh sebagai konten produksi. Section dinamis tanpa konten disembunyikan; halaman arsip tetap memberi empty state yang jujur.

## SEO & metadata

- Tiap halaman detail meng-generate `metadata` (title, description dari `excerpt`, og:image dari `coverImage`) via `generateMetadata()`.
- Slug pada URL. Buat `sitemap.ts` dan `robots.ts` di root app.
- `<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>` mengikuti route aktif. Kutipan Arab di locale lain tetap dibungkus `<span dir="rtl" lang="ar" className="font-arabic">`.
- JSON-LD final mengikuti `22-E`: CollegeOrUniversity/WebSite, NewsArticle/Article, ProfilePage/Person, Event, FAQPage, BreadcrumbList, dan Course fase 2.

## Performa

- Gambar upload disajikan sebagai file statis dari domain sendiri; gunakan `next/image` dengan `width`/`height` dari record `Media` untuk cegah layout shift.
- Halaman daftar memakai paginasi server (bukan memuat semua).
- Set `export const revalidate` atau andalkan `revalidatePath()` dari admin agar konten publik ter-update setelah diedit tanpa rebuild.
- Penuhi budget dan real-user monitoring LCP/INP/CLS pada `22-F`; third-party script hanya setelah consent.

## Integrasi layanan akademik

Semua CTA layanan akademik mengarah ke URL SILA yang dikonfigurasi melalui `NEXT_PUBLIC_SILA_URL`. Website tidak menyediakan form pengajuan atau menyalin status/data mahasiswa. Batas dan roadmap integrasi mengikuti `23`.
