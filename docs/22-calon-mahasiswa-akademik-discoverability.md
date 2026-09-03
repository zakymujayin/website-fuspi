# 22 — Calon Mahasiswa, Katalog Akademik, Profil Riset, SEO & Performance

Dokumen ini memastikan website tidak hanya menjadi arsip berita, tetapi membantu calon mahasiswa memilih prodi, menemukan informasi akademik, memahami keahlian dosen, dan mendapatkan pengalaman cepat dari perangkat mobile.

## A. Hub calon mahasiswa — wajib v1

Tambahkan route `/calon-mahasiswa` sebagai landing page yang mengarahkan keputusan sebelum pengguna masuk portal PMB universitas.

Konten:

1. Ringkasan FUSPI dan tiga prodi aktif v1: IAT, IH, dan AFI.
2. Perbandingan prodi: fokus keilmuan, akreditasi, profil lulusan, prospek karier, dan CTA detail.
3. Jalur masuk yang berlaku beserta periode; data dikelola CMS, bukan disalin otomatis dari PMB.
4. Ringkasan UKT/biaya dengan tahun sumber dan disclaimer bahwa ketentuan final berada di portal universitas.
5. Beasiswa aktif.
6. Jadwal penting penerimaan.
7. FAQ calon mahasiswa.
8. Brosur fakultas/prodi.
9. Kontak admisi dan CTA tunggal ke `pmb.uinbanten.ac.id`.

Batas scope:

- Website FUSPI **tidak menerima pendaftaran, pembayaran, upload berkas PMB, atau menentukan kelulusan**.
- Informasi yang mudah berubah wajib memiliki source URL, source year, owner, review due date, dan expiry sesuai `21`.
- CTA PMB adalah link eksternal yang jelas; jangan meniru UI portal resmi.

Tambahkan model `AdmissionInfo` + translation: type `PATHWAY/COST/SCHEDULE/CONTACT`, title, content, sourceUrl, sourceYear, startsAt, endsAt, order, active. Jadwal juga dapat merujuk Event tanpa menduplikasi record.

## B. Katalog kurikulum dan mata kuliah — fase 2 penting

PDF kurikulum tetap tersedia, tetapi data inti harus terstruktur:

- `Curriculum`: prodi, code/name, academicYearStart, academicYearEnd?, totalCredits, status `DRAFT/ACTIVE/RETIRED`.
- `Course`: code, translation name/description/learningOutcomes, credits, semesterRecommendation, type `REQUIRED/ELECTIVE`, active.
- `CurriculumCourse`: curriculum, course, semester, order.
- `CoursePrerequisite`: course dan prerequisite course.

Halaman:

- `/program-studi/[code]/kurikulum` — pilih versi, ringkasan SKS per semester, tabel/filter, print, dan link PDF resmi.
- `/mata-kuliah/[code]` — detail outcome, SKS, semester, prasyarat, serta prodi/kurikulum yang memakai.

Aturan:

- Satu prodi hanya memiliki satu Curriculum ACTIVE per waktu.
- Retire tidak menghapus course historis.
- Import CSV tersedia dengan dry-run dan validasi code/prerequisite/cycle.
- Gunakan structured data `Course` hanya bila halaman memenuhi definisi course dan seluruh data yang ditandai terlihat di halaman.

## C. Profil riset dan publikasi — fase 2 penting

Perluas Research menjadi record bibliografis:

- type `JOURNAL_ARTICLE/BOOK/BOOK_CHAPTER/CONFERENCE/RESEARCH_PROJECT/DATASET/OTHER`.
- DOI, repository URL, publisher/journal, volume, issue, pages, publicationDate, peerReviewed, language.
- Relasi author ke Lecturer dengan order; author eksternal tetap didukung sebagai nama teks.
- Lecturer menambah ORCID, Scopus ID?, Google Scholar, dan SINTA.
- Export citation BibTeX dan RIS; jangan menghitung citation metric sendiri pada v1.

Halaman dosen menampilkan filter publikasi per tipe/tahun dan tautan identifier resmi. Import DOI/ORCID otomatis adalah fase lanjutan setelah izin/API tersedia; v1 memakai input/import terkontrol.

## D. Direktori terpadu — wajib v1

Tambahkan `/direktori` yang mencari Lecturer, Staff, StudyProgram, Unit, Room, dan Service.

Hasil menampilkan hanya data publik:

