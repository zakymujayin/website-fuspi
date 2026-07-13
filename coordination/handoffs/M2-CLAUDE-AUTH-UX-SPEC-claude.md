# Handoff — M2-CLAUDE-AUTH-UX-SPEC — claude

- Branch: `ai/claude/m2-auth-ux-spec`
- Base SHA: `18a26dd`
- Head SHA: `01573f5` (dokumen spesifikasi) — lihat commit terakhir branch untuk handoff ini

## Result

Spesifikasi UX & aksesibilitas read-only untuk sebelas state autentikasi FUSPI: login normal, submitting, invalid credentials, pencegahan account enumeration, rate limit, akun inactive, mandatory first password change, session expired, session revoked, safe redirect recovery, logout, dan unsaved-work messaging. Setiap state menetapkan copy intent ID/EN/AR, perilaku RTL, destinasi fokus keyboard, pengumuman screen reader, perilaku loading/submission, error recovery, larangan informasi sensitif, dan acceptance criteria yang dapat diuji.

Tidak ada route, page, component, message file, konfigurasi Auth.js, proxy, skema, dependensi, atau perilaku keamanan yang diimplementasikan.

Dokumen: **`coordination/reviews/M2-AUTH-UX-SPEC-claude.md`**

## Files changed

- `coordination/reviews/M2-AUTH-UX-SPEC-claude.md` (baru) — spesifikasi
- `coordination/handoffs/M2-CLAUDE-AUTH-UX-SPEC-claude.md` (baru) — dokumen ini

Tidak ada perubahan pada `src/**`, `messages/**`, `prisma/**`, `e2e/**`, dependensi, atau root config.

> **Catatan lease.** `allowed_paths` pada manifest hanya memuat file review, dan instruksi task meminta metadata handoff dimuat di dalam dokumen review itu sendiri (§15). File handoff terpisah ini dibuat **atas permintaan eksplisit pemilik proyek** agar lane GPT menemukan pertanyaan kontrak di lokasi konvensional. Ia hanya berisi ringkasan dan penunjuk; sumber kebenaran tetap dokumen review. Tidak ada lease agent lain yang tersentuh.

## Contract/schema/migration impact

Tidak ada. Dokumen ini **mengonsumsi** kontrak `docs/06-autentikasi-role.md` (session database 8 jam, rate limit 5 gagal/15 menit per HMAC IP + HMAC email, `mustChangePassword`, pencabutan sesi saat user nonaktif/role/password berubah) dan tidak mengubahnya. Nilai-nilai tersebut dikutip sebagai konteks, bukan sebagai keputusan baru dari lane ini.

Tiga pertanyaan di bawah meminta **klarifikasi** kontrak auth M2, bukan perubahannya.

## Verification

| Command | Result |
|---|---|
| `git diff --check` | bersih (satu-satunya `acceptance_commands` pada manifest) |
| `git diff --name-only 18a26dd...HEAD` | hanya file review + handoff ini |

`npm run lint` / `typecheck` / `test` tidak dijalankan: tidak ada kode yang berubah, sehingga hasilnya identik dengan baseline dan tidak memberi sinyal apa pun tentang perubahan ini.

## Untested areas

Ini spesifikasi, bukan implementasi — belum ada perilaku yang dapat dieksekusi untuk diuji. Acceptance criteria di §3–§13 ditulis agar DeepSeek dapat menurunkannya menjadi test M3; kriteria itu belum divalidasi terhadap kode apa pun.

## Risks and follow-ups

1. **DeepSeek:** turunkan test M3 dari acceptance criteria §3–§13. Prioritas: perbandingan byte-for-byte kelas enumerasi (§5 acceptance (a)) dan corpus open redirect (§12 acceptance (a)).
2. **Peninjau berbahasa Arab:** copy AR dalam dokumen adalah *intent*, bukan terjemahan final — validasi sebelum masuk `messages/ar.json`.
3. **Kebijakan reset password:** larangan tautan "Lupa kata sandi" (§3) berasal dari `docs/06` ("tidak ada reset password publik pada v1"). Bila kebijakan itu berubah, §3 dan §5 wajib ditinjau ulang bersamaan — alur reset password adalah permukaan enumerasi klasik.

