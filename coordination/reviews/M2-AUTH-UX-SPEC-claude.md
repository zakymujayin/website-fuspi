# M2 — Spesifikasi UX & Aksesibilitas Autentikasi (Claude lane)

| Metadata | Nilai |
|---|---|
| Task | `M2-CLAUDE-AUTH-UX-SPEC` |
| Lane | Claude (Experience) |
| Branch | `ai/claude/m2-auth-ux-spec` |
| Base SHA | `18a26dd` (baseline M2, `chore(coordination): open M2 security lanes`) |
| Reviewer | GPT |
| Tester | DeepSeek |
| Status dokumen | Spesifikasi read-only — **bukan** implementasi |

Dokumen ini menetapkan kontrak UX, copy intent, dan aksesibilitas untuk seluruh state autentikasi FUSPI sebelum implementasi M3. Tidak ada route, komponen, message file, konfigurasi Auth.js, proxy, skema, atau perilaku keamanan yang dibuat atau diubah di sini. Semua nilai keamanan (5 gagal/15 menit, sesi 8 jam, session database, `mustChangePassword`) dikutip dari `docs/06-autentikasi-role.md` dan `docs/20-test-acceptance-go-live.md` sebagai konteks — bukan keputusan baru dari lane ini.

---

## 0. Prinsip yang mengikat semua state

1. **Satu permukaan error.** Semua kegagalan login menghasilkan satu wadah error yang sama di tempat yang sama, dengan struktur DOM dan atribut ARIA yang sama. Yang berbeda hanya string — dan untuk kelas enumerasi (§2), string pun harus identik.
2. **Server adalah sumber kebenaran.** UI tidak boleh menyimpulkan sebab kegagalan dari status code, timing, panjang respons, atau field mana yang di-highlight. UI hanya merender kode state yang dikirim server.
3. **Tidak ada informasi sensitif di permukaan.** Tidak menampilkan/melog: apakah email terdaftar, apakah akun aktif, sisa percobaan, waktu blokir presisi, nama user sebelum autentikasi berhasil, stack trace, nama provider, atau pesan mentah Auth.js.
4. **ID wajib, EN/AR lengkap.** Login adalah permukaan internal bertaruh tinggi; ketiga locale harus punya copy penuh. Tidak boleh ada fallback banner "belum tersedia dalam bahasa ini" di layar login.
5. **RTL sejak awal.** Tidak ada utilitas fisik (`ml/mr/pl/pr/left/right/text-left/text-right`) di seluruh permukaan auth. Hanya `ms/me/ps/pe/start/end/text-start/text-end`.
6. **Copy adalah intent, bukan key final.** Tabel di bawah menyatakan *makna dan batasan* string. Penamaan key `messages/*.json` adalah keputusan lane implementasi, bukan dokumen ini.

### Kosakata state

| Kode state | Nama | Terlihat oleh pengguna sebagai |
|---|---|---|
| `AUTH_IDLE` | Form login siap | Form |
| `AUTH_SUBMITTING` | Kredensial sedang diverifikasi | Tombol loading |
| `AUTH_OK` | Berhasil | Redirect |
| `AUTH_REJECTED` | **Kelas enumerasi** — kredensial salah / email tak dikenal / akun nonaktif | Pesan generik identik |
| `AUTH_RATE_LIMITED` | Terlalu banyak percobaan | Pesan blokir |
| `AUTH_MUST_CHANGE_PASSWORD` | Login sah, password wajib diganti | Layar ganti password |
| `SESSION_EXPIRED` | Sesi habis waktu (8 jam) | Login + banner |
| `SESSION_REVOKED` | Sesi dicabut (nonaktif/role/password berubah) | Login + banner |
| `AUTH_UNAVAILABLE` | Kegagalan sistem | Pesan generik non-teknis |
| `LOGOUT_DONE` | Keluar atas kehendak sendiri | Login + banner |

---

## 1. Layout & fondasi aksesibilitas layar login

Berlaku untuk semua state di halaman `/[locale]/login`.

- **Struktur landmark.** Satu `<main>`; kartu login adalah `<form>` dengan `aria-labelledby` menunjuk `<h1>`. `<h1>` menyebut FUSPI dan konteks "masuk admin" — bukan judul kosong "Login".
- **Bukan halaman publik.** Tidak ada navigasi publik, breadcrumb, atau search di layar login. Language switcher **tetap ada** (pengguna internal berhak memilih bahasanya) dan tidak boleh menghapus isi form yang sudah diketik jika bahasa diganti sebelum submit.
- **Urutan fokus DOM:** skip-link → language switcher → `<h1>` → banner status (jika ada) → email → password → toggle visibilitas password → tombol Masuk. Tidak ada `tabindex` positif. Tidak ada elemen yang bisa difokus di luar urutan visual.
- **Fokus awal.** Saat halaman dimuat tanpa banner, fokus tetap di dokumen (tidak dipaksa ke input) agar screen reader membacakan `<h1>` dan konteks lebih dulu. Autofocus paksa ke input email dilarang karena memotong pembacaan judul.
- **Ring fokus wajib terlihat** pada semua kontrol: `ring-2 ring-royal-500 ring-offset-2` (`docs/03-design-system.md`). Tidak ada `outline: none` tanpa pengganti.
- **Kontras** teks, placeholder, pesan error, dan border input memenuhi WCAG AA. Pesan error tidak boleh mengandalkan warna saja — selalu ada ikon `alert-circle` + teks.
- **Password toggle** adalah `<button type="button">` dengan label aksesibel yang berubah ("Tampilkan kata sandi" / "Sembunyikan kata sandi") dan `aria-pressed`. Toggle **tidak** boleh mengirim form.
- **Autocomplete** `username` / `current-password` diaktifkan agar password manager bekerja; ini menurunkan risiko password lemah.
- **Caps Lock** boleh diberi hint netral pada field password. Hint ini bukan error dan tidak boleh masuk region error.

