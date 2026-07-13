# M2 — Spesifikasi UX & Aksesibilitas Autentikasi (Claude lane)

| Metadata | Nilai |
|---|---|
| Task | `M2-CLAUDE-AUTH-UX-SPEC-REVISION` (merevisi `M2-CLAUDE-AUTH-UX-SPEC`) |
| Lane | Claude (Experience) |
| Branch | `ai/claude/m2-auth-ux-spec-revision` |
| Base | `coordination/m2-revision-assignment` |
| Reviewer | GPT |
| Tester | DeepSeek |
| Status dokumen | Spesifikasi read-only — **bukan** implementasi |
| Revisi | Menerapkan keputusan mengikat `coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md` §A1–A5 |

Dokumen ini menetapkan kontrak UX, copy intent, dan aksesibilitas untuk seluruh state autentikasi FUSPI. Tidak ada route, komponen, message file, konfigurasi Auth.js, proxy, skema, atau perilaku keamanan yang dibuat atau diubah di sini.

**Sumber kebenaran yang mengikat dokumen ini:**

1. `coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md` (keputusan platform §A1–A5) — menang atas segalanya.
2. `src/contracts/auth.ts` (schema beku milik GPT) — nama field, kode kegagalan, dan bentuk hasil diambil dari sini, bukan direka ulang.
3. `docs/06`, `docs/12`, `docs/17`, `docs/20`, `docs/03` sebagai konteks.

**Seluruh pekerjaan auth di dokumen ini — spesifikasi, implementasi, dan test adversarial-nya — adalah M2** (per §A5). Tidak ada butir di dokumen ini yang boleh dijadwalkan ke M3. M3 tetap slice vertikal Post + Media + i18n dan belum aktif.

---

## 0. Prinsip yang mengikat semua state

1. **Satu permukaan error.** Semua kegagalan login menghasilkan satu wadah error yang sama di tempat yang sama, dengan struktur DOM dan atribut ARIA yang sama. Yang berbeda hanya string — dan untuk kelas enumerasi (§2), string pun harus identik.
2. **Server adalah sumber kebenaran.** UI tidak menyimpulkan sebab kegagalan dari status code, timing, panjang respons, atau field mana yang di-highlight. UI hanya merender `code` dari `LoginResultSchema`.
3. **Tidak ada informasi sensitif di permukaan.** Tidak menampilkan/melog: apakah email terdaftar, apakah akun aktif, sisa percobaan, waktu blokir presisi, nama user sebelum autentikasi berhasil, stack trace, nama provider, atau pesan mentah Auth.js.
4. **ID wajib, EN/AR lengkap.** Login adalah permukaan internal bertaruh tinggi; ketiga locale harus punya copy penuh. Tidak ada banner fallback "belum tersedia dalam bahasa ini" di layar login.
5. **RTL sejak awal.** Tidak ada utilitas fisik (`ml/mr/pl/pr/left/right/text-left/text-right`) di seluruh permukaan auth. Hanya `ms/me/ps/pe/start/end/text-start/text-end`.
6. **Copy adalah intent, bukan key final.** Tabel di bawah menyatakan *makna dan batasan* string. Penamaan key `messages/*.json` adalah keputusan lane implementasi. **Copy Arab adalah intent yang masih menunggu tinjauan penutur asli** (§14).
7. **Keamanan menang atas kenyamanan.** Di setiap titik yang menyenggol pekerjaan pengguna, aturan §A3 menentukan siapa yang mengalah — dan yang mengalah selalu kenyamanan.

### Kosakata state

Kode kegagalan publik diambil **persis** dari `PublicLoginFailureCodeSchema` di `src/contracts/auth.ts`. UI tidak boleh menciptakan kode lain.

| Kode / state | Sumber | Terlihat oleh pengguna sebagai |
|---|---|---|
| `AUTH_IDLE` | UI-only | Form login siap |
| `AUTH_SUBMITTING` | UI-only | Tombol loading |
| `ok: true` | `LoginResultSchema` | Redirect ke `redirectTo` |
| `ok: true, requiresPasswordChange: true` | `LoginResultSchema` | Layar ganti password (§8) |
| **`INVALID_CREDENTIALS`** | kontrak | **Kelas enumerasi** — email tak dikenal / password salah / akun nonaktif / akun terhapus |
| **`TRY_AGAIN_LATER`** | kontrak | Blokir rate limit (§6) |
| **`AUTH_UNAVAILABLE`** | kontrak | Kegagalan sistem tersanitasi |
| `SESSION_INVALID` (expired) | §A3 | Login + banner, atau kunci re-autentikasi (§9) |
| `SESSION_INVALID` (revoked) | §A3 | Kunci keras + login (§10) |
| `LOGOUT_DONE` | UI-only | Login + banner |

---

## 1. Layout & fondasi aksesibilitas layar login

Berlaku untuk semua state di halaman `/[locale]/login`.

- **Struktur landmark.** Satu `<main>`; kartu login adalah `<form>` dengan `aria-labelledby` menunjuk `<h1>`. `<h1>` menyebut FUSPI dan konteks "masuk admin".
- **Bukan halaman publik.** Tidak ada navigasi publik, breadcrumb, atau search. Language switcher **tetap ada** dan tidak boleh menghapus isi form yang sudah diketik bila bahasa diganti sebelum submit.
- **Urutan fokus DOM:** skip-link → language switcher → `<h1>` → banner status (jika ada) → email → password → toggle visibilitas password → tombol Masuk. Tidak ada `tabindex` positif.
- **Fokus awal.** Tanpa banner, fokus tetap di dokumen (tidak dipaksa ke input) agar screen reader membacakan `<h1>` lebih dulu. Autofocus paksa ke email dilarang karena memotong pembacaan judul.
- **Ring fokus wajib terlihat:** `ring-2 ring-royal-500 ring-offset-2` (`docs/03`). Tidak ada `outline: none` tanpa pengganti.
- **Kontras** memenuhi WCAG AA. Pesan error tidak mengandalkan warna saja — selalu ikon `alert-circle` + teks.
- **Password toggle** adalah `<button type="button">` dengan label aksesibel yang berubah ("Tampilkan kata sandi" / "Sembunyikan kata sandi") dan `aria-pressed`. Tidak mengirim form.
- **Autocomplete** `username` / `current-password` diaktifkan agar password manager bekerja.
- **Caps Lock** boleh diberi hint netral pada field password. Hint ini bukan error dan tidak masuk region error.
- **Normalisasi email.** `LoginCredentialsSchema` melakukan `trim().toLowerCase()`. UI tidak boleh menampilkan ulang email yang sudah dinormalisasi dengan cara yang mengubah apa yang diketik pengguna di tengah pengetikan; normalisasi adalah urusan server.