## Requested shared changes

**Untuk GPT — tiga pertanyaan kontrak. Sumber lengkap: `coordination/reviews/M2-AUTH-UX-SPEC-claude.md` §14.**

Ketiganya **tidak dapat diselesaikan lane UI** dan menentukan apakah spesifikasi ini dapat dipenuhi. Mohon dijawab di kontrak auth M2 sebelum implementasi M3 dimulai.

### 1. Apakah rate limit menaikkan penghitung dan memblokir untuk email yang TIDAK terdaftar? (risiko tertinggi)

Spesifikasi menyatukan email-tidak-dikenal, password-salah, dan akun-nonaktif menjadi satu respons `AUTH_REJECTED` yang identik hingga ke teks, atribut ARIA, destinasi fokus, field yang dikosongkan, dan bentuk respons. Namun pesan rate limit sengaja dibuat **berbeda** dari `AUTH_REJECTED`, karena pengguna sah perlu tahu bahwa ia harus menunggu — bukan mengira passwordnya salah lalu mencoba terus.

Kedua keputusan itu hanya kompatibel bila blokir terpicu **identik** untuk email terdaftar maupun tidak. Bila blokir hanya berlaku pada email yang ada di database, pesan blokir itu sendiri menjadi oracle: penyerang mengirim 6 percobaan, lalu melihat "terlalu banyak percobaan" (= email ada) versus "email atau kata sandi salah" (= email tidak ada). Enumerasi lolos lewat pintu belakang.

`docs/06` menyebut kunci HMAC IP + HMAC email, yang secara prinsip memenuhi syarat ini — HMAC atas email tidak perlu tahu apakah email itu ada. **Butuh konfirmasi eksplisit** bahwa itu memang perilakunya. Bila tidak, §6 harus dibatalkan dan pesan blokir diseragamkan dengan `AUTH_REJECTED` (merugikan pengguna sah, tetapi lebih aman).

### 2. Request admin dengan sesi yang sudah dicabut: redirect keras atau respons yang dapat dirender UI?

Spesifikasi mensyaratkan bahwa sesi yang mati saat form masih kotor **tidak boleh membuang draf secara diam-diam** — mis. editor yang telah mengetik artikel panjang lalu sesinya kedaluwarsa (8 jam) atau dicabut karena role berubah.

Agar UI dapat menampilkan dialog "sesi berakhir" **di atas** halaman kerja (isi form tetap di layar, pengguna dapat menyelamatkan teksnya), penolakan sesi harus datang sebagai hasil yang **dapat ditangani UI** — misalnya penolakan yang dapat dikenali pada Server Action. Bila `proxy.ts` selalu melakukan redirect navigasi keras yang mengganti dokumen, isi form hilang sebelum UI sempat bereaksi, dan §13 tidak dapat dipenuhi sama sekali.

**Pertanyaan:** bentuk respons mana yang dipakai untuk request admin yang sesinya sudah tidak valid?

### 3. Apakah jalur autentikasi melakukan kerja hashing setara saat user tidak ditemukan?

UI tidak menambahkan delay kondisional apa pun; semua kegagalan melewati state `AUTH_SUBMITTING` yang identik, tanpa tahap "memeriksa email…" lalu "memeriksa kata sandi…".

Namun bila server mengembalikan `AUTH_REJECTED` jauh lebih cepat untuk email-tidak-ada — karena `bcrypt.compare` hanya dijalankan bila `findUnique` menemukan user, persis seperti contoh kode di `docs/06` — maka kelas enumerasi bocor lewat **waktu respons**, dan tidak ada yang dapat dilakukan sisi UI untuk menutupnya.

**Butuh kepastian** bahwa jalur user-tidak-ada tetap melakukan pekerjaan hashing yang setara (dummy compare terhadap hash konstan, atau ekuivalennya).