### Region pengumuman

Dua region terpisah, keduanya ada di DOM **sejak render pertama** (region yang baru muncul sering tidak dibacakan):

| Region | Peran | Isi |
|---|---|---|
| Region error form | `role="alert"` / `aria-live="assertive"` | `AUTH_REJECTED`, `AUTH_RATE_LIMITED`, `AUTH_UNAVAILABLE`, error validasi |
| Region status | `aria-live="polite"` | `AUTH_SUBMITTING`, `SESSION_EXPIRED`, `SESSION_REVOKED`, `LOGOUT_DONE` |

---

## 2. Kelas enumerasi — kontrak indistinguishability

**Ini adalah bagian paling mengikat dalam dokumen ini.**

State berikut **wajib tidak dapat dibedakan** oleh pengguna maupun oleh klien HTTP:

- email tidak terdaftar;
- email terdaftar, password salah;
- email terdaftar, password benar, **akun nonaktif** (`isActive=false`);
- email terdaftar, akun sudah dihapus/di-soft-delete;
- email valid secara format tetapi tidak pernah ada.

Semuanya dirender sebagai satu state tunggal: **`AUTH_REJECTED`**.

Yang harus identik antar kelima kasus:

| Dimensi | Aturan |
|---|---|
| Teks pesan | Persis sama, byte-for-byte, per locale |
| Penempatan pesan | Region error form yang sama |
| Field yang di-highlight | **Tidak ada field individual yang di-highlight.** Menandai hanya "password" akan mengonfirmasi bahwa email itu ada |
| Field yang dikosongkan | Hanya password. Email tetap terisi di semua kasus |
| Destinasi fokus | Region error, sama di semua kasus |
| Kode status HTTP & bentuk respons | Sama |
| Waktu respons | Tidak boleh berkorelasi dengan keberadaan akun (tanggung jawab lane platform; UI tidak boleh menambah delay kondisional apa pun) |
| Efek pada penghitung rate limit | Sama (gagal tetap gagal) |
| Analytics/telemetri | Satu event generik `login_failed` tanpa alasan, tanpa email, tanpa flag "user exists" |

**Larangan copy eksplisit.** Copy berikut dilarang di seluruh permukaan auth, dalam bahasa apa pun:
"Email tidak terdaftar", "Akun tidak ditemukan", "Kata sandi salah", "Akun Anda dinonaktifkan", "Hubungi admin karena akun nonaktif", "Sisa 2 percobaan lagi", "Email ini sudah digunakan".

**Akun nonaktif — catatan penting.** Pengguna nonaktif tidak boleh diberi tahu bahwa akunnya nonaktif **pada layar login**, karena itu mengungkap keberadaan akun kepada siapa pun yang menebak email. Jalur pemberitahuan yang sah adalah out-of-band (email/administrator), bukan UI login. Bila sesi yang **sudah aktif** kemudian dinonaktifkan, itu adalah `SESSION_REVOKED` (§8) — di sana pengguna sudah terautentikasi, jadi pesan boleh sedikit lebih spesifik tanpa membocorkan apa pun kepada penyerang anonim.

**`AUTH_RATE_LIMITED` sengaja berada di luar kelas ini.** Blokir harus dapat dibedakan agar pengguna sah tahu menunggu dan tidak menekan tombol berulang kali. Konsekuensinya: rate limit **harus dipicu oleh kombinasi HMAC IP + HMAC email** dan berperilaku sama untuk email yang ada maupun tidak ada (`docs/06`). Jika blokir hanya berlaku untuk email yang terdaftar, pesan blokir itu sendiri menjadi oracle enumerasi. **Pertanyaan kontrak untuk GPT — lihat §14.**

---

## 3. State: Login normal

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Judul: identitas fakultas + "Masuk" · Deskripsi: akses hanya untuk pengelola internal, tidak ada pendaftaran publik · Label: "Email", "Kata sandi" · Tombol: "Masuk" |
| **Copy intent EN** | Title: faculty identity + "Sign in" · Description: internal staff only, no public registration · Labels: "Email", "Password" · Button: "Sign in" |
| **Copy intent AR** | العنوان: هوية الكلية + «تسجيل الدخول» · الوصف: مخصص لمُدراء المحتوى الداخليين فقط، لا يوجد تسجيل عام · التسميات: «البريد الإلكتروني»، «كلمة المرور» · الزر: «تسجيل الدخول» |
| **Kelas enumerasi** | — |
| **RTL** | Kartu, label di atas input, ikon `alert-circle` di sisi `start`. Field email tetap `dir="ltr"` `text-start` di dalam layout RTL — alamat email adalah string LTR dan tidak boleh dicerminkan; tanda `@` dan titik harus tampil di posisi benar. Field password juga `dir="ltr"`. Label di sekitarnya tetap RTL. Font UI Arab (`--font-arabic-ui`), line-height ~1.8 |
| **Keyboard** | Tab mengikuti urutan §1. `Enter` di email atau password mengirim form. Tidak ada keyboard trap |
| **Screen reader** | `<h1>` dibacakan saat masuk halaman. Setiap input punya `<label>` terkait (bukan placeholder sebagai label). Field wajib ditandai `aria-required` |
| **Loading** | — |
| **Error recovery** | — |
| **Larangan** | Placeholder tidak boleh berisi contoh email nyata staf FUSPI. Tidak ada tautan "Daftar" atau "Lupa kata sandi" (tidak ada di v1 — `docs/06`); menampilkan tautan mati merusak kepercayaan |
| **Acceptance** | (a) Setiap input punya label terprogram; axe tidak melaporkan violation critical/serious. (b) Tab-order mengikuti urutan §1 tanpa `tabindex` positif. (c) Pada `ar`, `html[dir=rtl]` dan tidak ada horizontal scroll pada 360px. (d) Nilai email tetap LTR pada locale `ar`. (e) Tidak ada string "daftar"/"lupa kata sandi" di DOM |