### Region pengumuman

Dua region terpisah, keduanya ada di DOM **sejak render pertama** (region yang baru muncul sering tidak dibacakan):

| Region | Peran | Isi |
|---|---|---|
| Region error form | `role="alert"` / `aria-live="assertive"` | `INVALID_CREDENTIALS`, `TRY_AGAIN_LATER`, `AUTH_UNAVAILABLE`, error validasi |
| Region status | `aria-live="polite"` | `AUTH_SUBMITTING`, sesi berakhir, `LOGOUT_DONE` |

---

## 2. Kelas enumerasi — kontrak indistinguishability

**Ini bagian paling mengikat dalam dokumen ini.** Ia sekarang berdiri di atas keputusan platform §A1 dan §A2, bukan lagi asumsi UI.

State berikut **wajib tidak dapat dibedakan** oleh pengguna maupun klien HTTP, dan semuanya dirender sebagai **`INVALID_CREDENTIALS`**:

- email tidak terdaftar;
- email terdaftar, password salah;
- email terdaftar, password benar, **akun nonaktif** (`isActive=false`);
- email terdaftar, akun terhapus;
- email valid secara format tetapi tidak pernah ada.

Yang harus identik antar kelima kasus:

| Dimensi | Aturan |
|---|---|
| Teks pesan | Persis sama, byte-for-byte, per locale |
| Penempatan pesan | Region error form yang sama |
| Field yang di-highlight | **Tidak ada field individual yang di-highlight.** Menandai hanya "password" akan mengonfirmasi bahwa email itu ada |
| Field yang dikosongkan | Hanya password. Email tetap terisi di semua kasus |
| Destinasi fokus | Region error, sama di semua kasus |
| Kode status HTTP, header, dan bentuk respons | Sama (§A1) |
| Waktu respons | Diseimbangkan di server (§A2): satu operasi setara `bcrypt.compare` cost 12 selalu dijalankan — terhadap hash user bila ditemukan, terhadap **konstanta dummy hash cost 12** bila tidak; user nonaktif tetap menjalankan perbandingan hash sungguhan lalu mengembalikan kegagalan publik yang sama. UI **tidak** menambahkan delay kondisional apa pun |
| Penghitung rate limit | **Dinaikkan sama** untuk email tidak dikenal, user nonaktif, dan password salah (§A1) |
| Analytics/telemetri | Satu event generik `login_failed` tanpa alasan, tanpa email, tanpa flag "user exists" |

**Larangan copy eksplisit.** Dilarang di seluruh permukaan auth, dalam bahasa apa pun:
"Email tidak terdaftar", "Akun tidak ditemukan", "Kata sandi salah", "Akun Anda dinonaktifkan", "Hubungi admin karena akun nonaktif", "Sisa 2 percobaan lagi", "Email ini sudah digunakan".

**Akun nonaktif.** Pengguna nonaktif tidak diberi tahu bahwa akunnya nonaktif **pada layar login**, karena itu mengungkap keberadaan akun kepada siapa pun yang menebak email. Jalur pemberitahuan yang sah adalah out-of-band (administrator), bukan UI login. Bila sesi yang **sudah aktif** kemudian dicabut, itu §10 — di sana pengguna sudah terautentikasi.

**`TRY_AGAIN_LATER` berada di luar kelas ini dan itu kini aman.** Blokir dapat dibedakan agar pengguna sah tahu harus menunggu. Ini tidak menjadi oracle **karena §A1 mewajibkan penghitung naik dan blokir berlaku identik untuk email yang tidak ada**, dengan kunci majemuk HMAC(email ternormalisasi) + HMAC(IP) yang penurunannya tidak boleh menanyakan keberadaan user. Lihat §14 butir 1.

---

## 3. State: Login normal

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Judul: identitas fakultas + "Masuk" · Deskripsi: akses hanya untuk pengelola internal, tidak ada pendaftaran publik · Label: "Email", "Kata sandi" · Tombol: "Masuk" |
| **Copy intent EN** | Title: faculty identity + "Sign in" · Description: internal staff only, no public registration · Labels: "Email", "Password" · Button: "Sign in" |
| **Copy intent AR** *(intent — menunggu tinjauan penutur asli)* | العنوان: هوية الكلية + «تسجيل الدخول» · الوصف: مخصص للمُدراء الداخليين فقط، لا يوجد تسجيل عام · التسميات: «البريد الإلكتروني»، «كلمة المرور» · الزر: «تسجيل الدخول» |
| **Kelas enumerasi** | — |
| **RTL** | Kartu, label di atas input, ikon di sisi `start`. Field email dan password tetap `dir="ltr"` `text-start` di dalam layout RTL — email/password adalah string LTR dan tidak boleh dicerminkan; `@` dan titik harus tampil di posisi benar. Label di sekitarnya tetap RTL. Font UI Arab (`--font-arabic-ui`), line-height ~1.8 |
| **Keyboard** | Tab mengikuti urutan §1. `Enter` di email atau password mengirim form. Tidak ada keyboard trap |
| **Screen reader** | `<h1>` dibacakan saat masuk halaman. Setiap input punya `<label>` terkait (bukan placeholder sebagai label). Field wajib ditandai `aria-required` |
| **Loading** | — |
| **Error recovery** | — |
| **Larangan** | Placeholder tidak boleh berisi contoh email nyata staf FUSPI. Tidak ada tautan "Daftar" atau "Lupa kata sandi" (tidak ada di v1 — `docs/06`) |
| **Acceptance (M2)** | (a) Setiap input punya label terprogram; axe tanpa violation critical/serious. (b) Tab-order sesuai §1 tanpa `tabindex` positif. (c) Pada `ar`, `html[dir=rtl]`, tanpa horizontal scroll pada 360px. (d) Nilai email tetap LTR pada locale `ar`. (e) Tidak ada string "daftar"/"lupa kata sandi" di DOM |

