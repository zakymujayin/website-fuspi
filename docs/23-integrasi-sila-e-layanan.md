# 23 — Batas Sistem & Roadmap Integrasi SILA (e-Layanan)

SILA di `/home/zhev/myproject/e-layanan` adalah aplikasi terpisah dan menjadi **sumber kebenaran layanan akademik**. Website FUSPI tidak membangun ulang pengajuan, workflow, dokumen, nilai, SLA, notifikasi, atau data mahasiswa.

URL publik SILA ditetapkan saat fase integrasi melalui `NEXT_PUBLIC_SILA_URL`; jangan menebak atau meng-hardcode domain dari website referensi.

## A. Pembagian tanggung jawab

| Kapabilitas | Website FUSPI | SILA |
|---|---|---|
| Informasi/penjelasan layanan | ringkasan publik dan CTA | detail operasional/form |
| Pengajuan akademik | tidak menyimpan | sumber kebenaran |
| Login mahasiswa/pegawai | tidak menyediakan | sumber kebenaran |
| Workflow, approval, SLA | tidak menyediakan | sumber kebenaran |
| Dokumen output & QR | tidak menyediakan | sumber kebenaran |
| Berita/prodi/dosen/FAQ | sumber kebenaran | bukan scope |
| Status gangguan SILA | tampil manual v1 | sumber operasional |

Website hanya menyimpan `Service.externalUrl` dan metadata publik non-personal. Tidak ada foreign key lintas database.

## B. Fase 1 — deep link, wajib v1

- Menu Layanan dan QuickLink membuka SILA melalui URL HTTPS resmi.
- Gunakan deep link stabil bila SILA menyediakannya, misalnya halaman daftar layanan atau login dengan `returnTo` yang telah allowlist.
- Tautan eksternal diberi indikator dan analytics event `outbound_sila` tanpa NIM/email/token.
- Website menampilkan ringkasan 13 jenis layanan berdasarkan konten CMS, bukan query database SILA.
- Owner konten wajib mengecek tautan SILA setiap bulan melalui broken-link checker.
- Jangan embed form SILA dengan iframe; cookie, CSP, accessibility, dan session harus tetap berada pada domain SILA.

## C. Larangan integrasi

- Jangan mengakses database SILA langsung dari website.
- Jangan menyalin User, Mahasiswa, Pengajuan, DokumenOutput, nilai, attachment, atau audit log ke database website.
- Jangan berbagi `AUTH_SECRET`, session cookie, encryption key, Redis namespace, atau filesystem storage.
- Jangan menaruh token SILA dalam query analytics, log website, atau CMS.
- Jangan membuat reverse proxy yang membuat SILA tampak berada di path website.
- Jangan menampilkan jumlah/status pengajuan individual pada website publik.

## D. Fase 2 — katalog/status read-only

Dilakukan hanya setelah SILA menyediakan endpoint resmi yang versioned dan disetujui kedua pemilik sistem.

Endpoint minimum yang boleh dikonsumsi website:

- `GET /api/public/v1/services` — kode, nama publik, ringkasan, aktif, deepLink, lastUpdated.
- `GET /api/public/v1/status` — status agregat sistem tanpa data user/pengajuan.
- `GET /api/public/v1/metrics` — **opsional**, hanya agregat yang sudah dianonimkan dan minimum cohort diterapkan.

Kontrak:

- JSON schema/OpenAPI versioned, HTTPS, timeout 2 detik, cache 5–15 menit, ETag, dan rate limit.
- Website memakai circuit breaker: bila SILA gagal, tampilkan konten CMS terakhir + status “informasi mungkin belum terbaru”; homepage tidak boleh gagal render.
- Tidak ada PII. Field tambahan dari SILA diabaikan secara default sampai kontrak direview.
- Status SILA dapat membuat `ServiceIncident` otomatis, tetapi ADMIN tetap dapat override dan semua perubahan diaudit.

## E. Fase 3 — SSO, keputusan terpisah

SSO hanya dilakukan bila universitas/SILA menyediakan OIDC atau SAML resmi.

- Gunakan authorization code + PKCE untuk login interaktif; jangan menukar password antar aplikasi.
- Client ID/secret berbeda per environment dan callback URL allowlist ketat.
- Website tidak otomatis memberikan role ADMIN/EDITOR berdasarkan keberhasilan login; provisioning role tetap eksplisit atau berdasarkan claim/group yang disetujui.
- Logout lokal dan SSO, session revocation, MFA, offboarding, serta fallback emergency admin wajib didesain sebelum aktivasi.
- Sampai fase ini disetujui, Auth.js website dan Auth.js SILA sepenuhnya terpisah.

### Kontrak implementasi FUSPI

Website FUSPI menyediakan bridge OIDC yang **nonaktif secara default**. Route
`/api/auth/sila/start` dan `/api/auth/sila/callback` hanya hidup bila seluruh
env berikut valid:

- `SILA_SSO_ENABLED=true`
- `SILA_SSO_AUTHORIZATION_URL`
- `SILA_SSO_TOKEN_URL`
- `SILA_SSO_USERINFO_URL`
- `SILA_SSO_CLIENT_ID`
- `SILA_SSO_CLIENT_SECRET`
- `SILA_SSO_SCOPES` default `openid profile email`
- `SILA_SSO_EMAIL_CLAIM` default `email`
- `SILA_SSO_IDENTIFIER_CLAIM` default `sub`
- `SILA_SSO_TIMEOUT_MS` default `5000`

FUSPI memakai authorization code + PKCE, menyimpan `state` dalam cookie
HttpOnly yang ditandatangani `AUTH_SECRET`, menukar code di server, lalu
membaca userinfo lewat bearer token. Callback **tidak membuat akun dan tidak
menaikkan role**. Login berhasil hanya bila email claim SILA cocok dengan akun
FUSPI yang sudah aktif; role tetap dibaca dari database FUSPI. Sesi yang
diterbitkan tetap session database FUSPI dengan cookie opaque FUSPI sendiri.

SILA perlu menyediakan endpoint OIDC resmi yang kompatibel dengan flow di atas,
callback URL allowlist:

```text
{AUTH_URL}/api/auth/sila/callback
```

Kegagalan provider, state, akun belum diprovision, atau outage diarahkan kembali
ke halaman login dengan pesan generik. Tidak ada email, NIM/NIP/NIDN, access
token, id token, atau claim SILA yang dikirim ke UI, log, analytics, atau CMS.

### Reverse handoff FUSPI ke SILA

Untuk kebutuhan pegawai yang sudah login di website FUSPI lalu membuka SILA
tanpa memasukkan username/password lagi, arah integrasinya berbeda: FUSPI
menjadi issuer handoff dan SILA menjadi consumer.

FUSPI menyediakan:

```text
GET /api/auth/sila/launch?locale=id&next=/dashboard
```

Route ini:

- membaca session database FUSPI;
- bila user belum login FUSPI, membuka `NEXT_PUBLIC_SILA_URL` biasa;
- bila user aktif dan role termasuk allowlist, membuat token HS256 60 detik;
- redirect ke `SILA_HANDOFF_URL` dengan `token` dan `next=/dashboard`;
- tidak mengirim password, session cookie FUSPI, atau database token FUSPI.

Env FUSPI:

```env
SILA_HANDOFF_ENABLED=true
SILA_HANDOFF_URL=https://sila.example.ac.id/api/auth/fuspi/callback
SILA_HANDOFF_SHARED_SECRET=...
SILA_HANDOFF_ISSUER=fuspi-web
SILA_HANDOFF_AUDIENCE=sila
SILA_HANDOFF_TTL_SECONDS=60
SILA_HANDOFF_ALLOWED_ROLES=ADMIN,PETUGAS,STAF_UMUM,DEKAN,WADEK,KABAG,DOSEN
```

Payload token:

```json
{
  "iss": "fuspi-web",
  "aud": "sila",
  "sub": "fuspi-user-id",
  "email": "user@example.ac.id",
  "name": "Nama Pengguna",
  "role": "DOSEN",
  "iat": 1788155538,
  "exp": 1788155598,
  "jti": "opaque-random-id"
}
```

SILA wajib memverifikasi signature, `iss`, `aud`, `exp`, allowlist role,
akun aktif yang cocok dengan email, dan `jti` one-time-use sebelum menerbitkan
session SILA. Token handoff tidak boleh dicatat di log atau disimpan mentah.

## F. Ownership dan perubahan kontrak

- Owner SILA: tim layanan akademik/teknis SILA.
- Owner website: ADMIN/Humas FUSPI.
- Perubahan endpoint membutuhkan version bump bila breaking, changelog, tanggal sunset, contract test, dan notifikasi minimal 30 hari.
- Consumer-driven contract test dijalankan pada staging kedua aplikasi sebelum production.
- Tidak ada deployment terkoordinasi wajib untuk perubahan non-breaking.

## G. Acceptance criteria

### Fase 1

- Semua CTA SILA menuju HTTPS/domain benar, dapat dipakai keyboard, dan tidak kehilangan locale informasi asal.
- Tidak ada data SILA dalam database/log/analytics website selain URL publik dan event outbound agregat.
- SILA down tidak memengaruhi render website.

### Fase 2

- Contract test mendeteksi breaking response sebelum deploy.
- Timeout/failure memakai cache terakhir dan tidak memperlambat halaman lebih dari budget.
- Endpoint tidak mengandung PII pada fixture, schema, log, atau respons production.

### Fase 3

- SSO diuji untuk login, logout, revoked user, changed group, expired token, replay/state/nonce, dan emergency local admin.
- Role escalation tidak mungkin dilakukan hanya dengan mengubah claim client-side.

## H. Temuan inspeksi SILA

SILA saat ini sudah mempunyai workflow engine, role/scope, tracking, SLA, audit, notifikasi, storage, PDF/QR, serta API internal. Inventarisnya mencakup TA-01–TA-06 dan AK-01–AK-07. Karena itu integrasi awal cukup deep link; membuat modul akademik kedua di CMS akan menimbulkan duplikasi dan konflik sumber data.