---

## 4. State: `AUTH_SUBMITTING`

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Tombol: "Memverifikasi…" · Status: "Memverifikasi kredensial" |
| **Copy intent EN** | Button: "Verifying…" · Status: "Verifying credentials" |
| **Copy intent AR** | الزر: «جارٍ التحقق…» · الحالة: «جارٍ التحقق من بيانات الدخول» |
| **Kelas enumerasi** | Durasi dan copy state ini **wajib identik** untuk semua hasil akhir. Tidak boleh ada tahap "Memeriksa email…" lalu "Memeriksa kata sandi…" — dua tahap itu adalah oracle |
| **RTL** | Spinner 16px di sisi `start` teks tombol; **tidak** dicerminkan (spinner bukan ikon arah), tetapi arah putarnya tetap searah jarum jam di kedua arah |
| **Keyboard** | Tombol `disabled` selama submit. Fokus **tetap di tombol** — jangan pindahkan fokus, karena tombol yang di-disable dan kehilangan fokus akan membuang fokus ke `<body>` dan pengguna keyboard tersesat. Gunakan `aria-disabled` + penolakan submit ganda di handler, bukan `disabled` keras, agar fokus bertahan |
| **Screen reader** | Region polite mengumumkan "Memverifikasi kredensial" satu kali. `aria-busy` pada form |
| **Loading** | Spinner dalam tombol (`docs/17-G`), bukan overlay layar penuh, bukan skeleton. Input menjadi `readonly` (bukan `disabled`) agar tetap terbaca screen reader dan nilainya tetap terkirim |
| **Error recovery** | Submit ganda (double-Enter, double-click) tidak boleh menghasilkan dua percobaan — jika tidak, satu klik gugup pengguna sah bisa memakan dua slot dari 5 percobaan |
| **Larangan** | Tidak menampilkan sisa waktu, progress bar palsu, atau tahap verifikasi |
| **Acceptance** | (a) Klik/Enter berulang cepat menghasilkan tepat satu request. (b) Fokus keyboard tidak pernah lompat ke `<body>` selama submit. (c) Screen reader mengumumkan status verifikasi tepat satu kali. (d) Teks tombol loading identik untuk email valid dan tidak valid |

---

## 5. State: `AUTH_REJECTED` (kredensial salah / enumerasi tercegah)

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | "Email atau kata sandi salah." + kalimat pemulihan netral: "Periksa kembali dan coba lagi." **Tidak** menyebut mana yang salah, apakah email ada, atau status akun |
| **Copy intent EN** | "Incorrect email or password." + "Check your details and try again." |
| **Copy intent AR** | «البريد الإلكتروني أو كلمة المرور غير صحيحة.» + «يرجى التحقق من البيانات والمحاولة مرة أخرى.» |
| **Kelas enumerasi** | **YA — ini adalah state kelas enumerasi.** Kelima kasus di §2 (email tak dikenal, password salah, akun nonaktif, akun dihapus, email tak pernah ada) merender state ini secara identik |
| **RTL** | Ikon `alert-circle` di sisi `start` teks, `me-2`. Border input error tidak dipakai di sini (lihat baris Keyboard) |
| **Keyboard** | Fokus berpindah ke **region error**, bukan ke field. Memfokuskan field password akan menyiratkan "password-lah yang salah" dan itu membocorkan bahwa email benar. Region error diberi `tabindex="-1"` dan `.focus()`. Dari sana, Tab berikutnya kembali ke email |
| **Screen reader** | `role="alert"` membacakan pesan generik segera. Tidak ada teks tambahan yang hanya terbaca screen reader (`sr-only`) yang menjelaskan sebab sebenarnya — itu adalah bocoran enumerasi yang paling sering terlewat dalam audit |
| **Loading** | Kembali ke `AUTH_IDLE`; tombol aktif lagi |
| **Error recovery** | Email **dipertahankan**, password **dikosongkan**. Perilaku ini sama persis untuk kelima kasus. Pengguna dapat langsung mengetik ulang password tanpa mengisi email lagi |
| **Larangan** | Tidak menampilkan: sisa percobaan, keberadaan email, status aktif, nama pengguna, timestamp percobaan terakhir, alamat IP. Tidak melog email pada level yang dapat dibaca operator non-admin; tidak mengirim email ke analytics |
| **Acceptance** | (a) Uji DeepSeek: submit email tidak terdaftar, email terdaftar+password salah, dan email akun nonaktif — DOM error, teks, atribut ARIA, destinasi fokus, field yang dikosongkan, dan bentuk respons **identik** di ketiga kasus (dibandingkan sebagai string). (b) `role="alert"` mengumumkan pesan tanpa fokus berpindah ke input. (c) Tidak ada node `sr-only` tambahan di dalam region error. (d) Grep permukaan auth: tidak ada string terlarang dari §2. (e) Payload respons ketiga kasus punya panjang & kode status yang sama |

---

## 6. State: `AUTH_RATE_LIMITED`