---

## 4. State: `AUTH_SUBMITTING`

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Tombol: "Memverifikasi…" · Status: "Memverifikasi kredensial" |
| **Copy intent EN** | Button: "Verifying…" · Status: "Verifying credentials" |
| **Copy intent AR** *(intent)* | الزر: «جارٍ التحقق…» · الحالة: «جارٍ التحقق من بيانات الدخول» |
| **Kelas enumerasi** | Durasi dan copy state ini **wajib identik** untuk semua hasil akhir. Tidak boleh ada tahap "Memeriksa email…" lalu "Memeriksa kata sandi…" — dua tahap itu adalah oracle. Penyeimbangan waktu sesungguhnya dilakukan server (§A2); UI tidak menambahkan delay buatan, dan juga **tidak boleh menghapusnya** dengan optimistic UI yang menampilkan hasil sebelum server menjawab |
| **RTL** | Spinner 16px di sisi `start` teks tombol; bukan ikon arah → tidak dicerminkan |
| **Keyboard** | Fokus **tetap di tombol**. Gunakan `aria-disabled` + penolakan submit ganda di handler, **bukan** `disabled` keras — tombol yang di-`disabled` kehilangan fokus dan membuang fokus ke `<body>`, sehingga pengguna keyboard tersesat |
| **Screen reader** | Region polite mengumumkan "Memverifikasi kredensial" satu kali. `aria-busy` pada form |
| **Loading** | Spinner dalam tombol (`docs/17-G`), bukan overlay layar penuh, bukan skeleton. Input menjadi `readonly` (bukan `disabled`) agar tetap terbaca screen reader dan nilainya tetap terkirim |
| **Error recovery** | Submit ganda (double-Enter, double-click) tidak boleh menghasilkan dua percobaan — bila tidak, satu klik gugup pengguna sah memakan dua slot dari lima percobaan |
| **Larangan** | Tidak menampilkan sisa waktu, progress bar palsu, atau tahap verifikasi |
| **Acceptance (M2)** | (a) Klik/Enter berulang cepat menghasilkan tepat satu request. (b) Fokus keyboard tidak pernah lompat ke `<body>` selama submit. (c) Screen reader mengumumkan status verifikasi tepat sekali. (d) Teks dan durasi tombol loading identik untuk email valid dan tidak valid |

---

## 5. State: `INVALID_CREDENTIALS`

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | "Email atau kata sandi salah." + "Periksa kembali dan coba lagi." **Tidak** menyebut mana yang salah, apakah email ada, atau status akun |
| **Copy intent EN** | "Incorrect email or password." + "Check your details and try again." |
| **Copy intent AR** *(intent)* | «البريد الإلكتروني أو كلمة المرور غير صحيحة.» + «يرجى التحقق من البيانات والمحاولة مرة أخرى.» |
| **Kelas enumerasi** | **YA.** Kelima kasus §2 merender state ini secara identik |
| **RTL** | Ikon `alert-circle` di sisi `start` teks, `me-2`. Border error pada field individual **tidak** dipakai (lihat Keyboard) |
| **Keyboard** | Fokus berpindah ke **region error**, bukan ke field. Memfokuskan password menyiratkan "password-lah yang salah" dan itu membocorkan bahwa email benar. Region error `tabindex="-1"` lalu `.focus()`. Tab berikutnya kembali ke email |
| **Screen reader** | `role="alert"` membacakan pesan generik segera. **Tidak ada** teks `sr-only` tambahan yang menjelaskan sebab sebenarnya — ini bocoran enumerasi yang paling sering terlewat dalam audit |
| **Loading** | Kembali ke `AUTH_IDLE`; tombol aktif lagi |
| **Error recovery** | Email **dipertahankan**, password **dikosongkan** — sama persis untuk kelima kasus |
| **Larangan** | Tidak menampilkan sisa percobaan, keberadaan email, status aktif, nama pengguna, timestamp percobaan, atau IP. Tidak melog email ke analytics |
| **Acceptance (M2)** | (a) Submit email tidak terdaftar, email terdaftar+password salah, **dan email akun nonaktif dengan password benar** — DOM error, teks, atribut ARIA, destinasi fokus, field yang dikosongkan, status, header, dan bentuk respons **identik** (dibandingkan sebagai string). (b) `role="alert"` mengumumkan tanpa fokus berpindah ke input. (c) Tidak ada node `sr-only` tambahan di region error. (d) Grep permukaan auth: tidak ada string terlarang §2. (e) Distribusi waktu respons ketiga kasus setara dalam toleransi terdokumentasi — **bukan** klaim kesetaraan nanodetik (§A2) |

---

## 6. State: `TRY_AGAIN_LATER`

