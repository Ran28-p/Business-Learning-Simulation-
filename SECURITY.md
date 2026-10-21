# Keamanan — Business Learning Simulation

Dokumen ini menjelaskan model ancaman proyek, apa yang sudah ditegakkan di repo,
dan apa yang **harus dicek manual di Firebase Console** (karena tidak bisa
dikunci lewat kode). Proyek ini static site (GitHub Pages) tanpa server sendiri,
jadi permukaan serangannya kecil — tetapi ada satu tempat yang butuh perhatian
serius: **Firebase Realtime Database**.

## Ringkasan model ancaman

| Aset | Di mana | Risiko utama | Pengendali |
|---|---|---|---|
| Progres belajar (XP, level, riwayat) | `localStorage` per modul; SPT memakai `users/{uid}`; Accounting/Excel/SQL & Power Query memakai `portalSync/{uid}` | Data pengguna lain terbaca/tertimpa; penyalahgunaan kuota | Firebase Security Rules (`database.rules.json`) |
| Ruang Kuis Langsung (`liveRooms/<KODE>`) | Firebase RTDB, login anonim; kode ruang 6 karakter | Siswa membaca kunci, mengirim jawaban lebih dari sekali/terlambat, menulis skor, atau mengambil alih ruang | Rules membatasi kunci ke guru, jawaban satu kali dalam jendela waktu, dan penulisan skor ke host; diuji di `scripts/check-firebase-rules.mjs` |
| Email akun | Firebase Auth + `users/{uid}` | Kebocoran data pribadi | Rules membatasi `users/{uid}` ke pemilik uid; nama panggilan Kuis Langsung terlihat bagi peserta terautentikasi di ruang itu |
| Rekap peserta untuk pengajar | File JSON pilihan peserta, diproses di browser | File berbahaya atau klaim hasil yang dimanipulasi | Validasi format, batas ukuran, rendering teks aman, ekspor CSV yang dinetralkan |
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
   `xp` 0–10.000.000, `email` ≤ 254 karakter, dan indeks `history` dibatasi
   sampai 10.000 entri) agar ukuran data pengguna tetap terkendali.
4. **Sinkron lintas modul dibatasi** — `portalSync` hanya menerima unit
   `accounting`, `excel`, dan `sqlpq`, serta key data yang diizinkan untuk tiap unit.
   Setiap string data dibatasi 2.000.000 karakter.
5. **Kuis Langsung dibatasi** — kunci hanya dapat dibaca host; peserta hanya dapat
   membaca jawaban miliknya dan hanya dapat mengirim satu kali selama soal aktif.
   Waktu mulai dan batas akhir soal memakai waktu server; skor hanya dapat ditulis
   pemilik ruang.

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
 Uji juga batas akses `/portalSync` dan `liveRooms` sebelum mengaktifkan fitur terkait.

### Pemeriksaan otomatis di CI

`node scripts/check-firebase-rules.mjs` (job `lint` di CI) memeriksa:

- tidak ada `.read`/`.write` publik di mana pun; akses pengguna harus dibatasi ke uid;
- field progres SPT dan allowlist sinkronisasi lintas modul diperiksa terhadap kode;
- rules diuji untuk data pengguna, sinkronisasi, dan kuis langsung: identitas lain,
  akses tanpa login, field asing, nilai di luar batas, pembacaan kunci, jawaban ganda,
  pengiriman terlambat, dan penulisan skor oleh non-host harus ditolak.

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
- [ ] **Authentication → Sign-in method**: aktifkan *Email link (passwordless)*
      untuk Portal dan *Anonymous* untuk Kuis Langsung; matikan provider yang tidak dipakai.
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
- **Kuis Langsung bukan sistem penilaian berisiko tinggi.** Skor dihitung di browser
  host dan dapat dimanipulasi oleh host; kode ruang bukan mekanisme autentikasi peserta.

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
- **Ruang Pengajar** memproses file JSON di browser tanpa mengunggah atau menyimpan
  rekap. Isi berkas tetap input tak tepercaya dan dapat dimanipulasi peserta.

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

## Sinkron cloud lintas modul (`portalSync`)

Progres **Accounting, Excel, dan SQL & Power Query** disinkronkan ke Firebase Realtime Database
untuk pengguna yang login di Portal (`js/shared/cloud-sync*.js`). Simulator SPT **tidak** ikut: ia sudah
punya sinkron sendiri ke `users/{uid}` dengan skema dan aturan berbeda.