Konteks (dari `docs/06`): maksimum 5 kegagalan dalam 15 menit per kombinasi HMAC IP + HMAC email; blokir 15 menit; pesan generik.

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | "Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit." Menyebut *rentang kasar*, bukan hitung mundur presisi |
| **Copy intent EN** | "Too many sign-in attempts. Try again in a few minutes." |
| **Copy intent AR** | «عدد كبير من محاولات تسجيل الدخول. يرجى المحاولة مرة أخرى بعد بضع دقائق.» |
| **Kelas enumerasi** | **Tidak** — state ini sengaja dapat dibedakan (lihat §2). **Syaratnya:** blokir harus terpicu identik untuk email terdaftar maupun tidak. Bila tidak, state ini menjadi oracle: penyerang mengirim 6 percobaan; melihat "terlalu banyak percobaan" = email ada, melihat "email atau kata sandi salah" = email tidak ada. Ini kontrak platform, bukan kontrak UI — **§14, pertanyaan 1** |
| **RTL** | Sama seperti §5. Angka menit dirender via `Intl.NumberFormat` locale aktif; angka tetap LTR di dalam kalimat Arab (perilaku bawaan browser, jangan diakali — `docs/12-E5`) |
| **Keyboard** | Fokus ke region error. Tombol Masuk menjadi `aria-disabled` selama blokir, tetapi **tetap fokusable** agar pengguna keyboard dapat menemukannya dan mendengar mengapa ia tidak bisa dipakai (`aria-describedby` → region error) |
| **Screen reader** | `role="alert"`, assertive. Bila hitung mundur ditampilkan, ia **tidak** boleh berada dalam `aria-live` — pembacaan tiap detik akan membanjiri screen reader. Umumkan sekali, lalu sekali lagi saat blokir berakhir (polite) |
| **Loading** | Selama blokir, submit tidak mengirim request sama sekali |
| **Error recovery** | Setelah blokir habis, form kembali ke `AUTH_IDLE` sendiri tanpa perlu reload; region polite mengumumkan bahwa pengguna dapat mencoba lagi. Email dipertahankan |
| **Larangan** | Tidak menampilkan: waktu blokir presisi ke detik dari server, jumlah percobaan tersisa/terpakai, IP, apakah blokir dipicu IP atau email, kapan percobaan gagal terakhir terjadi |
| **Acceptance** | (a) Percobaan ke-6 dalam 15 menit menghasilkan state ini. (b) Blokir muncul identik untuk email terdaftar dan tidak terdaftar. (c) Tidak ada angka percobaan tersisa di DOM/JSON/log. (d) Hitung mundur (jika ada) tidak berada di `aria-live`. (e) Tombol tetap dapat difokus dan menjelaskan dirinya lewat `aria-describedby` |

---

## 7. State: Akun inactive

| Aspek | Spesifikasi |
|---|---|
| **Copy intent** | **Tidak ada copy di layar login.** Akun nonaktif merender `AUTH_REJECTED` (§5) — copy generik yang sama persis |
| **Kelas enumerasi** | **YA — anggota kelas enumerasi.** Ini adalah keputusan sadar: memberi tahu "akun Anda nonaktif" akan mengonfirmasi bahwa email tersebut milik staf FUSPI |
| **RTL / Keyboard / SR / Loading / Recovery** | Identik dengan §5 — itulah intinya |
| **Larangan** | Tidak ada `sr-only`, `data-*`, komentar HTML, header respons, atau kode error khusus yang membedakan kasus ini di client |
| **Jalur pemberitahuan sah** | Out-of-band (administrator memberi tahu pengguna). UI login bukan kanal yang tepat. Jika sesi aktif kemudian dinonaktifkan → §8 `SESSION_REVOKED` |
| **Acceptance** | (a) Login dengan akun `isActive=false` dan password **benar** menghasilkan DOM, teks, fokus, dan respons yang identik dengan login password salah. (b) Tidak ada penanda pembeda di RSC payload/JSON/atribut. (c) Tidak ada session record yang terbuat |

---

## 8. State: Mandatory first password change (`AUTH_MUST_CHANGE_PASSWORD`)