Konteks (`docs/06`, §A1): maksimum 5 kegagalan dalam 15 menit per kunci majemuk HMAC(email ternormalisasi) + HMAC(IP); blokir 15 menit; pesan generik.

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | "Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit." Menyebut *rentang kasar*, bukan hitung mundur presisi |
| **Copy intent EN** | "Too many sign-in attempts. Try again in a few minutes." |
| **Copy intent AR** *(intent)* | «عدد كبير من محاولات تسجيل الدخول. يرجى المحاولة مرة أخرى بعد بضع دقائق.» |
| **Kelas enumerasi** | **Tidak** — sengaja dapat dibedakan, dan ini **aman** karena §A1 mewajibkan penghitung naik dan blokir berlaku identik untuk email terdaftar, tidak terdaftar, dan nonaktif. Perilaku percobaan ke-5/ke-6, status, bentuk respons, header, dan copy publik sama untuk akun ada dan tidak ada |
| **RTL** | Banner sama seperti §5. Angka menit via `Intl.NumberFormat` locale aktif; angka tetap LTR di dalam kalimat Arab (`docs/12-E5`) |
| **Keyboard** | Fokus ke region error. Tombol Masuk menjadi `aria-disabled` selama blokir tetapi **tetap fokusable**, dengan `aria-describedby` menunjuk region error, sehingga pengguna keyboard menemukan tombol dan mendengar mengapa ia tak bisa dipakai |
| **Screen reader** | `role="alert"`, assertive, sekali. Bila hitung mundur ditampilkan, ia **tidak** boleh berada di dalam `aria-live` — pembacaan tiap detik membanjiri screen reader. Umumkan sekali, lalu sekali lagi (polite) saat blokir berakhir |
| **Loading** | Selama blokir, submit tidak mengirim request sama sekali |
| **Error recovery** | Setelah blokir habis, form kembali ke `AUTH_IDLE` sendiri tanpa reload; region polite mengumumkan bahwa pengguna dapat mencoba lagi. Email dipertahankan |
| **Larangan** | Tidak menampilkan: waktu blokir presisi dari server, jumlah percobaan tersisa/terpakai (§A1: **tidak ada** remaining-attempt count yang diekspos), IP, atau apakah blokir dipicu IP atau email |
| **Acceptance (M2)** | (a) Percobaan ke-6 dalam 15 menit menghasilkan state ini. (b) **Blokir muncul identik untuk email terdaftar, tidak terdaftar, dan nonaktif** — status, header, bentuk respons, dan copy sama. (c) Tidak ada angka percobaan tersisa di DOM/JSON/log/header. (d) Hitung mundur (bila ada) tidak berada di `aria-live`. (e) Tombol tetap fokusable dan menjelaskan dirinya via `aria-describedby` |

---

## 7. State: Akun inactive

| Aspek | Spesifikasi |
|---|---|
| **Copy intent** | **Tidak ada copy di layar login.** Akun nonaktif merender `INVALID_CREDENTIALS` (§5) — copy generik yang sama persis |
| **Kelas enumerasi** | **YA.** Keputusan sadar: memberi tahu "akun Anda nonaktif" mengonfirmasi bahwa email itu milik staf FUSPI |
| **Timing** | Per §A2, user nonaktif **tetap menjalankan perbandingan hash sungguhan** sebelum mengembalikan kegagalan publik yang sama — sehingga tidak ada jalan pintas waktu yang membocorkan status nonaktif |
| **RTL / Keyboard / SR / Loading / Recovery** | Identik dengan §5 — itulah intinya |
| **Larangan** | Tidak ada `sr-only`, `data-*`, komentar HTML, header respons, atau kode error khusus yang membedakan kasus ini di client |
| **Jalur pemberitahuan sah** | Out-of-band (administrator). UI login bukan kanalnya. Bila sesi aktif kemudian dicabut → §10 |
| **Acceptance (M2)** | (a) Login akun `isActive=false` dengan password **benar** menghasilkan DOM, teks, fokus, status, header, dan respons identik dengan password salah. (b) Tidak ada penanda pembeda di RSC payload/JSON/atribut. (c) Tidak ada session record yang terbuat. (d) Penghitung rate limit tetap naik (§A1) |

---

## 8. State: Mandatory password change

Dipicu oleh `LoginResultSchema` → `ok: true, requiresPasswordChange: true`. Bentuk input dibekukan oleh **`PasswordChangeInputSchema`** (`src/contracts/auth.ts`): **`currentPassword`, `newPassword`, `confirmPassword`** — **tiga field, bukan dua.**

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Judul: "Ganti kata sandi Anda" · Alasan: "Kata sandi awal harus diganti sebelum Anda melanjutkan." · Field: **"Kata sandi saat ini"**, "Kata sandi baru", "Ulangi kata sandi baru" · Syarat (ditampilkan **sebelum** mengetik, bukan hanya sebagai error): "Minimal 12 karakter", "Harus berbeda dari kata sandi saat ini" · Tombol: "Simpan dan lanjutkan" |
| **Copy intent EN** | "Change your password" · "Your initial password must be changed before you continue." · **"Current password"**, "New password", "Repeat new password" · "At least 12 characters", "Must differ from your current password" · "Save and continue" |
| **Copy intent AR** *(intent)* | «تغيير كلمة المرور» · «يجب تغيير كلمة المرور الأولية قبل المتابعة.» · **«كلمة المرور الحالية»**، «كلمة المرور الجديدة»، «تأكيد كلمة المرور الجديدة» · «١٢ حرفًا على الأقل»، «يجب أن تختلف عن كلمة المرور الحالية» · «حفظ ومتابعة» |
| **Kelas enumerasi** | Tidak berlaku — pengguna sudah terautentikasi. Namun state ini **tidak boleh bocor sebelum autentikasi**: mustahil menyimpulkan dari layar login bahwa suatu email punya `mustChangePassword=true`. `requiresPasswordChange` hanya ada pada cabang `ok: true` |
| **RTL** | Ketiga field password `dir="ltr"`; label dan daftar syarat mengikuti arah dokumen. Syarat: ikon di sisi `start`, `ps-*` untuk indentasi. Ikon centang bukan ikon arah → tidak dicerminkan |
| **Keyboard** | Urutan Tab: **Kata sandi saat ini → Kata sandi baru → Ulangi → Simpan**. Fokus otomatis ke **"Kata sandi saat ini"** saat layar dimuat — autofocus dibenarkan di sini karena layar hanya punya satu tugas dan judulnya dibacakan lewat `aria-labelledby` form. Tombol "Keluar" wajib tersedia dan dapat dijangkau keyboard agar pengguna tidak terperangkap |
| **Screen reader** | Alasan wajib-ganti diumumkan sekali (polite). Syarat password diikat ke input `newPassword` lewat **`aria-describedby`**, sehingga dibacakan saat fokus tiba — bukan hanya terlihat. Status "terpenuhi/belum" tiap syarat diperbarui di region polite yang **di-debounce**, tidak per ketukan tombol. Field `currentPassword` punya `aria-describedby` sendiri yang menjelaskan bahwa ini kata sandi yang barusan dipakai untuk masuk — tanpa itu, pengguna sering mengira diminta mengetik kata sandi baru dua kali |
| **Loading** | Tombol → spinner + "Menyimpan…" (`docs/17-G`) |
| **Validasi & error recovery** | Server memvalidasi ulang `currentPassword` (§A4) — client tidak pernah memutuskan sendiri. Pemetaan error ke field mengikuti `path` dari schema beku: `confirmPassword` tidak cocok → error di field konfirmasi, fokus ke sana; `newPassword` sama dengan `currentPassword` → error di field baru. **`currentPassword` salah** → error pada field itu, fokus ke sana, dan **hanya field itu yang dikosongkan** — ini bukan bocoran enumerasi (pengguna sudah terautentikasi, ini password miliknya sendiri). Pada error validasi client, **jangan** kosongkan field password mana pun: memaksa ketik ulang 12+ karakter adalah hukuman yang tidak perlu. Pada penolakan server, kosongkan hanya field yang ditolak. Kebijakan tambahan `docs/06` (tolak password sama dengan email / daftar password umum) ditegakkan server; pesannya menyebut syarat mana yang gagal |
| **Larangan** | Tidak menampilkan password lama/seed. Password (termasuk `currentPassword`) **tidak pernah** muncul di URL, log, toast, analytics, atau RSC payload; semuanya `type="password"` bertopeng (§A4). Tidak menyarankan password. Tidak ada meter kekuatan yang mengirim password ke layanan eksternal |
| **Konsekuensi sesi (§A4)** | Perubahan berhasil membersihkan `mustChangePassword` **dan mencabut seluruh sesi sebelumnya secara transaksional** sebelum sesi baru diterbitkan. Karena itu tab lain milik pengguna akan mengalami §10 (revoked). Copy §10 harus tetap masuk akal untuk kasus jinak ini — dan memang begitu: "ada perubahan pada akun Anda" |
| **Acceptance (M2)** | (a) Form memuat **ketiga** field `PasswordChangeInputSchema`; submit tanpa `currentPassword` ditolak server. (b) Pengguna dengan `mustChangePassword=true` tidak dapat mencapai rute admin mana pun — termasuk via URL langsung dan tombol Back. (c) Syarat password terbaca screen reader saat fokus tiba di `newPassword`, tanpa perlu submit. (d) `currentPassword` salah → error terpetakan ke field itu; tidak ada password yang bocor ke DOM/URL/log/payload. (e) Tombol keluar tersedia dan dapat dijangkau keyboard. (f) Pengumuman syarat tidak dipicu per ketukan tombol. (g) Setelah sukses, sesi lama tercabut dan tab lain mendarat di §10. (h) Tidak ada cara menyimpulkan flag ini dari layar login |

