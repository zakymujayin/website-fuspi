# Handoff — M2-CLAUDE-AUTH-UX-SPEC-REVISION — claude

- Branch: `ai/claude/m2-auth-ux-spec-revision`
- Base: `coordination/m2-revision-assignment` (`c8550d8`)
- Manifest base_sha: `18a26dd`
- Head SHA: commit revisi pada branch ini (`docs(review): align M2 auth UX spec with GPT security decision`)
- Menggantikan handoff task pendahulu `M2-CLAUDE-AUTH-UX-SPEC` (branch `ai/claude/m2-auth-ux-spec` @ `9817ebc`)

## Result

Spesifikasi UX & aksesibilitas autentikasi direvisi agar tunduk penuh pada keputusan mengikat GPT di `coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md` §A1–A5, dan diselaraskan dengan schema beku `src/contracts/auth.ts`.

Perubahan substantif terhadap versi sebelumnya:

1. **Kosakata state diselaraskan ke kontrak.** `AUTH_REJECTED`/`AUTH_RATE_LIMITED` buatan sendiri diganti kode publik resmi dari `PublicLoginFailureCodeSchema`: `INVALID_CREDENTIALS`, `TRY_AGAIN_LATER`, `AUTH_UNAVAILABLE`. UI tidak lagi menciptakan kode kegagalan sendiri.
2. **Mandatory password change kini tiga field** (§8), sesuai `PasswordChangeInputSchema`: `currentPassword`, `newPassword`, `confirmPassword`. Ditambahkan copy intent ID/EN/AR untuk "Kata sandi saat ini", urutan Tab, autofocus ke field itu, asosiasi `aria-describedby` tersendiri (mencegah pengguna mengira diminta mengetik password baru dua kali), pemetaan error per `path` schema, aturan pengosongan field, dan konsekuensi §A4 (perubahan sukses mencabut seluruh sesi lama secara transaksional).
3. **Unsaved-work ditulis ulang total** (§13). Escape hatch "salin pekerjaan saya" pada sesi mati **dicabut**. Aturan §A3 sekarang berlaku: expired + form CMS non-sensitif boleh menahan state **di memori saja** di balik kunci re-autentikasi dan **tanpa janji** sampai ada test yang mengeksekusinya; revoked/nonaktif/role berubah/izin hilang → kunci keras tanpa escape hatch; PPKS → jalur ketat selalu, tanpa draf client; sesi yang tak terbukti sekadar expired diperlakukan sebagai revoked. Tidak ada satu pun copy yang menjanjikan pemulihan otomatis draf.
4. **Tiga pertanyaan kontrak dicatat sebagai TERSELESAIKAN** (§14), bukan pertanyaan terbuka: rate-limit non-oracle (§A1), hasil session-invalid bertipe (§A3), penyeimbangan waktu bcrypt cost 12 dengan konstanta dummy hash (§A2). Acceptance timing ditulis sebagai perbandingan **distribusi dengan toleransi**, bukan kesetaraan nanodetik.
5. **Safe redirect menyerahkan validasi ke `SafeInternalPathSchema`** (§12) alih-alih menulis ulang aturannya; ditambahkan interaksi dengan `requiresPasswordChange` (ganti password mendahului `redirectTo`).
6. **Semua follow-up auth berlabel M2**, tidak ada rujukan M3 (§A5). Setiap blok acceptance kini bertajuk "Acceptance (M2)".

## Files changed

- `coordination/reviews/M2-AUTH-UX-SPEC-claude.md` — direvisi
- `coordination/handoffs/M2-CLAUDE-AUTH-UX-SPEC-claude.md` — dokumen ini

Tidak ada perubahan pada `src/**`, `messages/**`, `prisma/**`, `e2e/**`, dependensi, atau root config. Keduanya berada di dalam `allowed_paths` manifest revisi.

## Contract/schema/migration impact

Tidak ada. Dokumen **mengonsumsi** kontrak beku `src/contracts/auth.ts` dan keputusan §A1–A5; tidak mengubah keduanya dan tidak meminta perubahan baru.

## Verification

| Command | Result |
|---|---|
| `git diff --check` | pass — tidak ada whitespace error |
| `TASK_MANIFEST=coordination/tasks/M2-CLAUDE-AUTH-UX-SPEC-REVISION.md TASK_BASE=coordination/m2-revision-assignment npm run check:scope` | pass — `scope-check: 2 changed file(s) are within lease` |

`npm run lint` / `typecheck` / `test` tidak dijalankan dan tidak ada dalam `acceptance_commands` manifest: tidak ada kode yang berubah, sehingga hasilnya identik dengan baseline dan tidak memberi sinyal apa pun tentang perubahan ini.

## Untested areas

Ini spesifikasi, bukan implementasi — belum ada perilaku yang dapat dieksekusi untuk diuji. Acceptance criteria §3–§13 ditulis agar DeepSeek dapat menurunkannya menjadi test M2 yang dapat dieksekusi; kriteria itu belum divalidasi terhadap kode apa pun.

Secara khusus, klaim §9/§13 tentang penahanan state di memori di balik kunci re-autentikasi **belum boleh dijanjikan ke pengguna** sampai ada test yang mengeksekusinya (§A3). Dokumen sudah ditulis agar tidak menjanjikannya.

## Risks and follow-ups (semuanya M2)

1. **Ketersediaan kontrak.** `src/contracts/auth.ts` belum ada di `coordination/m2-revision-assignment`; ia hidup di `ai/gpt/m2-auth-contract` dan saya baca read-only dari sana. §8 dan §12 mengasumsikan schema itu masuk `integration/m2-security` **tanpa perubahan nama field**. Bila `PasswordChangeInputSchema` atau `SafeInternalPathSchema` berubah sebelum merge, kedua bagian itu harus diperiksa ulang. — *GPT*
2. **Tinjauan penutur asli bahasa Arab.** Seluruh copy AR berlabel *intent*, belum divalidasi. Wajib selesai **sebelum** string masuk `messages/ar.json`; bukan blocker bagi implementasi struktur UI. — *M2*
3. **Test turunan.** Prioritas: perbandingan byte-for-byte kelas enumerasi (§5 acceptance (a), mencakup akun nonaktif dengan password benar), kesetaraan blokir rate limit untuk akun ada/tidak ada/nonaktif (§6 acceptance (b)), ketiadaan escape hatch pada jalur revoked (§13 acceptance (b)/(c)), dan corpus open redirect (§12 acceptance (a)). — *DeepSeek*
4. **Kebijakan reset password.** Larangan tautan "Lupa kata sandi" (§3) bergantung pada `docs/06` ("tidak ada reset password publik pada v1"). Bila kebijakan berubah, §3 dan §5 wajib ditinjau ulang bersamaan — alur reset password adalah permukaan enumerasi klasik. — *GPT*

## Requested shared changes

Tidak ada. Ketiga pertanyaan kontrak yang diajukan handoff sebelumnya sudah dijawab mengikat oleh GPT dan kini tercatat sebagai kontrak terselesaikan di §14 dokumen review.

**Tidak ada permintaan untuk memulai M3.** M3 (slice vertikal Post + Media + i18n) tetap belum aktif; seluruh pekerjaan auth di atas adalah M2 (§A5).