**WAJIB: deploy rules baru sebelum sinkron bisa bekerja.** Cabang `portalSync` ada di `database.rules.json`
tetapi baru berlaku setelah di-deploy (lihat langkah di atas). Sebelum itu, setiap tulis/baca ditolak
(`PERMISSION_DENIED`): aplikasi menampilkan "Aturan Firebase belum diperbarui" di panel *Sinkron cloud* portal
dan progres tetap aman di perangkat. Cabang ini sengaja **terpisah** dari `users/$uid`, jadi men-deploy-nya tidak
mengubah perilaku sinkron SPT.

Uji di **Rules Playground** setelah deploy (gratis):
- *read* `/portalSync/uid-orang-lain` dengan auth uid berbeda → harus **ditolak**; tanpa auth → **ditolak**.
- *write* `/portalSync/uid-sendiri/sqlpq` dengan `{"rev":1,"updatedAt":1,"hash":"abc"}` dan auth uid sendiri → **diizinkan**.
- *write* `/portalSync/uid-sendiri/spt` (unit di luar daftar) → **ditolak**.
- *write* `/portalSync/uid-sendiri/sqlpq/data/spt_simulator_data` → **ditolak** (kunci di luar allowlist unit).

Model data: `portalSync/{uid}/{unit}` = `{ rev, updatedAt, device, hash, xp, act, data: { <kunci ter-encode>: "<teks JSON>" } }`.
Aturan membatasi: unit hanya `accounting|excel|sqlpq`; kunci `data` harus ada di allowlist **unit itu**
(daftar kunci dijaga CI agar sama dengan `progress-aggregator.js`; kunci SPT tidak boleh muncul); nilai berupa
teks ≤ 2.000.000 karakter; field lain ditolak. Aplikasi **tidak mempercayai** data cloud: kunci, ukuran, dan
bentuk JSON diperiksa ulang sebelum menyentuh `localStorage`, hash dihitung ulang, dan penulisan lokal atomik.

Perilaku sinkron (tiga arah lokal ↔ cloud ↔ keadaan sinkron terakhir):
- hanya lokal berubah → kirim (termasuk **reset** progres, yang ikut berlaku di perangkat lain);
  hanya cloud berubah → tarik; dua-duanya berubah → yang lebih maju (XP, lalu aktivitas) menang, tidak ada XP hilang;
- penulisan memakai transaksi + nomor revisi, jadi dua perangkat tidak saling menimpa diam-diam;
- **tautan pertama** dengan kemajuan berbeda di dua sisi, dan **ganti akun di perangkat yang sama**, selalu meminta
  pilihan pengguna (gabungkan / pakai cloud / pakai perangkat ini) — tidak ada yang diubah sebelum dipilih.
  Ini mencegah data lokal milik orang lain terunggah ke akun baru di komputer bersama;
- data "bawaan" yang ditulis modul saat dimuat (XP 0, 0 aktivitas) tidak dihitung sebagai kemajuan.

Batasan yang jujur:
- Data yang dikirim adalah isi `localStorage` modul **apa adanya**. Di Accounting ini mencakup data perusahaan
  yang diisi di pengaturan (termasuk NPWP/alamat bila pengguna menuliskannya, dan data contoh bawaan). Hanya
  pemilik akun yang bisa membacanya (rules), tetapi jangan mengisi data perusahaan sungguhan di aplikasi edukasi.
- Pengguna bisa mengubah datanya sendiri, jadi data ini bukan bukti formal.
- Kuota: batas per kunci 2 MB, per unit paling banyak beberapa MB; satu akun tidak bisa menulis di luar `portalSync/{uidnya}`.
- Pemeriksa rules di CI adalah simulasi pendekatan; uji akhir tetap Rules Playground.
- Uji otomatis memakai Firebase **tiruan**; verifikasi dengan Firebase asli (dua perangkat, login email) tetap perlu
  dilakukan manual setelah deploy rules.

## Melaporkan masalah keamanan

Jangan membuka issue publik untuk celah yang bisa dieksploitasi. Hubungi pemilik
repo secara langsung (lewat kontak di profil GitHub pemilik) dengan langkah
reproduksi, dan beri waktu untuk memperbaiki sebelum dipublikasikan.