---

## 9. State: Sesi kedaluwarsa (expired)

Konteks: sesi database 8 jam (`docs/06`). Aturan keselamatan dari **§A3**.

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | "Sesi Anda telah berakhir. Silakan masuk kembali." Nada netral — ini kejadian rutin, bukan kesalahan pengguna |
| **Copy intent EN** | "Your session has ended. Please sign in again." |
| **Copy intent AR** *(intent)* | «انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.» |
| **Kelas enumerasi** | Tidak berlaku. Banner tidak menyebut email/nama siapa pun, sehingga pengunjung anonim yang membuka URL login dengan parameter apa pun tidak belajar apa-apa |
| **RTL** | Banner in-page (`docs/17-E`): ikon di sisi `start`, lebar penuh kontainer, `rounded-lg` |
| **Keyboard** | Banner dirender **di atas form** dalam urutan DOM, menerima fokus (`tabindex="-1"`), sehingga Tab berikutnya jatuh ke email — pengguna mendengar alasan lebih dulu, lalu sampai ke tugasnya |
| **Screen reader** | Region polite (bukan assertive — ini bukan darurat), sekali saat halaman login dimuat |
| **Perilaku pada form CMS non-sensitif** | Per §A3: Server Action / API mengembalikan **hasil session-invalid yang bertipe dan tersanitasi** (bukan error mentah Auth.js/database), sehingga UI dapat menanganinya di tempat alih-alih dilempar keluar halaman. Pada form CMS **non-sensitif**, UI **boleh** menahan state yang belum tersimpan **di memori saja**, di balik **kunci re-autentikasi** — tanpa `localStorage`/`sessionStorage`. **Ini belum boleh dijanjikan kepada pengguna** sampai ada test yang mengeksekusinya (§13, §A3) |
| **Perilaku pada navigasi terlindungi** | Navigasi server-rendered **boleh** redirect ke login setelah validasi server yang sama. `proxy.ts` tetap UX optimistis, bukan batas otorisasi |
| **Perilaku pada konten sensitif** | PPKS/privat **tidak pernah** memakai jalur ini — selalu jalur ketat §10 |
| **Bila platform tidak dapat membuktikan sesi "sekadar expired"** | Gunakan perilaku **revoked** yang lebih ketat (§A3). Default-nya aman, bukan nyaman |
| **Error recovery** | Safe redirect (§12) memulihkan tujuan setelah login berhasil. **Tidak ada janji pemulihan isi form** (§13) |
| **Larangan** | Tidak menampilkan nama/email pengguna, waktu kedaluwarsa presisi, ID sesi, token, atau bagian cookie. Banner tidak boleh dipicu oleh parameter query yang dapat dikendalikan penyerang tanpa validasi — bila bisa, ia menjadi permukaan phishing ("Sesi Anda berakhir, masukkan ulang password") |
| **Acceptance (M2)** | (a) Sesi kedaluwarsa → rute admin mengarahkan ke login dengan banner ini. (b) Banner mendahului form dalam urutan DOM dan menerima fokus. (c) Tidak ada PII/token di DOM, URL, atau payload. (d) Diumumkan polite tepat sekali. (e) Server Action mengembalikan hasil session-invalid bertipe, bukan error mentah. (f) Setelah login, pengguna kembali ke tujuan asal (§12) |

---

## 10. State: Sesi dicabut (revoked)

