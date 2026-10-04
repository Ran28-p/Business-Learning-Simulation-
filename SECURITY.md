# Keamanan — Business Learning Simulation

Dokumen ini menjelaskan model ancaman proyek, apa yang sudah ditegakkan di repo,
dan apa yang **harus dicek manual di Firebase Console** (karena tidak bisa
dikunci lewat kode). Proyek ini static site (GitHub Pages) tanpa server sendiri,
jadi permukaan serangannya kecil — tetapi ada satu tempat yang butuh perhatian
serius: **Firebase Realtime Database**.

## Ringkasan model ancaman

| Aset | Di mana | Risiko utama | Pengendali |
|---|---|---|---|
| Progres belajar (XP, level, riwayat) | `localStorage` per modul; `apps/spt` juga sinkron ke Firebase `users/{uid}` | Data orang lain terbaca/tertimpa; database dipenuhi data sampah sampai kuota habis | Firebase Security Rules (`database.rules.json`) |
| Email & nama tampilan peserta | Firebase Auth + `users/{uid}` | Kebocoran data pribadi | Rules: hanya pemilik uid yang bisa membaca |
| Kode aplikasi | GitHub Pages | Library pihak ketiga disusupi; XSS dari input pengguna | Library divendor lokal; input Power Query/SQL tidak dieksekusi sebagai JS (lihat di bawah) |
| Kuota/biaya Firebase | Proyek Firebase | Tagihan tak terduga | Tetap di paket **Spark** (tidak bisa menagih) |

## Firebase config di client BUKAN rahasia

`js/shared/firebase-config.js` berisi `apiKey`, `projectId`, `databaseURL`, dst.
Ini memang dirancang publik — setiap aplikasi web Firebase menaruhnya di kode
client. **Yang melindungi data adalah Security Rules, bukan menyembunyikan key.**
Sebaliknya, jangan pernah menaruh *service account JSON*, *private key*, atau
secret server apa pun di repo ini.

## Security Rules (`database.rules.json`)

File ini adalah sumber kebenaran rules untuk Realtime Database. Yang ditegakkan:

1. **Default tolak semua** — `.read` dan `.write` di root bernilai `false`.
2. **`users/{uid}` hanya untuk pemiliknya** — baca dan tulis mensyaratkan
   `auth != null && auth.uid === $uid`. Pengguna lain, bahkan yang sudah login,
   tidak bisa membaca atau menulis data orang lain.
3. **Skema divalidasi** — hanya field yang memang ditulis `apps/spt`
   (`xp`, `level`, `updatedAt`, `email`, `displayName`, `history`) yang diterima;
   field lain ditolak (`$other: false`). Tipe dan batas nilai ditentukan (mis.
   `xp` 0–10.000.000, `email` ≤ 254 karakter, `history` maksimal 10.000 entri
   ber-indeks) agar satu akun tidak bisa memenuhi kuota 1 GB paket Spark.

`firebase.json` menunjuk ke file ini supaya bisa di-deploy dengan Firebase CLI.

### ⚠️ Rules di repo ≠ rules yang aktif

Meng-commit `database.rules.json` **tidak** mengubah apa pun di proyek Firebase.
Rules baru berlaku setelah di-deploy. Pilih salah satu (keduanya gratis di Spark):

- **Lewat Console** (paling sederhana): Firebase Console → *Realtime Database* →
  tab *Rules* → tempel isi `database.rules.json` → *Publish*.
- **Lewat Firebase CLI**: `npm i -g firebase-tools`, `firebase login`, lalu dari
  root repo `firebase deploy --only database --project <id-proyek>`.

Setelah deploy, uji di **Rules Playground** (tab *Rules* → *Rules Playground*):
 simulasikan *read* ke `/users/uid-orang-lain` dengan auth uid berbeda → harus
**ditolak**; *write* ke `/users/uid-sendiri` dengan data normal → harus **diizinkan**.

### Pemeriksaan otomatis di CI

`node scripts/check-firebase-rules.mjs` (job `lint` di CI) memeriksa:

- tidak ada `.read`/`.write` publik di mana pun, dan data pengguna terkunci ke uid;
- **setiap field yang ditulis `apps/spt/js/app-main.js` punya aturan** — jadi kalau
  kamu menambah field baru ke `appState.user`, CI gagal sampai
  `database.rules.json` diperbarui (kalau tidak, sinkron cloud akan ditolak diam-diam
  di produksi, dan progres hanya tersimpan lokal);
- rules dijalankan terhadap payload nyata: pemilik diterima; orang lain, tanpa
  login, field asing, nilai di luar batas, dan indeks riwayat di luar batas ditolak.

Pemeriksa ini **simulasi pendekatan** (mengevaluasi ekspresi rules sebagai
JavaScript), bukan Firebase Emulator. Ia menangkap kesalahan logika dan regresi,
tetapi uji akhir sebelum deploy tetap lewat Rules Playground di atas.

### Menambah field atau modul yang memakai Firebase

1. Tambahkan aturan field di `database.rules.json` (tipe + batas).
2. Jalankan `node scripts/check-firebase-rules.mjs` sampai hijau.
3. Deploy rules **sebelum** (atau bersamaan dengan) merilis kode aplikasinya.

## Checklist manual di Firebase Console

Hal-hal ini tidak terlihat dari repo — periksa dan centang sendiri:

- [ ] **Rules sudah di-deploy** dan sama dengan `database.rules.json` (bukan mode uji
      `".read": true` atau `".write": true` yang kedaluwarsa).
- [ ] **Authentication → Settings → Authorized domains**: hanya domain resmi
      (domain GitHub Pages / domain sendiri dan `localhost` bila perlu).
