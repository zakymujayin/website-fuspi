# 05 — Halaman Publik & Peta Situs

Rute publik berada di route group `(public)` dengan layout berisi Navbar dan Footer. Semua halaman publik adalah Server Components yang membaca data via `lib/queries/` (hanya konten `PUBLISHED`).

## Struktur navigasi (FINAL — pola dua lapis)

Navigasi diambil dari tabel `MenuItem` (bisa diedit di admin), dengan default berikut.

**Prinsip (diadopsi dari UIN Suka Ushuluddin):** rahasia navigasi yang rapi bukan mengurangi isi, melainkan **memisahkan dua lapis**:
- **Lapis konten** (yang sering diperbarui: berita, pengumuman, agenda…) → bar tipis di atas header.
- **Lapis struktur** (identitas institusi: profil, program, akademik…) → menu utama.

Dengan cara ini menu utama cukup **6 item** — lebih lega daripada struktur situs FUDA yang dipakai sebagai salah satu referensi audit dan memiliki sekitar 10 menu plus keranjang "Lainnya".

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

### Lapis 3 — Menu utama (6 item, semuanya dropdown)

```
1. PROFIL
   ├─ Profil Fakultas          /halaman/profil-fakultas
   ├─ Sejarah                  /halaman/sejarah
   ├─ Visi & Misi              /halaman/visi-misi
   ├─ Pimpinan & Struktur      /halaman/struktur-organisasi
   ├─ Dosen                    /dosen
   ├─ Tenaga Kependidikan      /tenaga-kependidikan
   └─ Fasilitas                /halaman/fasilitas

2. PROGRAM STUDI
   ├─ Ilmu Al-Qur’an dan Tafsir (IAT)    /program-studi/iat
   ├─ Ilmu Hadis (IH)                    /program-studi/ih
   ├─ Aqidah dan Filsafat Islam (AFI)    /program-studi/afi
   ├─ Studi Agama-Agama (SAA)            /program-studi/saa
   └─ Tasawuf dan Psikoterapi (TASPI)    /program-studi/taspi

3. AKADEMIK
   ├─ Kurikulum                /halaman/kurikulum
   ├─ Kalender Akademik        /halaman/kalender-akademik
   ├─ Akreditasi               /halaman/akreditasi
   ├─ Pedoman Akademik         /dokumen?kategori=pedoman
   ├─ Tugas Akhir & Skripsi    /halaman/tugas-akhir
   ├─ Yudisium                 /halaman/yudisium
   └─ Profil Lulusan           /halaman/profil-lulusan

4. RISET & KERJASAMA
   ├─ Penelitian               /penelitian
   ├─ Pengabdian (PkM)         /pengabdian
   ├─ Kerjasama                /kerjasama
   ├─ Pusat Studi & Laboratorium  /unit
   └─ Jurnal                   (eksternal)

5. KEMAHASISWAAN
   ├─ Beasiswa                 /beasiswa
   ├─ Prestasi Mahasiswa       /prestasi
   ├─ Kegiatan Mahasiswa       /kegiatan
   ├─ Organisasi Mahasiswa     /unit?tipe=ormawa
   └─ Tracer Study & Alumni    (eksternal / halaman)

6. LAYANAN
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

### Yang dibuang / diperbaiki dari situs lama
- ❌ **Menu "Lainnya"** — dihapus. Keranjang serba-ada selalu jadi tempat sampah navigasi.
- ❌ **Program Studi ganda** (dulu muncul di Profil *dan* Akademik) — sekarang satu tempat.
- ❌ **Berita/Pengumuman di menu utama** — dipindah ke bar konten.
- ✅ **Menu "Layanan" jadi menu utama** — ini pembeda FUSPI (pengaduan bertiket + peminjaman ruangan), pantas ditonjolkan.
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

## Beranda (`/`) — susunan section

Urutan section, dari atas:

1. **Hero** — `HomeSlider` (carousel gambar). Bukan gradient generik: foto FUSPI + judul tegas (Plus Jakarta Sans) + subjudul + 1 CTA. Overlay navy transparan agar teks terbaca. Autoplay lambat, kontrol panah, hormati `prefers-reduced-motion`.
2. **Akses cepat** — 6 kartu ikon: Layanan, Pengaduan, Survei, E-Journal, PMB, E-Learning. Grid responsif.
3. **Sambutan Dekan** — foto dekan + nama/jabatan + kutipan sambutan (dari `SiteSetting`). Layout 2 kolom.
4. **Statistik** — 3 angka besar (Mahasiswa, Tenaga Pendidik, Tenaga Kependidikan) dengan animasi count-up saat masuk viewport. Latar `royal-900`, teks putih.
5. **Berita Terbaru** — 3–4 `PostCard` terbaru + tombol "Semua Berita".
6. **Pengumuman & Informasi** — 2 kolom daftar ringkas (judul + tanggal), tautan "Selengkapnya".
7. **Program Studi** — grid 5 prodi (nama + badge akreditasi; "Unggul" pakai badge brass).
8. **Kerjasama** — carousel/grid logo mitra (`Partnership` aktif), judul "Penguatan Kerja Sama Strategis".
9. **Sorotan Akademik / Kolom** — tab Dekan/Dosen/Mahasiswa, masing-masing 2–3 kartu kolom.
10. **CTA akhir** — banner ajakan (mis. "Bergabung dengan FUSPI" → PMB) dengan latar royal.

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
