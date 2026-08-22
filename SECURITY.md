# Keamanan & Konfigurasi

## Kenapa Firebase config "hardcoded" di `js/auth.js`?

Ini disengaja, bukan kelalaian. Firebase Web SDK config (`apiKey`, `authDomain`,
`projectId`, dst.) **bukan rahasia** — Google sendiri menyatakan config ini aman
untuk ditaruh di kode client / repo publik, karena ia hanya mengidentifikasi
proyek Firebase mana yang dipakai, bukan kredensial yang memberi akses. Siapa
pun bisa melihatnya lewat DevTools browser meski disembunyikan dengan cara
apa pun di sisi client.

Karena situs ini murni statis (HTML/CSS/JS, tanpa build step, tanpa server —
supaya tetap gratis dan bisa dipublish ke GitHub Pages), tidak ada mekanisme
untuk "menyuntikkan" env var saat build seperti pada aplikasi Node/React.
Memindahkan config ke file terpisah yang di-gitignore hanya akan membuat situs
gagal jalan tanpa menambah keamanan nyata — file itu tetap harus di-fetch
browser untuk dipakai.

**Yang benar-benar mengamankan data pengguna** bukan menyembunyikan config,
tapi dua hal ini (dikonfigurasi di Firebase Console, di luar repo ini):

1. **Firebase Security Rules** (Authentication + Realtime Database/Firestore
   bila dipakai) — pastikan rule mengharuskan `auth != null` dan membatasi
   baca/tulis hanya pada path milik `request.auth.uid` sendiri. Tanpa rule
   yang benar, siapa pun yang tahu project ID bisa membaca/menulis data,
   terlepas dari apakah `apiKey` "disembunyikan" atau tidak.
2. **Authorized domains** — di Firebase Console → Authentication → Settings,
   pastikan hanya domain resmi (mis. domain GitHub Pages Anda) yang terdaftar,
   supaya link login tidak bisa disalahgunakan dari domain lain.

Kedua hal ini tidak bisa diterapkan dari dalam repo/kode — perlu dilakukan
langsung di Firebase Console oleh pemilik proyek.

## Rekomendasi Firebase Security Rules (Realtime Database)

Jika Anda menambahkan penyimpanan cloud (mis. progres) di masa depan, mulai
dari rule seketat ini dan longgarkan sesuai kebutuhan:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

## Ruang lingkup keamanan modul SQL & Power Query Simulator

Modul `apps/sql-pq/` sengaja dirancang **tanpa backend/database eksternal**
(lihat brief awal, bagian "Progress System"): seluruh data (progres, dataset
kustom) tersimpan di `localStorage` milik browser pengguna sendiri — tidak ada
data yang dikirim ke server mana pun, sehingga tidak ada permukaan serangan
sisi-server untuk modul ini. Satu-satunya `eval`-like construct yang sempat
dipakai (formula Custom Column di Power Query Simulator) sudah diganti dengan
parser ekspresi aman buatan sendiri — lihat catatan di `apps/sql-pq/js/powerquery-engine.js`.
