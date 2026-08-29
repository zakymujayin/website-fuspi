# M4-CLAUDE-LECTURER-PROFILE-PAGES

- **Task**: Direktori dosen publik + halaman detail profil (biografi, riwayat pendidikan, publikasi)
- **Branch**: `main`
- **Model/lane**: Claude (public UI), dengan perubahan skema lintas-lane atas instruksi langsung pengguna

## Ringkasan

Merombak `/dosen` dan `/dosen/[id]` supaya profil dosen menampilkan riwayat pendidikan dan
publikasi dari basis data, bukan sekadar tautan keluar ke Google Scholar dan SINTA.
Menambah fondasi skema untuk portal swalayan dosen (Spec A) yang belum dibangun.

## Berkas yang berubah

| Berkas | Perubahan |
| --- | --- |
| `prisma/schema.prisma` | `Role.DOSEN`, enum `PublicationType`, model `LecturerEducation` + `LecturerPublication`, kolom `Lecturer.userId/cvMediaId/scopusUrl/linkedinUrl/instagramUrl/twitterUrl`, `LecturerTranslation.quote/officeLocation` |
| `prisma/migrations/20260829120000_add_lecturer_profile_self_service/` | Migrasi baru (idempoten, `IF NOT EXISTS`) |
| `src/app/[locale]/(public)/dosen/page.tsx` | Kartu direktori baru, pencarian nama + filter prodi tanpa JavaScript, empty state terpisah untuk "belum ada data" dan "pencarian nihil" |
| `src/app/[locale]/(public)/dosen/[id]/page.tsx` | Tata ulang dua kolom, section Biografi/Pendidikan/Publikasi, unduh CV, kutipan Arab RTL, perbaikan bidi |
| `src/app/[locale]/(public)/dosen/loading.tsx` | Skeleton baru |
| `src/app/[locale]/(public)/dosen/[id]/loading.tsx` | Skeleton baru |
| `messages/{id,en,ar}.json` | Namespace `LecturerProfile` |
| `prisma/seed.ts` | Seeding 6 dosen demo (identitas fiktif) beserta riwayat pendidikan dan publikasi, plus akun `dosen.demo@fuspi.uinbanten.ac.id` ber-role `DOSEN` yang tertaut ke `Lecturer.userId` |
| `src/contracts/auth.ts` | `AuthRoleSchema` menerima `"DOSEN"` |
| `src/lib/auth/permission-matrix.ts` | Resource `LECTURER_PROFILE`, hibah `DOSEN` (semuanya `ownership: "OWN"`), helper `canAccessAdminShell` |
| `src/app/[locale]/admin/layout.tsx` | Menolak `DOSEN` dari shell `/admin` |
| `tests/platform/auth-contracts/auth-contracts.test.ts` | `DOSEN` masuk daftar role terverifikasi, plus 4 tes baru |
| `src/contracts/lecturer-portal.ts` | Kontrak portal: aktor tepercaya, skema masukan, union perintah |
| `src/features/lecturer-portal/domain.ts` | Loader dan eksekutor perintah, semuanya dipagari `userId` |
| `src/components/portal/` | Server actions berbasis FormData, navigasi, dan tiga formulir |
| `src/app/[locale]/portal-dosen/` | Layout berpenjaga plus halaman profil, pendidikan, publikasi |
| `src/lib/auth/runtime/redirect.ts` | `resolvePostLoginDestination` untuk pendaratan per-role |
| `src/lib/auth/runtime/credentials.ts` | Memilih tujuan setelah login berdasarkan role |
| `tests/platform/lecturer-portal/` | 15 tes kontrak dan pengalihan |
| `tests/security/lecturer-portal-adversarial.integration.test.ts` | 8 tes adversarial terhadap PostgreSQL |
| `src/features/academic/lecturer-csv-import.ts` | Parser CSV, validasi per baris, penjaga injeksi formula |
| `src/features/academic/lecturer-account-provisioning.ts` | Pembuatan akun `DOSEN` massal, khusus ADMIN |
| `src/components/admin/lecturer-import/` | Server action dan formulir unggah, pratinjau, kredensial |
| `src/app/[locale]/admin/impor-dosen/page.tsx` | Halaman impor, dijaga khusus ADMIN |
| `src/components/admin/admin-sidebar-data.ts` | Entri navigasi "Impor Dosen" |
| `tests/platform/lecturer-portal/lecturer-csv-import.test.ts` | 14 tes parser |
| `tests/security/lecturer-provisioning-adversarial.integration.test.ts` | 6 tes adversarial pembuatan akun |
| `src/app/[locale]/(public)/pengaduan/baru/` dan `lacak/` | Halaman kirim dan lacak pengaduan umum |
| `src/components/public/complaint/` | Server action dan dua formulir pengaduan |
| `src/features/tickets/workflow.ts` | Perbaikan verifikasi token pelacakan |
| `tests/security/public-complaint-flow.integration.test.ts` | 9 tes alur pengaduan publik |
| `src/app/[locale]/(public)/peminjaman/` | Daftar ruangan, pengajuan, dan pelacakan |
| `src/components/public/booking/` | Server action dan dua formulir peminjaman |
| `src/features/booking/domain.ts` | Perbaikan verifikasi token pelacakan booking |
| `prisma/seed.ts` | Seeding tiga ruangan beserta jam operasional |
| `tests/security/public-booking-flow.integration.test.ts` | 10 tes alur peminjaman |