- [ ] **Authentication → Sign-in method**: hanya provider yang dipakai aplikasi —
      *Email link (passwordless)* dan *Anonymous* (dipakai `apps/spt`); matikan yang lain.
- [ ] **Paket Spark, jangan upgrade ke Blaze.** Spark tidak bisa menagih: kuota habis
      berarti baca/tulis diblokir, bukan ditagih. Ini yang menjaga poin 13
      FREE-FIRST POLICY.
- [ ] **Pembatasan API key** (Google Cloud Console → APIs & Services → Credentials):
      batasi *HTTP referrers* ke domain resmi dan batasi API ke yang dipakai Firebase.
      Gratis dan mengurangi penyalahgunaan key yang memang publik.
- [ ] *(Opsional)* **Firebase App Check** untuk mempersulit klien palsu.
- [ ] Pantau **Usage** di Realtime Database sesekali (penyimpanan & unduhan).

## Batasan yang perlu diketahui (jujur)

- **XP, level, dan riwayat dihitung di browser.** Rules memastikan datanya berbentuk
  wajar dan hanya milik pemiliknya, tetapi tidak bisa membuktikan skor itu diperoleh
  dengan jujur — siapa pun bisa mengubah state di DevTools lalu menyinkronkannya.
  Jangan pakai angka ini untuk sertifikat resmi, penilaian formal, atau papan
  peringkat yang punya konsekuensi.
- **Akun anonim mudah dibuat.** Batas ukuran per akun dan paket Spark membatasi
  dampak penyalahgunaan, tetapi tidak menghilangkannya. Firebase Auth punya
  perlindungan abuse bawaan; tidak ada rate limiting tambahan dari proyek ini.
- **Email peserta tersimpan di `users/{uid}`** (selain di Firebase Auth). Hanya
  pemilik uid yang bisa membacanya lewat rules; admin proyek Firebase tetap bisa
  melihatnya di Console.
- **GitHub Pages tidak bisa mengatur header server** (CSP penuh, HSTS kustom, dll.).
  Perlindungan dibatasi pada meta tag dan praktik kode di bawah.
- Tidak ada sistem yang dapat dijamin "tidak bisa dibobol". Dokumen ini mengurangi
  risiko yang realistis untuk aplikasi pelatihan, bukan menjanjikan keamanan mutlak.

## Praktik kode yang sudah diterapkan

- **Power Query** tidak memakai `eval`/`new Function`: rumus kolom kustom
  di-tokenisasi dan di-parse oleh parser ekspresi terbatas (hanya angka, kolom
  `[Nama]`, `+ - * /`, kurung), sehingga tidak ada jalan ke JavaScript sembarang.
  Test-nya ada di `apps/sql-pq/tests/test-powerquery-engine.mjs`.
- **Penilaian SQL** membatasi query pengguna menjadi *tepat satu* query baca
  (`SELECT` / `WITH … SELECT`); `INSERT`/`UPDATE`/`DELETE`/`DROP`, multi-statement,
  dan `PRAGMA` ditolak agar dataset latihan tidak bisa diubah. Test-nya ada di
  `apps/sql-pq/tests/test-grading-engine.mjs`.
- **Library divendor lokal** (`vendor/`, `apps/*/vendor/`) supaya kode pihak ketiga
  tidak berubah diam-diam di sisi CDN. Sisa pengecualian dicatat di `ARCHITECTURE.md`.
- **Service worker** hanya meng-cache request GET same-origin dan tidak menyentuh
  host Firebase maupun font.

## Impor progres di portal (berkas = input tak tepercaya)

Fitur **Impor Progres** memulihkan data ke `localStorage` dari berkas yang dipilih pengguna.
Berkas semacam itu bisa saja dimodifikasi atau berasal dari orang lain, jadi
`js/shared/progress-aggregator.js` memperlakukannya sebagai input tak tepercaya:

- **Allowlist key** — hanya key progres yang terdaftar di `MODULES` yang pernah ditulis. Sesi login,
  tema, state sementara, dan key lain di berkas **diabaikan** (dan dilaporkan ke pengguna).
- **Validasi** — nilai harus teks, dibatasi ukurannya (per key dan total), dan key inti harus JSON
  dengan bentuk yang benar (objek/array). Modul yang salah satu key intinya rusak dilewati seluruhnya,
  bukan dipulihkan setengah-setengah. Berkas juga dibatasi 6 MB sebelum dibaca.
- **Atomik** — kalau penyimpanan gagal di tengah jalan (mis. penuh), semua perubahan dikembalikan.
- **Tampilan aman** — teks dari berkas/storage dipasang dengan `textContent`; di PDF rekap di-escape.
- **Ringkasan di berkas tidak dipercaya** — bagian `summary` hanya informasi; angka di dashboard selalu
  dihitung ulang dari data yang dipulihkan.
- Ada dua mode: **Gabungkan** (default; modul yang lebih maju di perangkat ini tidak ditimpa) dan **Timpa**.

Batasan yang jujur: berkas ekspor memuat data modul **apa adanya** — termasuk NPWP/nama WP yang pernah
diisi di formulir SPT, serta email dan nama tampilan di data SPT bila pernah login. Ini data pengguna
sendiri di perangkat sendiri, tetapi berkasnya sebaiknya diperlakukan seperti dokumen pribadi.
Seperti seluruh data progres, isinya juga bisa diedit pengguna, jadi tidak boleh dipakai sebagai bukti
formal (lihat bagian "Batasan").

## Melaporkan masalah keamanan

Jangan membuka issue publik untuk celah yang bisa dieksploitasi. Hubungi pemilik
repo secara langsung (lewat kontak di profil GitHub pemilik) dengan langkah
reproduksi, dan beri waktu untuk memperbaiki sebelum dipublikasikan.