Konteks (dari `docs/06`): setelah login pertama dengan password seed, `mustChangePassword=true` memaksa penggantian; minimum 12 karakter; tolak password yang sama dengan email atau yang termasuk daftar password umum.

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Judul: "Ganti kata sandi Anda" · Alasan: "Kata sandi awal harus diganti sebelum Anda melanjutkan." · Field: "Kata sandi baru", "Ulangi kata sandi baru" · Syarat: "Minimal 12 karakter" dan "Tidak boleh sama dengan email Anda" — ditampilkan **sebelum** pengguna mengetik, bukan hanya sebagai error setelah gagal · Tombol: "Simpan dan lanjutkan" |
| **Copy intent EN** | "Change your password" · "Your initial password must be changed before you continue." · "New password", "Repeat new password" · "At least 12 characters", "Must not match your email address" · "Save and continue" |
| **Copy intent AR** | «تغيير كلمة المرور» · «يجب تغيير كلمة المرور الأولية قبل المتابعة.» · «كلمة المرور الجديدة»، «تأكيد كلمة المرور الجديدة» · «١٢ حرفًا على الأقل»، «يجب ألّا تطابق بريدك الإلكتروني» · «حفظ ومتابعة» |
| **Kelas enumerasi** | **Tidak berlaku** — pengguna sudah terautentikasi. Namun state ini **tidak boleh bocor sebelum autentikasi**: mustahil menyimpulkan dari layar login bahwa suatu email punya `mustChangePassword=true` |
| **RTL** | Daftar syarat password: ikon di sisi `start`, `ps-*` untuk indentasi. Field password `dir="ltr"`; label & syarat mengikuti arah dokumen. Ikon centang syarat terpenuhi bukan ikon arah → tidak dicerminkan |
| **Keyboard** | Fokus otomatis ke field "Kata sandi baru" saat layar dimuat — di sini autofocus **dibenarkan** karena layar hanya punya satu tugas dan judulnya dibacakan lewat `aria-labelledby` form. Tidak ada jalan keluar selain menyelesaikan atau logout: tombol "Keluar" harus tersedia dan dapat dijangkau keyboard, sehingga pengguna tidak terperangkap |
| **Screen reader** | Alasan wajib-ganti diumumkan saat masuk (polite region, sekali). Syarat password diikat ke input lewat `aria-describedby`, sehingga dibacakan saat fokus tiba — bukan hanya terlihat secara visual. Status "terpenuhi/belum" tiap syarat diperbarui di region polite yang di-*debounce*, **tidak** per ketukan tombol |
| **Loading** | Tombol → spinner + "Menyimpan…" (`docs/17-G`) |
| **Error recovery** | Password tidak memenuhi syarat: pesan menyebut **syarat mana** yang gagal (ini bukan bocoran — ini password milik pengguna sendiri). Konfirmasi tidak cocok: error di field konfirmasi, fokus ke sana. Kedua field password dikosongkan hanya bila server menolak; jangan kosongkan pada error validasi client (memaksa ketik ulang 12+ karakter itu hukuman yang tidak perlu) |
| **Larangan** | Tidak menampilkan password lama/seed. Tidak menampilkan password dalam plaintext di URL, log, toast, analytics, atau RSC payload. Tidak menyarankan password. Tidak ada "kekuatan password" berbasis skor yang mengirim password ke layanan eksternal |
| **Konsekuensi keamanan (untuk lane platform, bukan diimplementasikan di sini)** | Setelah password berganti, seluruh sesi lama pengguna dicabut (`docs/06`). Karena itu UX harus mengasumsikan **sesi lain milik pengguna akan mati**, dan tab lain akan mengalami §10 `SESSION_REVOKED`. Salin pesan §10 harus masuk akal untuk kasus jinak ini juga |
| **Acceptance** | (a) Pengguna dengan `mustChangePassword=true` tidak dapat mencapai rute admin mana pun — termasuk lewat URL langsung atau tombol Back. (b) Syarat password terbaca screen reader saat fokus tiba di input, tanpa perlu submit. (c) Tombol keluar tersedia dan dapat dijangkau keyboard (tidak ada perangkap). (d) Password tidak muncul di DOM, URL, log, atau payload. (e) Pengumuman syarat tidak dipicu per ketukan tombol. (f) Tidak ada cara menyimpulkan flag ini dari layar login |

---

## 9. State: `SESSION_EXPIRED`

Konteks: sesi database, `maxAge` 8 jam (`docs/06`).

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | "Sesi Anda telah berakhir. Silakan masuk kembali." Nada netral — ini kejadian rutin, bukan kesalahan pengguna |
| **Copy intent EN** | "Your session has ended. Please sign in again." |
| **Copy intent AR** | «انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.» |
| **Kelas enumerasi** | Tidak berlaku — pengguna sebelumnya terautentikasi. Namun banner ini dirender berdasarkan **isyarat yang tidak dapat dipalsukan menjadi oracle**: banner tidak boleh menyebut email/nama siapa pun, sehingga pengunjung anonim yang membuka URL login dengan parameter apa pun tidak belajar apa-apa |
| **RTL** | Banner in-page (`docs/17-E`): ikon di sisi `start`, lebar penuh kontainer, `rounded-lg` |
| **Keyboard** | Banner dirender **di atas form** dalam urutan DOM. Fokus ditempatkan ke banner (`tabindex="-1"`), sehingga Tab berikutnya jatuh ke email — pengguna mendengar alasan lebih dulu, lalu langsung sampai ke tugasnya |
| **Screen reader** | Region polite (bukan assertive — ini bukan darurat). Diumumkan sekali saat halaman login dimuat |
| **Loading** | — |
| **Error recovery** | **Safe redirect recovery** (§12): tujuan sebelumnya disimpan dan dipulihkan setelah login berhasil. Nilai form yang belum tersimpan **tidak** dijanjikan pulih (lihat §14 dan §13) |
| **Larangan** | Tidak menampilkan: nama/email pengguna yang sesinya berakhir, waktu kedaluwarsa presisi, ID sesi, token, atau bagian dari cookie. Banner tidak boleh dipicu oleh parameter query yang dapat dikendalikan penyerang tanpa validasi — jika bisa, itu menjadi permukaan phishing ("Sesi Anda berakhir, masukkan ulang password") |
| **Acceptance** | (a) Sesi kedaluwarsa → rute admin mengarahkan ke login dengan banner ini. (b) Banner mendahului form dalam urutan DOM dan menerima fokus. (c) Tidak ada PII/token di DOM, URL, atau payload. (d) Diumumkan polite, tepat sekali. (e) Setelah login, pengguna kembali ke tujuan asal (§12) |

---

## 10. State: `SESSION_REVOKED`