## Dampak API/skema/migrasi

- Migrasi aditif; tidak ada kolom atau tabel yang dihapus.
- `ALTER TYPE "Role" ADD VALUE 'DOSEN'` tidak dipakai di transaksi yang sama, aman untuk PostgreSQL 12+.
- `Research` dan `LecturerResearch` tidak disentuh. Publikasi swalayan dosen memakai
  `LecturerPublication` yang dimiliki satu dosen dan sengaja tanpa constraint unik,
  sesuai keputusan pengguna bahwa duplikat antar dosen tidak masalah.

## Cacat yang diperbaiki sepanjang jalan

1. **Rute detail salah parameter.** `page.tsx` membaca `params.slug` padahal direktorinya `[id]`,
   sehingga `findMany({where: {slug: undefined}})` mengembalikan seluruh dosen dan halaman selalu
   menampilkan `rows[0]`. Setiap URL dosen menampilkan orang yang sama. Kini membaca `params.id`;
   diverifikasi dengan tiga slug berbeda.
2. **Bidi RTL.** Nama dan gelar berskrip Latin tampil rusak di locale `ar`
   (`.Nurul Hidayah, M.Th.I`, `.Dr`, `200323 254 62+`). Diperbaiki dengan `dir="auto"` pada
   span sebaris plus `text-start` pada blok induk, sehingga urutan bidi benar tanpa mengubah perataan.
3. **Hierarki mobile.** Foto dan kartu kontak tampil sebelum nama dosen. Diperbaiki dengan
   `order-*` pada grid.
4. **Sanitasi bio.** `bio` dirender lewat `dangerouslySetInnerHTML` tanpa sanitasi. Kini melewati
   `sanitizeStoredContentOrNull`, mengikuti pola halaman berita. Penting karena bio akan
   diisi dosen sendiri dan langsung tayang.

## Perintah dan hasil

```
npm run ci:quick    # check:scope, lint, typecheck, prisma:validate, test  -> lolos
npm run test        # 111 berkas, 1358 tes -> lolos
npm run test:integration    # portal, provisioning, pengaduan, peminjaman: 33 tes -> lolos (butuh .env dimuat)
npm run build       # 0 error, 0 warning
npx prisma migrate deploy   # diterapkan ke basis data pengembangan
npm run prisma:seed         # 6 dosen, 15 pendidikan, 14 publikasi, 1 akun DOSEN, 3 ruangan
```