Dipicu oleh: user dinonaktifkan, role berubah, izin hilang, atau password berubah (`docs/06`, §A4). **Keamanan menang** (§A3).

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | "Sesi Anda diakhiri karena ada perubahan pada akun Anda. Silakan masuk kembali." Menjelaskan *bahwa* akun berubah, **tidak** *apa* yang berubah |
| **Copy intent EN** | "Your session ended because your account changed. Please sign in again." |
| **Copy intent AR** *(intent)* | «تم إنهاء جلستك بسبب تغيير في حسابك. يرجى تسجيل الدخول مرة أخرى.» |
| **Kelas enumerasi** | Tidak berlaku pada layar ini, **tetapi** pesan tidak boleh membedakan *nonaktif* vs *role berubah* vs *password berubah*. Satu pesan, banyak sebab. §A3 mengizinkan satu pesan generik "sesi berakhir" dan tidak mewajibkan pengungkapan alasan pencabutan |
| **RTL** | Sama seperti §9 |
| **Keyboard** | Sama seperti §9: fokus ke banner, Tab berikutnya ke email |
| **Screen reader** | Region polite, sekali |
| **Perilaku terhadap pekerjaan belum tersimpan — MENGIKAT** | **Data terlindungi dikunci seketika. UI TIDAK menawarkan "salin pekerjaan saya", tidak menahan draf di memori, dan tidak menyediakan escape hatch apa pun** (§A3). Ini berlaku untuk pencabutan, user nonaktif, perubahan role, dan kehilangan izin. Alasannya: pada saat pencabutan, kita tidak lagi tahu apakah orang di depan layar masih berhak melihat isi form itu — menawarkan "salin pekerjaan" akan mengekspor data terlindungi ke clipboard pengguna yang baru saja kehilangan hak aksesnya. Kenyamanan mengalah |
| **PPKS / konten privat** | Jalur ketat selalu: kunci keras, tidak ada draf client, tidak ada escape hatch, tidak ada persistensi `localStorage`/`sessionStorage` (§A3) |
| **Loading** | Pencabutan dapat terjadi **saat pengguna sedang bekerja**. Request berikutnya yang ditolak **tidak boleh** menampilkan error teknis (401/403 mentah, pesan Auth.js); UI mengunci dan mengarahkan ke login dengan banner ini |
| **Error recovery** | Bila pencabutan disebabkan pengguna mengganti passwordnya sendiri di tab lain (§A4), pesan ini tetap benar dan tidak membingungkan. Setelah login ulang, safe redirect (§12) berlaku. Bila akun ternyata nonaktif, login ulang menghasilkan `INVALID_CREDENTIALS` generik (§5/§7) — konsisten dan tidak membocorkan apa pun |
| **Larangan** | Tidak menyebut alasan spesifik pencabutan, role lama/baru, siapa yang mencabut, kapan, atau dari IP mana. Tidak menampilkan status HTTP mentah atau pesan Auth.js |
| **Acceptance (M2)** | (a) Menonaktifkan user, mengubah role-nya, dan mengubah password-nya masing-masing memutus sesi aktif dan mendarat di login dengan **pesan yang sama persis**. (b) Tidak ada error teknis/HTTP status yang terlihat pengguna. (c) **Tidak ada tombol/menu "salin pekerjaan" yang muncul pada jalur revoked**, dan tidak ada draf tersisa di memori yang dapat dibaca setelah kunci. (d) Tidak ada draf di `localStorage`/`sessionStorage` untuk permukaan mana pun. (e) Pada PPKS, tidak ada draf client sama sekali. (f) Login ulang akun nonaktif menghasilkan §5 generik |

---

## 11. State: Logout

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Kontrol: "Keluar" · Konfirmasi (hanya bila ada pekerjaan belum tersimpan pada form non-sensitif, §13): "Keluar tanpa menyimpan?" · Banner setelahnya: "Anda telah keluar." |
| **Copy intent EN** | "Sign out" · "Sign out without saving?" · "You have been signed out." |
| **Copy intent AR** *(intent)* | «تسجيل الخروج» · «تسجيل الخروج دون حفظ؟» · «تم تسجيل خروجك.» |
| **Kelas enumerasi** | Tidak berlaku |
| **RTL** | Kontrol keluar di menu pengguna pada topbar sisi `end` (`docs/03`); di RTL berpindah otomatis lewat properti logical. Dialog: footer rata `end`, urutan `[Batal (sekunder)] [Keluar (destruktif)]` (`docs/17-F`) |
| **Keyboard** | Logout adalah **submit form/Server Action**, bukan `<a href>` — link GET dapat dipicu prefetch atau `<img>` pihak ketiga (CSRF logout; `docs/20-D` mensyaratkan uji CSRF pada logout). Dialog konfirmasi: fokus terperangkap, `Esc` menutup, fokus kembali ke pemicu (`docs/17-F`) |
| **Screen reader** | Setelah redirect ke login, banner "Anda telah keluar" diumumkan polite sekali |
| **Loading** | Tombol keluar → spinner + `aria-disabled` selama proses. Tidak ada overlay layar penuh |
| **Error recovery** | Bila logout gagal (jaringan), tampilkan toast error yang **tidak auto-hilang** (`docs/17-E`) dan biarkan pengguna mencoba lagi. **Jangan** berpura-pura logout berhasil di client sementara sesi server masih hidup — itu rasa aman palsu, terutama di komputer bersama |
| **Larangan** | Tidak menampilkan token/ID sesi. Tidak melog email pada event logout. Setelah logout, tombol Back **tidak boleh** memperlihatkan konten admin dari cache — halaman admin tidak cacheable. Tidak ada draf yang tertinggal di `localStorage`/`sessionStorage` |
| **Acceptance (M2)** | (a) Logout memakai POST/Server Action; GET ke endpoint logout tidak mengakhiri sesi. (b) Uji CSRF logout lulus. (c) Setelah logout, Back tidak memperlihatkan data admin. (d) Session record terhapus di database, bukan hanya cookie client. (e) Banner diumumkan polite sekali. (f) Dialog konfirmasi memerangkap fokus dan mengembalikan fokus ke pemicu |

---

## 12. Safe redirect recovery