- Nama, jabatan/fungsi, prodi/unit, email institusi bila disetujui, lokasi/ruangan, jam layanan/office hours, dan link detail.
- Filter tipe, prodi, unit, lokasi, serta layanan online/offline.
- Nomor pribadi tidak pernah ditampilkan; telepon unit memakai field institusional.
- Schema `Person/ProfilePage` hanya digunakan untuk profil publik individual dengan data yang terlihat.

Search `/cari` boleh mengembalikan hasil direktori, tetapi `/direktori` menyediakan filter khusus dan tidak mencari isi tiket, booking, submission, atau data privat.

## E. Structured data final — wajib v1

Implementasikan JSON-LD yang sesuai konten terlihat:

| Template | Schema |
|---|---|
| Root situs | `CollegeOrUniversity` + `WebSite` |
| Berita/pengumuman/kolom | `NewsArticle` atau `Article` |
| Dosen | `ProfilePage` + `Person` |
| Agenda detail | `Event` |
| FAQ | `FAQPage` |
| Breadcrumb | `BreadcrumbList` |
| Mata kuliah fase 2 | `Course` |

Aturan:

- Gunakan canonical URL locale aktif dan identifier stabil (`@id`).
- Jangan menandai data yang tidak terlihat atau memakai schema Event untuk jam operasional/booking privat.
- Event wajib mempunyai detail URL unik, timezone, status, lokasi, dan organizer.
- Validasi template melalui Rich Results Test/Schema validator dan monitor Search Console setelah perubahan template.

## F. Performance budget & real-user monitoring — wajib v1

Target pada persentil ke-75 mobile dan desktop:

- LCP ≤2,5 detik.
- INP ≤200 ms.
- CLS ≤0,1.

Budget awal per page load publik:

- JavaScript client first-load ≤200 KB gzip untuk halaman biasa; halaman kalender/editor boleh memiliki chunk terpisah dan lazy-load.
- Hero image mobile ≤180 KB, desktop ≤350 KB; `sizes`, responsive source, dan prioritas hanya untuk LCP image.
- Font awal maksimum dua family/empat file subset; Arab dimuat hanya ketika diperlukan locale/konten.
- Third-party script tidak dimuat sebelum consent dan tidak boleh memblokir render.
- YouTube/Maps menggunakan facade/thumbnail sampai interaksi.

Monitoring:

- Kirim LCP/INP/CLS anonim ke endpoint agregasi internal atau GA4 setelah consent.
- Dashboard mingguan per template/locale/device; jangan menyimpan URL yang berisi token atau data personal.
- Alert regression jika p75 melewati target selama tujuh hari atau error rate template kritis meningkat.
- Lighthouse CI digunakan sebagai guard lab; field data tetap menjadi sumber keputusan produksi.

## G. Analytics berbasis tujuan

Selain pageview, definisikan event non-personal:

- CTA PMB, download brosur, pilih prodi, buka kurikulum, cari direktori, search success/no-result, mulai/selesai form publik, dan outbound ke SILA.
- Jangan kirim nama, email, NIM, query sensitif, isi form, ticket/booking number, atau tracking token ke analytics.
- Dashboard membandingkan task completion dan no-result rate, bukan vanity metric saja.
- Widget “Apakah halaman ini membantu?” tersedia pada Page, prodi, layanan, FAQ, dan calon mahasiswa; menyimpan helpful boolean, reason enum, locale, page ID, dan komentar tersanitasi opsional.

## H. Acceptance criteria

- Calon mahasiswa dapat mencapai detail prodi dan portal PMB dalam maksimal dua interaksi dari hub.
- Semua informasi penerimaan mempunyai source, owner, review date, dan expiry.
- Direktori tidak pernah menampilkan nomor pribadi atau record nonaktif.
- JSON-LD valid, konsisten dengan konten terlihat, dan mempunyai canonical locale yang benar.
- Homepage, daftar/detail berita, prodi, calon mahasiswa, dan direktori memenuhi target CWV field setelah data cukup; sebelum itu wajib lulus budget lab.
- Analytics tidak menerima PII/token dan dihormati sepenuhnya saat consent ditolak.
- Course/curriculum versioning mempertahankan histori dan mencegah dua kurikulum aktif bersamaan.

## Referensi

- Google Course structured data: https://developers.google.com/search/docs/appearance/structured-data/course
- Google Event structured data: https://developers.google.com/search/docs/appearance/structured-data/event
- Google ProfilePage: https://developers.google.com/search/docs/appearance/structured-data/profile-page
- Core Web Vitals: https://web.dev/articles/vitals