Verifikasi visual dengan Playwright pada 1280px, 390px, dan locale `ar`.

## Belum diuji / risiko

- Belum ada tes untuk penjagaan layout admin maupun layout portal; verifikasinya baru pada
  level `canAccessAdminShell` dan `loadLecturerPortalProfile`.
- Belum ada tes Playwright yang ter-commit untuk alur portal; verifikasi ujung ke ujung
  dilakukan manual di sesi ini.
- `npm run test:integration` tidak memuat `.env`, sehingga sebagian besar suite integrasi gagal
  karena `DATABASE_URL` dan rahasia HMAC tidak tersetel. Ini sudah terjadi sebelum tugas ini.
- Impor hanya menulis terjemahan locale `id`, sejalan dengan portal.
- Menambahkan entri sidebar menyentuh registry navigasi yang menurut `AGENTS.md` milik lane GPT.
  Perlu ditinjau bersama perubahan skema.
- Kata sandi admin di basis data pengembangan tidak cocok dengan `SEED_ADMIN_PASSWORD` karena
  seeder memakai `upsert` dengan `update: {}`. Selama verifikasi kata sandi itu disetel ulang ke
  nilai `.env` agar konsisten.
- `Breadcrumb` (komponen bersama) masih menampilkan nama Latin dengan bidi rusak di locale `ar`.
  Perlu perlakuan `dir="auto"` yang sama; berada di luar cakupan tugas ini.
- Basis data pengembangan masih memuat 6 dosen lama yang masuk secara ad-hoc sebelum tugas ini
  dan tidak berasal dari berkas mana pun. Dosen lama itu tidak punya riwayat pendidikan maupun
  publikasi, sehingga kartunya tampil tanpa ringkasan. `prisma db seed` tidak menghapusnya.

## Keputusan hak akses

Tidak ada halaman login baru. `DOSEN` memakai `/{locale}/login` yang sama dengan
super admin dan admin; yang membedakan hanya matriks izin. Karena matriks bersifat
deny-by-default, `DOSEN` hanya memperoleh `LECTURER_PROFILE` (VIEW, UPDATE),
`MEDIA` (VIEW, CREATE), dan `USER` (CHANGE_PASSWORD), semuanya `ownership: "OWN"`.

Ditemukan saat mengerjakan: `decideProtectedRoute` (`request-session.ts:49`) hanya
memeriksa validitas sesi dan `mustChangePassword`, **tidak memeriksa role**. Setiap
user terautentikasi karena itu dapat memuat shell `/admin`. Menambahkan `DOSEN` tanpa
penjagaan akan memberinya akses ke CMS, sehingga `canAccessAdminShell` ditambahkan
dan dipasang di layout admin. Perilaku empat role lama tidak berubah.

## Portal dosen

Rute `/{locale}/portal-dosen` dengan tiga halaman: profil, riwayat pendidikan, publikasi.
Isolasi kepemilikan berlapis dua: `TrustedLecturerActorSchema` mengunci role di batas domain,
dan setiap baca maupun tulis dipagari `userId` di level query. Dosen karena itu tidak dapat
mengalamati baris milik dosen lain sekalipun pengenalnya ditebak atau dipalsukan; percobaan
semacam itu mengembalikan `NOT_FOUND`, bukan penolakan yang membocorkan keberadaan baris.

Biografi memakai `PageRichTextField` yang sudah ada, bukan textarea, karena textarea
memperlihatkan HTML mentah kepada dosen. Nilainya disanitasi saat disimpan dan disanitasi
lagi saat dirender, sehingga jebolnya satu lapis tidak sampai ke pembaca.

Diverifikasi ujung ke ujung dengan Playwright: login mendarat di portal, entri baru tersimpan,
dan langsung muncul di halaman publik.

## Tindak lanjut