Validasi tujuan dibekukan oleh **`SafeInternalPathSchema`** (`src/contracts/auth.ts`) dan dibawa pada `LoginResultSchema.redirectTo`. UI **tidak** menulis ulang aturan itu.

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID / EN / AR** | Umumnya **tanpa copy** — pemulihan yang baik tidak terasa. Copy hanya muncul bila tujuan ditolak: "Anda diarahkan ke Dasbor." / "You were taken to the Dashboard." / «تمت إعادتك إلى لوحة التحكم.» *(intent)* |
| **Kelas enumerasi** | Tujuan tersimpan **tidak boleh** mengungkap keberadaan resource kepada pengguna yang belum login. **Tujuan tersimpan tidak pernah dirender sebagai teks di layar login** — menampilkan "Anda akan diarahkan ke: Edit berita «X»" setelah login gagal berulang membocorkan konten |
| **Aturan validasi (milik kontrak, bukan UI)** | `SafeInternalPathSchema` menerima hanya path yang diawali satu `/`, **tidak** diawali `//`, tidak mengandung `\`, dan bebas karakter kontrol. Dengan itu, `//evil.example`, `/\evil.example`, `https://evil.example`, dan `javascript:alert(1)` semuanya ditolak (tiga terakhir tidak diawali `/`). Tujuan yang ditolak → `/[locale]/admin` |
| **Otorisasi tujuan** | Path yang lolos schema tetap harus lolos otorisasi server pada halaman tujuan (`docs/06`: proxy bukan otorisasi). Path yang valid tetapi tidak diizinkan role pengguna mendarat di dasbor |
| **RTL** | Locale tujuan mengikuti locale aktif pengguna saat login, bukan locale yang tertanam di path tersimpan — pengguna yang login dalam `ar` mendarat di `/ar/...` meski tujuannya tersimpan sebagai `/id/...` |
| **Keyboard** | Setelah redirect, fokus ditempatkan ke `<h1>` halaman tujuan (`tabindex="-1"`), bukan ke `<body>`, sehingga pengguna keyboard tahu ia sudah pindah halaman |
| **Screen reader** | Judul halaman tujuan diumumkan. Bila tujuan ditolak dan pengguna mendarat di dasbor, region polite menjelaskan singkat — jangan diam-diam mengarahkan ke tempat lain tanpa penjelasan |
| **Loading** | Antara submit sukses dan halaman tujuan siap: pertahankan `AUTH_SUBMITTING`. **Jangan** menampilkan layar login kosong sesaat — itu terlihat seperti login gagal |
| **Interaksi dengan §8** | Bila `requiresPasswordChange: true`, layar ganti password **mendahului** `redirectTo`. Tujuan tersimpan bertahan melewati penggantian password dan dipulihkan sesudahnya |
| **Larangan** | Tujuan tersimpan tidak boleh berisi query berisi PII/token, tidak disimpan di `localStorage` yang bertahan setelah logout, dan tidak ditampilkan di layar login |
| **Acceptance (M2)** | (a) `?next=//evil.example`, `?next=https://evil.example`, `?next=/\evil.example`, `?next=javascript:alert(1)`, dan payload berkarakter kontrol semuanya mendarat di `/[locale]/admin`, tidak pernah keluar origin. (b) `?next=/id/admin/berita` memulihkan tujuan setelah login. (c) Tujuan tersimpan tidak pernah muncul sebagai teks di DOM layar login. (d) Login dalam `ar` mendarat pada rute `ar`. (e) Fokus mendarat di `<h1>` tujuan. (f) Tujuan yang ditolak karena role mendarat di dasbor tanpa menyebut nama halaman. (g) `requiresPasswordChange` mendahului redirect |

---

## 13. Unsaved-work messaging

Bagian ini **direvisi total** agar tunduk pada §A3. Versi sebelumnya mensyaratkan escape hatch "salin pekerjaan saya" pada sesi mati tanpa syarat; itu **dicabut**.

### Aturan induk (§A3)

| Situasi | Perilaku UI |
|---|---|
| Navigasi biasa dengan form kotor (sesi masih sah) | Dialog konfirmasi "tinggalkan tanpa menyimpan?" |
| **Sesi expired** pada form CMS **non-sensitif** | **Boleh** menahan state **di memori saja** di balik kunci re-autentikasi. **Tidak boleh dijanjikan** kepada pengguna sampai perilaku itu punya test yang mengeksekusinya |
| **Sesi revoked / user nonaktif / role berubah / izin hilang** | **Kunci keras. Tidak ada penahanan draf. Tidak ada "salin pekerjaan saya".** Data terlindungi dikunci seketika |
| **PPKS / konten privat**, situasi apa pun | **Jalur ketat selalu**: kunci keras, tanpa draf client, tanpa escape hatch, tanpa `localStorage`/`sessionStorage` |
| Platform tidak dapat membuktikan sesi "sekadar expired" | Perlakukan sebagai **revoked** |

**Tidak ada janji pemulihan otomatis di mana pun dalam dokumen ini.** UI tidak boleh menampilkan copy seperti "Pekerjaan Anda akan dipulihkan" atau "Draf tersimpan otomatis" sampai perilaku itu ada dan lulus test. Menjanjikan pemulihan yang tidak ada jauh lebih merusak daripada tidak menjanjikan apa-apa: pengguna akan menutup tab dengan tenang, lalu kehilangan pekerjaannya.

### Spesifikasi state