Konteks: sesi dihapus saat user dinonaktifkan, password diubah, atau role berubah (`docs/06`).

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | "Sesi Anda diakhiri karena ada perubahan pada akun Anda. Silakan masuk kembali." Menjelaskan *bahwa* akun berubah, **tidak** *apa* yang berubah |
| **Copy intent EN** | "Your session ended because your account changed. Please sign in again." |
| **Copy intent AR** | «تم إنهاء جلستك بسبب تغيير في حسابك. يرجى تسجيل الدخول مرة أخرى.» |
| **Kelas enumerasi** | Tidak berlaku pada layar ini (pengguna sudah terautentikasi sebelumnya), **tetapi**: pesan tidak boleh membedakan *nonaktif* vs *role berubah* vs *password berubah*. Membedakannya memberi tahu pengguna yang baru dinonaktifkan bahwa ia dinonaktifkan — dan lebih penting, membuat lane implementasi menuliskan tiga cabang copy yang mudah bocor ke tempat lain. Satu pesan, tiga sebab |
| **RTL** | Sama seperti §9 |
| **Keyboard** | Sama seperti §9: fokus ke banner, Tab berikutnya ke email |
| **Screen reader** | Region polite. Dibacakan sekali |
| **Loading** | Pencabutan dapat terjadi **saat pengguna sedang bekerja**. Ketika request berikutnya ditolak, UI tidak boleh menampilkan error teknis (401/403 mentah); ia mengarahkan ke login dengan banner ini |
| **Error recovery** | Jika pencabutan disebabkan pengguna mengganti passwordnya sendiri di tab lain, pesan ini tetap benar dan tidak membingungkan. Setelah login ulang, safe redirect (§12) berlaku. Bila akun ternyata nonaktif, login ulang akan menghasilkan `AUTH_REJECTED` generik (§5/§7) — perilaku ini konsisten dan tidak membocorkan apa pun |
| **Larangan** | Tidak menyebut: alasan spesifik pencabutan, role lama/baru, siapa yang mencabut, kapan, dari IP mana. Tidak menampilkan status HTTP mentah atau pesan Auth.js |
| **Acceptance** | (a) Menonaktifkan user, mengubah role-nya, atau mengubah password-nya masing-masing memutus sesi aktif dan mendarat di login dengan **pesan yang sama persis**. (b) Tidak ada error teknis/HTTP status yang terlihat pengguna. (c) Tidak ada PII atau alasan pencabutan di DOM/log/analytics. (d) Login ulang akun nonaktif menghasilkan §5 generik |

---

## 11. State: Logout

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Kontrol: "Keluar" · Konfirmasi (hanya bila ada pekerjaan belum tersimpan, §13): "Keluar tanpa menyimpan?" · Banner setelahnya: "Anda telah keluar." |
| **Copy intent EN** | "Sign out" · "Sign out without saving?" · "You have been signed out." |
| **Copy intent AR** | «تسجيل الخروج» · «تسجيل الخروج دون حفظ؟» · «تم تسجيل خروجك.» |
| **Kelas enumerasi** | Tidak berlaku |
| **RTL** | Kontrol keluar berada di menu pengguna pada topbar sisi `end` (`docs/03`); di RTL otomatis berpindah ke sisi kiri visual lewat properti logical. Dialog konfirmasi: footer tombol rata `end`, urutan `[Batal (sekunder)] [Keluar (destruktif)]` (`docs/17-F`) |
| **Keyboard** | Logout adalah **submit form/Server Action**, bukan `<a href>` — link GET untuk logout dapat dipicu oleh prefetch atau `<img>` pihak ketiga (CSRF logout; `docs/20-D` mensyaratkan uji CSRF pada logout). Dialog konfirmasi (bila muncul): fokus terperangkap, `Esc` menutup, fokus kembali ke pemicu (`docs/17-F`) |
| **Screen reader** | Setelah redirect ke login, banner "Anda telah keluar" diumumkan polite sekali |
| **Loading** | Tombol keluar → spinner + disabled-secara-aria selama proses. Tidak ada overlay layar penuh |
| **Error recovery** | Bila logout gagal (jaringan), tampilkan toast error yang **tidak auto-hilang** (`docs/17-E`) dan biarkan pengguna mencoba lagi. Jangan berpura-pura logout berhasil di client sementara sesi server masih hidup — itu memberi rasa aman palsu, terutama di komputer bersama |
| **Larangan** | Tidak menampilkan token/ID sesi. Tidak melog email pada event logout. Setelah logout, tombol Back **tidak boleh** memperlihatkan konten admin dari cache — halaman admin tidak boleh cacheable |
| **Acceptance** | (a) Logout memakai POST/Server Action; permintaan GET ke endpoint logout tidak mengakhiri sesi. (b) Uji CSRF logout lulus. (c) Setelah logout, Back tidak memperlihatkan data admin. (d) Session record terhapus di database, bukan hanya cookie di client. (e) Banner diumumkan polite sekali. (f) Dialog konfirmasi (bila ada) memerangkap fokus dan mengembalikan fokus ke pemicu |

---