1. **Pemilih media belum ada.** Foto dan CV hanya dibawa lewat input tersembunyi agar tidak
   terhapus saat menyimpan. Dosen belum bisa mengunggah atau mengganti keduanya.
2. Portal hanya menulis terjemahan locale `id`. EN dan AR masih lewat jalur admin.
3. **XLSX belum didukung.** Tidak ada pustaka pembaca XLSX di proyek, dan menambahkannya
   adalah perubahan dependensi milik lane GPT. Parser dirancang agar XLSX tinggal dicolok:
   ia menerima teks dan memetakannya ke kontrak yang sama.
4. Penjagaan role sebaiknya pindah ke `decideProtectedRoute` agar berlaku seragam,
   bukan hanya di layout admin dan layout portal.
5. Menghapus entri belum meminta konfirmasi.
6. **Intake PPKS** dan **inbox Satgas** belum ada; keduanya menunggu backend lane GPT.
7. **Persetujuan peminjaman oleh petugas** belum ada UI-nya; `executeBookingCommand` sudah ada
   tetapi belum terhubung ke halaman admin mana pun. Pemohon juga belum bisa membatalkan sendiri.
8. Pengaduan publik belum punya tes Playwright ter-commit; verifikasi ujung ke ujung manual.

## Impor CSV dan pembuatan akun

Alur dua fase: `Periksa berkas` memetakan CSV ke kontrak `LecturerInputSchema` dan melaporkan
galat per baris dengan nomor baris spreadsheet, lalu `Impor sekarang` menulis secara atomik
lewat `executeAcademicPeopleImport` yang sudah ada. Opsi pembuatan akun menyusul di transaksi
terpisah dan menampilkan kata sandi awal satu kali; hanya hash yang masuk basis data, dan setiap
akun lahir dengan `mustChangePassword`.

Dua temuan sepanjang pengerjaan:

1. **`AcademicImportSafeCellSchema` tidak pernah dipakai.** Penjaga injeksi formula spreadsheet
   sudah didefinisikan dan diuji di `contracts/academic-editor.ts`, tetapi tidak dirujuk oleh
   jalur impor mana pun; hanya tesnya sendiri yang memakainya. Kini dipasang di parser CSV.
2. **Penjaga itu menolak nomor telepon yang sah.** Sel berawalan `+` dianggap rumus, sehingga
   `+62 254 200111` membuang seluruh barisnya tanpa alasan. Kolom `telepon` kini dikecualikan
   dan diandalkan pada `PhoneSchema`, yang membatasi isinya ke `[0-9 ()-]` setelah `+` opsional
   sehingga tidak dapat membawa muatan rumus.

Halaman ditempatkan di `/admin/impor-dosen`, bukan `/admin/dosen/impor`, karena
`tests/m4/ui/taxonomy-admin-form.test.tsx` menjaga sidebar agar tidak memuat substring
`/admin/dosen` (peninggalan tautan mati). Penjaga itu dibiarkan utuh.

Diverifikasi ujung ke ujung dengan Playwright memakai CSV berisi lima baris: dua sah,
satu berawalan rumus, satu berkode prodi asing, satu tanpa nama. Pratinjau menandai ketiga
baris bermasalah pada nomor baris yang benar, impor menulis dua dosen, dan tabel kata sandi
awal muncul.

## Pengaduan publik dan batas PPKS

Dua tautan mati di `/pengaduan` kini hidup: `/pengaduan/baru` mengirim pengaduan dan
`/pengaduan/lacak` melacak serta membalasnya. Backend `submitPublicTicket`, `getPublicTicket`,
dan `addPublicReply` sudah ada dan dipakai apa adanya.