| Aspek | Spesifikasi |
|---|---|
| **Copy intent ID** | Dialog navigasi: "Perubahan Anda belum tersimpan. Tinggalkan halaman ini?" · Tombol: "[Tetap di halaman] [Tinggalkan]" · Indikator: "Belum tersimpan" · Kunci re-autentikasi (form non-sensitif, expired): "Sesi Anda berakhir. Masuk kembali untuk melanjutkan." — **tanpa** menjanjikan bahwa isi form akan kembali |
| **Copy intent EN** | "You have unsaved changes. Leave this page?" · "[Stay on page] [Leave]" · "Unsaved" · "Your session has ended. Sign in again to continue." |
| **Copy intent AR** *(intent)* | «لديك تغييرات غير محفوظة. هل تريد مغادرة هذه الصفحة؟» · «[البقاء في الصفحة] [المغادرة]» · «غير محفوظ» · «انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة.» |
| **Kelas enumerasi** | Tidak berlaku |
| **RTL** | Indikator "Belum tersimpan" di dekat tombol simpan pada sticky bar (`docs/17-G`), sisi `start`. Dialog: footer rata `end`, urutan `[Tetap (sekunder)] [Tinggalkan (destruktif)]` |
| **Keyboard** | Dialog memerangkap fokus; **`Esc` = "Tetap di halaman"** (opsi aman — Esc tidak boleh membuang pekerjaan). Fokus awal di tombol **"Tetap di halaman"**, bukan "Tinggalkan": Enter refleks tidak boleh menghapus pekerjaan |
| **Screen reader** | Indikator "Belum tersimpan" diumumkan polite saat form **pertama kali** menjadi kotor, lalu tidak diulang per ketukan tombol. Dialog dan kunci re-autentikasi punya judul aksesibel (`docs/17-F`) |
| **Loading** | — |
| **Error recovery** | Setelah login ulang (§12), pengguna kembali ke halaman yang sama. Apakah isi form ikut kembali bergantung pada apakah perilaku memori §A3 sudah diimplementasikan **dan diuji**; sampai saat itu, UI tidak menjanjikannya |
| **Larangan** | Draf tidak dikirim ke analytics/log. Draf tidak disimpan di `localStorage`/`sessionStorage` untuk permukaan mana pun. **Untuk PPKS, penyimpanan draf sisi-client dilarang sepenuhnya.** Pada jalur revoked, tidak ada mekanisme apa pun yang memungkinkan pengguna menyalin isi form keluar |
| **Acceptance (M2)** | (a) Navigasi keluar dari form kotor memunculkan dialog; `Esc` dan fokus awal keduanya memilih opsi aman. (b) Pada **revoked**, tidak ada tombol/menu/shortcut "salin pekerjaan", dan isi form terlindungi tidak dapat dibaca setelah kunci. (c) Pada **PPKS**, tidak ada draf client sama sekali dalam situasi apa pun. (d) Tidak ada draf di `localStorage`/`sessionStorage` setelah logout maupun selama sesi. (e) Indikator "Belum tersimpan" diumumkan sekali, bukan per ketukan. (f) **Tidak ada copy di seluruh permukaan yang menjanjikan pemulihan otomatis draf.** (g) Sesi invalid yang tidak dapat dibuktikan sekadar expired diperlakukan sebagai revoked |

---

## 14. Kontrak platform yang sudah terselesaikan

Tiga pertanyaan yang diajukan versi sebelumnya **sudah dijawab mengikat** oleh GPT di `coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md`. Bukan lagi pertanyaan terbuka; dicatat di sini sebagai kontrak yang menjadi dasar §2, §6, §9, §10, dan §13.

**1. Rate limit tidak menjadi oracle enumerasi — TERSELESAIKAN (§A1).**
Penghitung rate limit **dinaikkan sama** untuk email tidak dikenal, user nonaktif, dan password salah. Kunci majemuk diturunkan dari HMAC(email ternormalisasi) + HMAC(IP), dan penurunannya **tidak boleh menanyakan apakah user ada**. Perilaku percobaan ke-5/ke-6, status, bentuk respons, header, dan copy publik identik untuk akun yang ada dan tidak ada. Tidak ada remaining-attempt count yang diekspos. → §6 dapat tetap membedakan `TRY_AGAIN_LATER` dari `INVALID_CREDENTIALS` dengan aman.

**2. Sesi tidak valid mengembalikan hasil bertipe yang dapat ditangani UI — TERSELESAIKAN (§A3).**
Server Action dan API mengembalikan hasil session-invalid yang **bertipe dan tersanitasi**, tidak pernah error mentah Auth.js/database. Navigasi terlindungi yang di-render server boleh redirect setelah validasi server yang sama. `proxy.ts` tetap UX optimistis, bukan batas otorisasi. **Namun** kebebasan menahan draf dibatasi tajam: hanya form CMS non-sensitif dengan sesi **expired** yang boleh menahan state **di memori** di balik kunci re-autentikasi, dan itu pun tanpa janji sampai ada test. Untuk revoked/nonaktif/role berubah/izin hilang, dan untuk PPKS selalu: kunci keras, tanpa escape hatch. → §13 ditulis ulang mengikuti ini; escape hatch "salin pekerjaan" dicabut.

**3. Waktu respons diseimbangkan di server — TERSELESAIKAN (§A2).**
Implementasi Credentials selalu menjalankan satu operasi setara `bcrypt.compare` cost 12 setelah lookup: terhadap hash user bila ditemukan, terhadap **konstanta dummy hash cost 12** (dibuat sekali di modul server, bukan per request) bila tidak; user nonaktif tetap menjalankan perbandingan sungguhan lalu mengembalikan kegagalan publik yang sama. Test membandingkan **distribusi** dengan toleransi terdokumentasi, bukan kesetaraan nanodetik. → §4 dan §5 tidak perlu delay buatan di UI, dan acceptance §5(e) ditulis sebagai perbandingan distribusi.

### Yang masih terbuka

**Tinjauan penutur asli bahasa Arab.** Seluruh copy AR di dokumen ini berlabel *intent* dan belum divalidasi penutur asli. Ini **wajib diselesaikan sebelum string masuk `messages/ar.json`**, tetapi bukan blocker bagi implementasi struktur UI, dan tetap pekerjaan M2.

**Catatan kebijakan.** Larangan tautan "Lupa kata sandi" (§3) berasal dari `docs/06` ("tidak ada reset password publik pada v1"). Bila kebijakan itu berubah, §3 dan §5 wajib ditinjau ulang bersamaan — alur reset password adalah permukaan enumerasi klasik.

**Catatan ketersediaan kontrak.** `src/contracts/auth.ts` belum ada pada `coordination/m2-revision-assignment`; ia hidup di `ai/gpt/m2-auth-contract`. Dokumen ini dibaca dari branch itu (read-only). Referensi §8 dan §12 mengasumsikan schema tersebut akan masuk `integration/m2-security` tanpa perubahan nama field. Bila `PasswordChangeInputSchema` atau `SafeInternalPathSchema` berubah sebelum merge, §8 dan §12 harus diperiksa ulang.

---

## 15. Handoff

Metadata handoff durable ada di `coordination/handoffs/M2-CLAUDE-AUTH-UX-SPEC-claude.md`.