## 12. Safe redirect recovery

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID / EN / AR** | Umumnya **tanpa copy** — pemulihan yang baik tidak terasa. Copy hanya muncul pada kasus tujuan ditolak: "Anda diarahkan ke Dasbor." / "You were taken to the Dashboard." / «تمت إعادتك إلى لوحة التحكم.» |
| **Kelas enumerasi** | Tujuan yang tersimpan **tidak boleh** mengungkap keberadaan resource kepada pengguna yang belum login. Menyimpan `/admin/berita/abc123/edit` lalu, setelah login gagal berulang kali, menampilkannya di UI ("Anda akan diarahkan ke: Edit berita «X»") akan membocorkan konten. **Tujuan tersimpan tidak pernah dirender sebagai teks di layar login.** |
| **Aturan validasi tujuan (kontrak UX; penegakan milik lane platform)** | Terima **hanya** path relatif yang: diawali satu `/`; **tidak** diawali `//` atau `/\` (protocol-relative → open redirect); tidak mengandung skema (`http:`, `https:`, `javascript:`, `data:`); ter-resolve ke origin yang sama; berada di dalam `/[locale]/admin/*`. Semua yang lain → jatuh ke `/[locale]/admin` |
| **RTL** | Locale tujuan mengikuti locale aktif pengguna saat login, bukan locale yang tertanam di URL tersimpan — pengguna yang login dalam `ar` mendarat di `/ar/...` bahkan bila tujuannya tersimpan sebagai `/id/...` |
| **Keyboard** | Setelah redirect, fokus ditempatkan ke `<h1>` halaman tujuan (bukan ke `<body>`), sehingga pengguna keyboard tahu ia sudah pindah halaman |
| **Screen reader** | Judul halaman tujuan diumumkan (fokus ke `<h1>` yang `tabindex="-1"`). Jika tujuan ditolak dan pengguna mendarat di dasbor, region polite menjelaskan singkat — jangan diam-diam mengarahkan ke tempat lain tanpa penjelasan |
| **Loading** | Antara submit sukses dan halaman tujuan siap: pertahankan `AUTH_SUBMITTING` (tombol tetap loading). **Jangan** menampilkan layar login kosong sesaat — itu terlihat seperti login gagal |
| **Error recovery** | Bila tujuan tersimpan tidak lagi valid (dihapus, atau role pengguna tidak mengizinkan), arahkan ke `/[locale]/admin` dengan pesan netral. **Jangan** menampilkan "Anda tidak punya akses ke halaman X" — nama halaman itu sendiri adalah informasi |
| **Larangan** | Tujuan tersimpan tidak boleh berisi query berisi PII/token. Tidak boleh menyimpan tujuan di `localStorage` yang bertahan setelah logout. Tidak menampilkan URL tujuan di layar login |
| **Acceptance** | (a) `?next=//evil.example` , `?next=https://evil.example`, `?next=/\evil.example`, `?next=javascript:alert(1)` semuanya mendarat di `/[locale]/admin`, tidak pernah keluar origin. (b) `?next=/id/admin/berita` memulihkan tujuan setelah login. (c) Tujuan tersimpan tidak pernah muncul sebagai teks di DOM layar login. (d) Login dalam `ar` mendarat pada rute `ar`. (e) Fokus mendarat di `<h1>` tujuan. (f) Tujuan yang ditolak karena role mendarat di dasbor tanpa menyebut nama halaman |

---

## 13. Unsaved-work messaging

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Peringatan navigasi: "Perubahan Anda belum tersimpan. Tinggalkan halaman ini?" · Tombol: "[Tetap di halaman] [Tinggalkan]" · Indikator status: "Belum tersimpan" |
| **Copy intent EN** | "You have unsaved changes. Leave this page?" · "[Stay on page] [Leave]" · "Unsaved" |
| **Copy intent AR** | «لديك تغييرات غير محفوظة. هل تريد مغادرة هذه الصفحة؟» · «[البقاء في الصفحة] [المغادرة]» · «غير محفوظ» |
| **Kelas enumerasi** | Tidak berlaku |
| **RTL** | Indikator "Belum tersimpan" di dekat tombol simpan pada sticky bar (`docs/17-G`), sisi `start`. Dialog: footer rata `end`, urutan `[Tetap (sekunder)] [Tinggalkan (destruktif)]` |
| **Keyboard** | Dialog memerangkap fokus; `Esc` = "Tetap di halaman" (opsi aman, sesuai konvensi: Esc tidak boleh membuang pekerjaan). Fokus awal dialog di tombol **"Tetap di halaman"**, bukan "Tinggalkan" — Enter refleks tidak boleh menghapus pekerjaan |
| **Screen reader** | Indikator "Belum tersimpan" diumumkan polite saat pertama kali form menjadi kotor, lalu **tidak diulang** setiap ketukan tombol. Dialog punya judul aksesibel (`docs/17-F`) |
| **Loading** | — |
| **Kasus keras: sesi mati saat form kotor** | Ini titik gesek terbesar. Ketika `SESSION_EXPIRED`/`SESSION_REVOKED` terjadi sementara pengguna punya draf panjang yang belum tersimpan, **redirect langsung ke login akan menghancurkan pekerjaan itu.** Spesifikasi UX: (i) jangan pernah membuang state form secara diam-diam; (ii) tampilkan `SESSION_EXPIRED` sebagai **dialog di atas halaman kerja** — bukan navigasi paksa — sehingga isi form tetap berada di layar; (iii) beri dua pilihan: "Masuk kembali" (membuka login, idealnya menjaga konteks) dan "Salin pekerjaan saya" (memungkinkan pengguna menyelamatkan teks secara manual); (iv) jangan menjanjikan pemulihan otomatis yang tidak dibangun. **Ini bergantung pada perilaku pencabutan sesi yang dimiliki lane platform — §14, pertanyaan 2** |
| **Error recovery** | Setelah login ulang berhasil (§12), pengguna kembali ke halaman edit yang sama. Apakah isi form ikut pulih adalah keputusan implementasi M3; dokumen ini hanya mensyaratkan bahwa **pekerjaan tidak dibuang tanpa pemberitahuan** |
| **Larangan** | Draf yang belum tersimpan tidak boleh dikirim ke analytics, log, atau `localStorage` yang tidak dibersihkan saat logout — draf konten dapat berisi materi belum terbit. Untuk permukaan PPKS, penyimpanan draf sisi-client **dilarang sepenuhnya** |
| **Acceptance** | (a) Menavigasi keluar dari form kotor memunculkan dialog; `Esc` dan fokus awal keduanya memilih opsi aman. (b) Sesi mati saat form kotor **tidak** langsung membuang isi form tanpa dialog. (c) Indikator "Belum tersimpan" diumumkan sekali, bukan per ketukan. (d) Tidak ada draf di `localStorage` setelah logout. (e) Tidak ada draf PPKS yang tersimpan di client |

---

## 14. Risiko & pertanyaan kontrak untuk GPT (lane platform)

Tiga hal di bawah **tidak dapat diselesaikan oleh lane UI** dan menentukan apakah spesifikasi ini dapat dipenuhi.

1. **Rate limit sebagai oracle enumerasi (risiko tertinggi).** §2 menempatkan akun-tidak-ada, password-salah, dan akun-nonaktif dalam satu kelas identik; §6 sengaja membuat `AUTH_RATE_LIMITED` dapat dibedakan agar pengguna sah tahu harus menunggu. Kedua keputusan itu hanya kompatibel bila blokir terpicu **identik** untuk email terdaftar maupun tidak terdaftar. `docs/06` menyebut kunci HMAC IP + HMAC email — yang secara prinsip memenuhi syarat ini, karena HMAC email tidak perlu tahu apakah email itu ada. **Mohon GPT konfirmasi eksplisit** bahwa penghitung dinaikkan dan blokir diterapkan untuk email yang tidak ada juga. Bila tidak, satu-satunya perbaikan di sisi UI adalah menghapus pesan blokir yang berbeda — yang merugikan pengguna sah dan mengundang lebih banyak percobaan.

2. **Perilaku pencabutan sesi terhadap pekerjaan belum tersimpan.** §13 mensyaratkan bahwa sesi yang mati saat form kotor tidak boleh membuang draf secara diam-diam. Ini menuntut agar deteksi sesi-mati muncul sebagai respons yang dapat ditangani UI (mis. penolakan yang dapat dikenali pada Server Action), **bukan** redirect keras dari `proxy.ts` yang mengganti dokumen. Perlu kepastian kontrak: apakah request admin yang sesinya sudah dicabut mengembalikan hasil yang dapat direndernya sebagai dialog, atau selalu berupa redirect navigasi?

3. **Timing sebagai oracle.** UI tidak menambahkan delay kondisional apa pun (§4). Namun bila server mengembalikan `AUTH_REJECTED` untuk email-tidak-ada jauh lebih cepat daripada untuk password-salah (karena bcrypt hanya dijalankan bila user ditemukan), kelas enumerasi §2 bocor lewat waktu, dan tidak ada yang bisa dilakukan UI untuk menutupnya. Perlu konfirmasi bahwa jalur autentikasi melakukan pekerjaan hashing yang setara pada kasus user-tidak-ada.

**Risiko lain yang lebih ringan.** Copy Arab dalam dokumen ini adalah *intent*, bukan terjemahan final — perlu ditinjau penutur asli sebelum masuk `messages/ar.json`. Larangan "tidak ada tautan Lupa Kata Sandi" (§3) berasal dari `docs/06` ("tidak ada reset password publik pada v1"); bila kebijakan itu berubah, §3 dan §5 harus ditinjau ulang bersamaan, karena alur reset password adalah permukaan enumerasi klasik.

---

## 15. Handoff

| Item | Nilai |
|---|---|
| Task | `M2-CLAUDE-AUTH-UX-SPEC` |
| Branch | `ai/claude/m2-auth-ux-spec` |
| Base SHA | `18a26dd` |
| Head SHA | dicatat pada commit `docs(review): specify M2 authentication UX states` |

**Ringkasan.** Spesifikasi UX/aksesibilitas read-only untuk sebelas state autentikasi. Kontribusi utama: kontrak *indistinguishability* (§2) yang menyatukan email-tidak-dikenal, password-salah, dan akun-nonaktif menjadi satu state `AUTH_REJECTED` identik hingga ke destinasi fokus dan bentuk respons; destinasi fokus error yang sengaja **tidak** menunjuk field agar tidak mengonfirmasi keberadaan email; serta aturan validasi safe-redirect yang menolak open redirect tanpa pernah merender tujuan tersimpan di layar login.

**File berubah.** Satu: `coordination/reviews/M2-AUTH-UX-SPEC-claude.md`. Tidak ada perubahan pada `src/**`, `messages/**`, `prisma/**`, dependensi, atau root config.

**Validasi.**

- `git diff --check` (satu-satunya `acceptance_commands` pada manifest) — bersih.
- `git diff --name-only 18a26dd...HEAD` — hanya file review di atas.
- Lint/typecheck/test tidak dijalankan: tidak ada kode yang berubah, sehingga hasilnya tidak akan berbeda dari baseline dan menjalankannya tidak memberi sinyal apa pun tentang perubahan ini.

**Area yang belum teruji.** Dokumen ini adalah spesifikasi, bukan implementasi — tidak ada perilaku yang dapat dieksekusi untuk diuji sekarang. Kriteria acceptance di §3–§13 ditulis agar DeepSeek dapat mengeksekusinya sebagai test M3; kriteria itu belum divalidasi terhadap kode apa pun.

**Risiko.** Tiga pertanyaan kontrak di §14 harus dijawab GPT sebelum implementasi M3 dimulai; pertanyaan 1 (rate limit sebagai oracle enumerasi) dapat membatalkan §6 bila jawabannya negatif.

**Tindak lanjut.**

1. GPT: jawab §14 (1–3) dalam kontrak auth M2.
2. Peninjau berbahasa Arab: validasi copy intent AR sebelum masuk `messages/ar.json`.
3. DeepSeek: turunkan test M3 dari kriteria acceptance §3–§13, dengan prioritas pada perbandingan byte-for-byte kelas enumerasi (§5, acceptance (a)) dan corpus open redirect (§12, acceptance (a)).
