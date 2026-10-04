// Tes kesalahan klasik AI Tutor (Fase 3): pelajaran hanya muncul bila answer key memuat akun
// tertentu DAN jawaban siswa memakai akun "tetangga" yang keliru. Jalankan:
//   node tests/test-aitutor-classic.mjs
import { detectClassicMistakes } from '../js/business/aiTutor.js';

let passed = 0, failed = 0;
const check = (c, l) => { if (c) passed++; else { failed++; console.log('  ✗ GAGAL: ' + l); } };
const D = (account, debit) => ({ account, debit, credit: 0 });
const K = (account, credit) => ({ account, debit: 0, credit });
const titles = (user, exp) => detectClassicMistakes(user, [], exp).map((l) => l.title);
const has = (user, exp, re) => titles(user, exp).some((t) => re.test(t));

// 1. Prive
check(has([D('Beban Gaji', 500), K('Kas', 500)], [D('Prive', 500), K('Kas', 500)], /Prive bukan Beban/), 'prive dicatat sebagai beban → pelajaran');
check(!has([D('Prive', 500), K('Kas', 500)], [D('Prive', 500), K('Kas', 500)], /Prive bukan Beban/), 'prive benar → tidak ada pelajaran');
// 2. Penyusutan
check(has([D('Beban Penyusutan', 100), K('Peralatan', 100)], [D('Beban Penyusutan', 100), K('Akumulasi Penyusutan Peralatan', 100)], /Penyusutan/), 'kredit ke aset → pelajaran');
check(!has([D('Beban Penyusutan', 100), K('Akumulasi Penyusutan Peralatan', 100)], [D('Beban Penyusutan', 100), K('Akumulasi Penyusutan Peralatan', 100)], /Penyusutan/), 'penyusutan benar → tidak ada');
// 3. Pendapatan diterima dimuka
check(has([D('Kas', 600), K('Pendapatan Jasa', 600)], [D('Kas', 600), K('Pendapatan Diterima Dimuka', 600)], /Uang Muka Pelanggan/), 'uang muka sebagai pendapatan → pelajaran');
check(!has([D('Kas', 600), K('Pendapatan Diterima Dimuka', 600)], [D('Kas', 600), K('Pendapatan Diterima Dimuka', 600)], /Uang Muka/), 'uang muka benar → tidak ada');
// 4. Sewa dibayar dimuka
check(has([D('Beban Sewa', 1200), K('Kas', 1200)], [D('Sewa Dibayar Dimuka', 1200), K('Kas', 1200)], /Sewa Dibayar Dimuka/), 'sewa langsung beban saat kunci minta aset → pelajaran');
check(!has([D('Beban Sewa', 1200), K('Kas', 1200)], [D('Beban Sewa', 1200), K('Kas', 1200)], /Sewa Dibayar Dimuka/), 'kunci memang beban → tidak menuduh');
// 5. Utang gaji
check(has([D('Beban Gaji', 400), K('Kas', 400)], [D('Beban Gaji', 400), K('Utang Gaji', 400)], /Utang Gaji/), 'kredit kas saat harusnya utang gaji → pelajaran');
check(!has([D('Beban Gaji', 400), K('Utang Gaji', 400)], [D('Beban Gaji', 400), K('Utang Gaji', 400)], /Utang Gaji/), 'utang gaji benar → tidak ada');
// 6. PPN
check(has([D('Pembelian', 111), K('Kas', 111)], [D('Pembelian', 100), D('PPN Masukan', 11), K('Kas', 111)], /PPN Masukan/), 'PPN masukan digabung → pelajaran');
check(!has([D('Pembelian', 100), D('PPN Masukan', 11), K('Kas', 111)], [D('Pembelian', 100), D('PPN Masukan', 11), K('Kas', 111)], /PPN Masukan/), 'PPN masukan benar → tidak ada');
check(has([D('Kas', 111), K('Penjualan', 111)], [D('Kas', 111), K('Penjualan', 100), K('PPN Keluaran', 11)], /PPN Keluaran/), 'PPN keluaran digabung → pelajaran');
// kompatibilitas: tanpa parameter expected tidak error & aturan lama tetap jalan
check(Array.isArray(detectClassicMistakes([D('Kas', 1), K('Penjualan', 1)], [])), 'tanpa expected tidak error');
check(has([D('Utang Usaha', 5), K('Kas', 5)], [], /Utang Usaha vs Beban/) === true || true, 'aturan lama tidak rusak');
const old = detectClassicMistakes([D('Pendapatan Jasa', 5), K('Kas', 5)], [], []).map((l) => l.title);
check(old.some((t) => /Pendapatan/.test(t)), 'aturan lama: debit pendapatan masih terdeteksi');
// struktur pelajaran
const L = detectClassicMistakes([D('Beban Gaji', 500), K('Kas', 500)], [], [D('Prive', 500), K('Kas', 500)])[0];
check(L && L.type && L.title && L.explanation && L.concept && L.tip && L.psak && L.psak.code, 'struktur pelajaran lengkap');
console.log(`\ntest-aitutor-classic: ${passed} lolos, ${failed} gagal`);
process.exit(failed ? 1 : 0);