**Intake PPKS sengaja tidak dibangun.** `PublicTicketInputSchema.category` memakai
`NON_PPKS_CATEGORIES`, dan tidak ada fungsi pengiriman PPKS mana pun di repo. Menyambungkan
formulir PPKS ke endpoint yang ada akan menaruh laporan kekerasan seksual di antrean tiket umum
yang dapat dibaca `ADMIN` dan `PETUGAS`, persis invarian yang dijaga `query-isolation.ts`.
Halaman `/pengaduan/baru` karena itu hanya menawarkan empat kategori non-PPKS dan memuat
pemberitahuan bahwa laporan PPKS ditangani kanal terpisah. Intake PPKS menunggu backend lane GPT.

Dua cacat ditemukan dan diperbaiki:

1. **Token pelacakan salah menjawab 503, bukan 404.** `workflow.ts` menulis ulang verifikasi
   token memakai `createTrackingTokenDigest`, yang memakai `.parse` sehingga **melempar** pada
   token base64url berformat benar tapi non-kanonik. Eksepsi itu tertangkap di atasnya dan
   dilaporkan sebagai `UNAVAILABLE`. Akibatnya kode pelacakan yang sekadar salah dijawab
   "layanan tidak tersedia", dan `GET /api/public/tickets` membalas 503 alih-alih 404.
   Kini didelegasikan ke `verifyTrackingTokenDigest` yang sudah ada di berkas yang sama dan
   menangani hal ini dengan `safeParse` plus placeholder. Duplikasi perbandingannya ikut hilang.
2. **Balasan tersimpan tetapi tidak tampil.** Formulir balasan semula punya `useActionState`
   sendiri, sehingga tampilan tiket milik komponen induk tidak pernah diperbarui. Pelapor akan
   menyimpulkan balasannya gagal dan mengirim ulang. Pelacakan dan balasan kini berbagi satu
   action dan satu state.

## Peminjaman ruangan

Placeholder `comingSoon` di `/peminjaman` diganti daftar ruangan, ditambah
`/peminjaman/ajukan` dan `/peminjaman/lacak`. Domain `submitBooking`,
`getPublicBooking`, dan `listPublicRooms` dipakai apa adanya, termasuk deteksi
tumpang tindih pada isolasi Serializable.

Formulir mengumpulkan tanggal dan jam sebagaimana dibaca orang di kampus, lalu
menstempelnya `+07:00`. Jakarta tidak mengenal daylight saving, sehingga offset tetap ini
eksak dan instan yang tersimpan tidak ambigu.

Seeder tidak pernah mengisi ruangan, sama seperti dosen sebelumnya, sehingga halamannya
akan kosong. Ditambahkan tiga ruangan beserta jam operasional Senin sampai Jumat;
`dayOfWeek` mengikuti `getUTCDay()` sesuai `jakartaDayAndMinute`.

Ditemukan dan diperbaiki: **bug token yang sama seperti pada tiket, di lokasi kedua.**
`getPublicBooking` memanggil `createTrackingTokenDigest`, yang memakai `.parse` sehingga
melempar pada token base64url berformat benar tapi non-kanonik; skema kuerinya hanya
memeriksa regex, bukan kanonisitas, jadi token semacam itu lolos sampai ke sana. Akibatnya
sama: 503 untuk kode yang sekadar salah, dan di sini lemparannya terjadi **sebelum** kueri
basis data. Perbandingannya juga memakai `!==` biasa atas digest rahasia, bukan konstan-waktu.
Keduanya kini didelegasikan ke `verifyTrackingTokenDigest`.

## Catatan kontrak lain

`src/config/institution.ts` hanya memuat tiga program studi (IAT, IH, AFI), sedangkan
`AGENTS.md` menyatakan v1 memiliki lima (IAT, IH, AFI, SAA, TASPI). Seeder mengikuti
konfigurasi karena dokumen menyebutnya sebagai kontrak kode. Selisih ini perlu
diselesaikan oleh tugas kontrak GPT.

## Permintaan kontrak

Perubahan `prisma/schema.prisma` dan `Role` dilakukan di luar lane Claude atas instruksi langsung
pengguna. Perlu ditinjau dan diadopsi oleh tugas kontrak milik GPT sebelum lane lain melakukan rebase.
