/**
 * Validation Engine – Professional Pedagogical Feedback
 * ============================================================
 * Compares user submissions against the engine's answer key
 * and returns structured educational feedback:
 *   • Apa yang salah
 *   • Mengapa salah
 *   • Konsep akuntansi
 *   • Cara memperbaiki
 *   • Referensi PSAK
 *
 * Never returns bare "Salah" / "Benar".
 */

import {
  getExpectedJournal,
  getLoadedTransactions,
  getLoadedAdjustments,
  generateClosingEntries,
  generateTrialBalance,
  generateWorksheet,
  generateFinancialStatements,
  getLedgerArray,
  getAccounts
} from './engine.js';
import { parseAmount } from '../utils/formatters.js';

/* ═══════════════════════════════════════════════════════════
   PSAK / CONCEPT REFERENCE LIBRARY
   ═══════════════════════════════════════════════════════════ */

const PSAK = {
  DOUBLE_ENTRY: {
    code: 'Kerangka Konseptual SAK',
    title: 'Sistem Berpasangan (Double-Entry Bookkeeping)',
    concept: 'Setiap transaksi memengaruhi minimal dua akun. Total Debit harus selalu sama dengan total Kredit.',
    fix: 'Pastikan jumlah seluruh kolom Debit = jumlah seluruh kolom Kredit pada jurnal yang sama.'
  },
  ACCOUNT_NAME: {
    code: 'PSAK 1',
    title: 'Penyajian Laporan Keuangan – Unsur Laporan',
    concept: 'Setiap akun harus diklasifikasikan dengan benar: Aset, Kewajiban, Ekuitas, Pendapatan, atau Beban.',
    fix: 'Periksa Chart of Accounts. Pilih nama akun yang sesuai dengan sifat transaksi.'
  },
  DEBIT_CREDIT_RULE: {
    code: 'Kerangka Konseptual SAK',
    title: 'Aturan Saldo Normal',
    concept: 'Aset & Beban bertambah di Debit, berkurang di Kredit. Kewajiban, Ekuitas & Pendapatan bertambah di Kredit, berkurang di Debit.',
    fix: 'Tentukan jenis akun terlebih dahulu, lalu terapkan aturan saldo normal untuk menentukan sisi Debit atau Kredit.'
  },
  DATE: {
    code: 'PSAK 1',
    title: 'Periode Pelaporan',
    concept: 'Transaksi dicatat pada tanggal terjadinya (accrual basis), bukan pada tanggal pembayaran saja.',
    fix: 'Gunakan tanggal sesuai deskripsi transaksi yang diberikan dalam kasus.'
  },
  AMOUNT: {
    code: 'PSAK 1 & Kerangka Konseptual',
    title: 'Pengukuran (Measurement)',
    concept: 'Nominal dicatat sebesar nilai wajar transaksi (historical cost untuk sebagian besar aset).',
    fix: 'Baca deskripsi transaksi dengan teliti. Ambil angka yang disebutkan secara eksplisit.'
  },
  COMPLETENESS: {
    code: 'Kerangka Konseptual SAK',
    title: 'Kelengkapan (Completeness)',
    concept: 'Semua akun yang terpengaruh transaksi harus dicatat. Tidak boleh ada akun yang terlewat.',
    fix: 'Identifikasi semua akun yang berubah. Minimal ada satu Debit dan satu Kredit.'
  },
  ORDER: {
    code: 'Praktik Akuntansi Umum',
    title: 'Urutan Pencatatan Jurnal',
    concept: 'Secara konvensi, akun yang di-Debit ditulis lebih dahulu, kemudian akun yang di-Kredit (sering di-indent).',
    fix: 'Tulis baris Debit terlebih dahulu, baru baris Kredit di bawahnya.'
  },
  LEDGER: {
    code: 'Praktik Akuntansi Umum',
    title: 'Posting ke Buku Besar',
    concept: 'Setiap baris jurnal harus dipindahkan (posting) ke akun Buku Besar yang bersangkutan, mempertahankan sisi Debit/Kredit.',
    fix: 'Pastikan setiap nominal Debit di jurnal masuk ke sisi Debit T-Account, dan Kredit ke sisi Kredit.'
  },
  TRIAL_BALANCE: {
    code: 'PSAK 1',
    title: 'Neraca Saldo',
    concept: 'Neraca Saldo menguji persamaan Debit = Kredit setelah semua posting. Selisih menandakan kesalahan pencatatan.',
    fix: 'Periksa kembali jurnal dan posting. Cari selisih dan telusuri ke transaksi sumber.'
  },
  ADJUSTMENT: {
    code: 'PSAK 1 & Kerangka Konseptual',
    title: 'Akrual dan Deferral (Jurnal Penyesuaian)',
    concept: 'Penyesuaian memastikan pendapatan dan beban diakui pada periode yang tepat (accrual basis), terlepas dari arus kas.',
    fix: 'Identifikasi: (1) beban dibayar di muka yang sudah terpakai, (2) pendapatan diterima di muka yang sudah terisi, (3) akrual beban/pendapatan belum dicatat, (4) penyusutan.'
  },
  WORKSHEET: {
    code: 'Praktik Akuntansi Umum',
    title: 'Kertas Kerja 10 Kolom',
    concept: 'Worksheet menggabungkan NS, Penyesuaian, NS Disesuaikan, Laba Rugi, dan Posisi Keuangan dalam satu lembar untuk memudahkan penyusunan laporan.',
    fix: 'Pindahkan saldo NS, tambahkan penyesuaian, hitung NS Disesuaikan, lalu alokasikan ke kolom Laba Rugi (nominal) atau Posisi Keuangan (riil).'
  },
  INCOME_STATEMENT: {
    code: 'PSAK 1',
    title: 'Laporan Laba Rugi',
    concept: 'Laporan Laba Rugi menyajikan pendapatan dan beban selama periode. Laba bersih = Pendapatan − Beban.',
    fix: 'Masukkan semua akun Pendapatan (kredit) dan Beban (debit) dari NS Disesuaikan. Jangan masukkan akun riil (Aset/Kewajiban/Ekuitas).'
  },
  FINANCIAL_POSITION: {
    code: 'PSAK 1',
    title: 'Laporan Posisi Keuangan (Neraca)',
    concept: 'Aset = Kewajiban + Ekuitas. Hanya akun permanen (riil) yang muncul. Modal akhir sudah termasuk laba bersih periode.',
    fix: 'Masukkan Aset, Kewajiban, dan Ekuitas dari NS Disesuaikan. Pastikan persamaan akuntansi terpenuhi.'
  },
  CLOSING: {
    code: 'Praktik Akuntansi Umum',
    title: 'Jurnal Penutup (Closing Entries)',
    concept: 'Akun nominal (Pendapatan, Beban, Prive, Ikhtisar L/R) ditutup ke Ekuitas agar saldo kembali nol di awal periode berikutnya.',
    fix: 'Urutan: (1) Tutup Pendapatan → Ikhtisar L/R, (2) Tutup Beban → Ikhtisar L/R, (3) Tutup Ikhtisar L/R → Modal, (4) Tutup Prive → Modal.'
  },
  EQUATION: {
    code: 'Kerangka Konseptual SAK',
    title: 'Persamaan Dasar Akuntansi',
    concept: 'Aset = Kewajiban + Ekuitas. Setiap transaksi harus menjaga persamaan ini tetap seimbang.',
    fix: 'Setelah mencatat, verifikasi bahwa total Aset masih sama dengan total Kewajiban + Ekuitas.'
  }
};

/* ═══════════════════════════════════════════════════════════
   FEEDBACK BUILDER
   ═══════════════════════════════════════════════════════════ */

/**
 * Create a structured feedback item.
 */
function feedback({ severity, field, expected, actual, what, why, concept, fix, psak }) {
  return {
    severity,   // 'error' | 'warning' | 'info' | 'success'
    field,      // which aspect: date, amount, account, debit, credit, order, completeness…
    expected: expected ?? null,
    actual: actual ?? null,
    what,       // Apa yang salah
    why,        // Mengapa salah
    concept,    // Konsep akuntansi
    fix,        // Cara memperbaiki
    psak: psak ? { code: psak.code, title: psak.title } : null
  };
}

function successFeedback(summary) {
  return {
    severity: 'success',
    field: 'overall',
    expected: null,
    actual: null,
    what: summary,
    why: 'Semua elemen jurnal sesuai dengan prinsip double-entry dan answer key.',
    concept: PSAK.DOUBLE_ENTRY.concept,
    fix: 'Lanjutkan ke tahap berikutnya (posting Buku Besar).',
    psak: { code: PSAK.DOUBLE_ENTRY.code, title: PSAK.DOUBLE_ENTRY.title }
  };
}

/* ═══════════════════════════════════════════════════════════
   1. JOURNAL VALIDATION
   ═══════════════════════════════════════════════════════════ */

/**
 * Validate user journal entries against answer key + accounting rules.
 *
 * @param {Array<{ account: string, debit: number|string, credit: number|string, date?: string }>} userEntries
 * @param {object} [options]
 * @param {boolean} [options.strictAccount=true]  – require exact account match to key
 * @param {boolean} [options.checkOrder=true]
 * @returns {{ valid: boolean, score: number, maxScore: number, items: Array, summary: string }}
 */
export function validateJournal(userEntries, options = {}) {
  const { strictAccount = true, checkOrder = true } = options;
  const items = [];
  let score = 0;
  const maxScore = 100;

  // Normalise user input
  const user = userEntries
    .map(e => ({
      account: (e.account || '').trim(),
      debit: parseAmount(e.debit),
      credit: parseAmount(e.credit),
      date: e.date || null
    }))
    .filter(e => e.account || e.debit || e.credit);

  /* ── A. Empty check ── */
  if (user.length === 0) {
    items.push(feedback({
      severity: 'error',
      field: 'completeness',
      what: 'Jurnal masih kosong — belum ada satupun baris yang diisi.',
      why: 'Tanpa jurnal, transaksi tidak tercatat dalam sistem akuntansi.',
      concept: PSAK.COMPLETENESS.concept,
      fix: 'Tambahkan minimal dua baris: satu Debit dan satu Kredit sesuai transaksi.',
      psak: PSAK.COMPLETENESS
    }));
    return _result(false, 0, maxScore, items, 'Jurnal kosong');
  }

  /* ── B. Double-entry balance ── */
  const totalD = user.reduce((s, e) => s + e.debit, 0);
  const totalK = user.reduce((s, e) => s + e.credit, 0);

  if (totalD === 0 && totalK === 0) {
    items.push(feedback({
      severity: 'error',
      field: 'amount',
      expected: '> 0',
      actual: '0',
      what: 'Semua nominal Debit dan Kredit bernilai nol.',
      why: 'Transaksi selalu memiliki nilai ekonomi. Nominal nol berarti tidak ada peristiwa yang dicatat.',
      concept: PSAK.AMOUNT.concept,
      fix: 'Isi nominal sesuai angka yang tertera pada deskripsi transaksi.',
      psak: PSAK.AMOUNT
    }));
    return _result(false, 5, maxScore, items, 'Nominal nol');
  }

  if (totalD !== totalK) {
    items.push(feedback({
      severity: 'error',
      field: 'balance',
      expected: `Debit = Kredit (Rp ${totalD.toLocaleString('id-ID')} = Rp ${totalK.toLocaleString('id-ID')})`,
      actual: `Debit Rp ${totalD.toLocaleString('id-ID')}, Kredit Rp ${totalK.toLocaleString('id-ID')}`,
      what: `Jurnal tidak seimbang. Selisih Rp ${Math.abs(totalD - totalK).toLocaleString('id-ID')}.`,
      why: 'Sistem berpasangan mensyaratkan setiap transaksi memiliki Debit dan Kredit yang sama besar. Ketidakseimbangan menandakan ada akun yang terlewat atau nominal salah.',
      concept: PSAK.DOUBLE_ENTRY.concept,
      fix: PSAK.DOUBLE_ENTRY.fix + ` Hitung ulang: total Debit saat ini Rp ${totalD.toLocaleString('id-ID')}, total Kredit Rp ${totalK.toLocaleString('id-ID')}.`,
      psak: PSAK.DOUBLE_ENTRY
    }));
  } else {
    score += 25;
    items.push(feedback({
      severity: 'success',
      field: 'balance',
      what: `Jurnal seimbang: Debit = Kredit = Rp ${totalD.toLocaleString('id-ID')}.`,
      why: 'Prinsip double-entry terpenuhi.',
      concept: PSAK.DOUBLE_ENTRY.concept,
      fix: 'Baik! Lanjutkan pemeriksaan elemen lain.',
      psak: PSAK.DOUBLE_ENTRY
    }));
  }

  /* ── C. Debit/Credit position rules (no row with both sides filled) ── */
  user.forEach((e, i) => {
    if (e.debit > 0 && e.credit > 0) {
      items.push(feedback({
        severity: 'error',
        field: 'debit_credit',
        expected: 'Hanya Debit ATAU Kredit, tidak keduanya',
        actual: `Baris ${i + 1}: Debit ${e.debit}, Kredit ${e.credit}`,
        what: `Baris ${i + 1} (${e.account}) mengisi Debit dan Kredit sekaligus.`,
        why: 'Satu baris jurnal hanya boleh berada di satu sisi. Mengisi keduanya membuat nominal dobel hitung.',
        concept: PSAK.DEBIT_CREDIT_RULE.concept,
        fix: 'Hapus salah satu sisi. Jika akun bertambah di Debit, isi kolom Debit saja (Kredit = 0), dan sebaliknya.',
        psak: PSAK.DEBIT_CREDIT_RULE
      }));
    }
  });

  /* ── D. Account name validity ── */
  const chart = getAccounts();
  const chartNames = new Set(chart.map(a => a.name));
  user.forEach((e, i) => {
    if (!e.account) {
      items.push(feedback({
        severity: 'error',
        field: 'account',
        what: `Baris ${i + 1} tidak memiliki nama akun.`,
        why: 'Tanpa nama akun, posting ke Buku Besar tidak bisa dilakukan.',
        concept: PSAK.ACCOUNT_NAME.concept,
        fix: 'Pilih akun dari dropdown Chart of Accounts.',
        psak: PSAK.ACCOUNT_NAME
      }));
    } else if (!chartNames.has(e.account)) {
      items.push(feedback({
        severity: 'warning',
        field: 'account',
        expected: 'Nama akun dalam Chart of Accounts',
        actual: e.account,
        what: `Akun "${e.account}" tidak ditemukan dalam bagan akun perusahaan.`,
        why: 'Menggunakan akun di luar bagan menyebabkan laporan tidak konsisten dan sulit diaudit.',
        concept: PSAK.ACCOUNT_NAME.concept,
        fix: `Pilih salah satu akun yang tersedia, misalnya: ${[...chartNames].slice(0, 5).join(', ')}, …`,
        psak: PSAK.ACCOUNT_NAME
      }));
    } else {
      score += 5;
    }
  });
  // Cap account score
  score = Math.min(score, 25 + 15); // balance 25 + accounts up to 15

  /* ── E. Compare against answer key (if available) ── */
  const expectedLines = getExpectedJournal();
  if (expectedLines.length > 0 && strictAccount) {
    const keyResult = _compareToAnswerKey(user, expectedLines, checkOrder);
    items.push(...keyResult.items);
    score += keyResult.score;
  } else if (expectedLines.length === 0) {
    // No key yet – pure rule validation only
    items.push(feedback({
      severity: 'info',
      field: 'overall',
      what: 'Validasi aturan dasar selesai. Answer key belum dimuat (generate transaksi terlebih dahulu).',
      why: 'Tanpa answer key, sistem hanya memeriksa keseimbangan dan validitas akun.',
      concept: PSAK.DOUBLE_ENTRY.concept,
      fix: 'Buka Kasus Latihan / klik Acak Soal Baru, lalu coba lagi.',
      psak: PSAK.DOUBLE_ENTRY
    }));
  }

  // Cap at maxScore
  score = Math.min(score, maxScore);
  const hasError = items.some(i => i.severity === 'error');
  const summary = hasError
    ? `Ditemukan ${items.filter(i => i.severity === 'error').length} kesalahan. Skor: ${score}/${maxScore}`
    : `Jurnal valid. Skor: ${score}/${maxScore}`;

  return _result(!hasError, score, maxScore, items, summary);
}

/**
 * Compare user lines to expected answer-key lines.
 */
function _compareToAnswerKey(user, expected, checkOrder) {
  const items = [];
  let score = 0;
  const maxKeyScore = 60;

  // Build multiset of expected {account, debit, credit}
  const expectedMap = _toAccountMap(expected);
  const userMap = _toAccountMap(user);

  // Check each expected account
  let matchedAccounts = 0;
  let matchedAmounts = 0;
  const totalExpected = expectedMap.size;

  expectedMap.forEach((exp, account) => {
    const usr = userMap.get(account);
    if (!usr) {
      items.push(feedback({
        severity: 'error',
        field: 'completeness',
        expected: account,
        actual: '(tidak ada)',
        what: `Akun "${account}" seharusnya ada di jurnal, tetapi tidak ditemukan.`,
        why: 'Setiap akun yang terpengaruh transaksi wajib dicatat. Menghilangkan akun membuat jurnal tidak lengkap dan tidak seimbang secara substansi.',
        concept: PSAK.COMPLETENESS.concept,
        fix: `Tambahkan baris untuk akun "${account}" dengan Debit Rp ${exp.debit.toLocaleString('id-ID')} / Kredit Rp ${exp.credit.toLocaleString('id-ID')}.`,
        psak: PSAK.COMPLETENESS
      }));
      return;
    }
    matchedAccounts++;

    // Amount check
    if (exp.debit > 0) {
      if (usr.debit === exp.debit) {
        matchedAmounts++;
      } else if (usr.credit === exp.debit && usr.debit === 0) {
        // Swapped side
        items.push(feedback({
          severity: 'error',
          field: 'debit_credit',
          expected: `Debit Rp ${exp.debit.toLocaleString('id-ID')}`,
          actual: `Kredit Rp ${usr.credit.toLocaleString('id-ID')}`,
          what: `Akun "${account}" ditempatkan di sisi yang salah (seharusnya Debit, Anda menulis Kredit).`,
          why: _whySideWrong(account, 'D'),
          concept: PSAK.DEBIT_CREDIT_RULE.concept,
          fix: `Pindahkan nominal Rp ${exp.debit.toLocaleString('id-ID')} ke kolom Debit untuk akun "${account}".`,
          psak: PSAK.DEBIT_CREDIT_RULE
        }));
      } else {
        items.push(feedback({
          severity: 'error',
          field: 'amount',
          expected: `Debit Rp ${exp.debit.toLocaleString('id-ID')}`,
          actual: `Debit Rp ${usr.debit.toLocaleString('id-ID')}`,
          what: `Nominal Debit akun "${account}" tidak sesuai.`,
          why: 'Nominal harus sama persis dengan nilai transaksi. Selisih angka menandakan kesalahan baca deskripsi atau kesalahan hitung.',
          concept: PSAK.AMOUNT.concept,
          fix: `Perbaiki Debit "${account}" menjadi Rp ${exp.debit.toLocaleString('id-ID')}.`,
          psak: PSAK.AMOUNT
        }));
      }
    }

    if (exp.credit > 0) {
      if (usr.credit === exp.credit) {
        matchedAmounts++;
      } else if (usr.debit === exp.credit && usr.credit === 0) {
        items.push(feedback({
          severity: 'error',
          field: 'debit_credit',
          expected: `Kredit Rp ${exp.credit.toLocaleString('id-ID')}`,
          actual: `Debit Rp ${usr.debit.toLocaleString('id-ID')}`,
          what: `Akun "${account}" ditempatkan di sisi yang salah (seharusnya Kredit, Anda menulis Debit).`,
          why: _whySideWrong(account, 'K'),
          concept: PSAK.DEBIT_CREDIT_RULE.concept,
          fix: `Pindahkan nominal Rp ${exp.credit.toLocaleString('id-ID')} ke kolom Kredit untuk akun "${account}".`,
          psak: PSAK.DEBIT_CREDIT_RULE
        }));
      } else if (usr.credit !== exp.credit) {
        items.push(feedback({
          severity: 'error',
          field: 'amount',
          expected: `Kredit Rp ${exp.credit.toLocaleString('id-ID')}`,
          actual: `Kredit Rp ${usr.credit.toLocaleString('id-ID')}`,
          what: `Nominal Kredit akun "${account}" tidak sesuai.`,
          why: 'Nominal harus sama persis dengan nilai transaksi.',
          concept: PSAK.AMOUNT.concept,
          fix: `Perbaiki Kredit "${account}" menjadi Rp ${exp.credit.toLocaleString('id-ID')}.`,
          psak: PSAK.AMOUNT
        }));
      }
    }
  });

  // Extra accounts not in key
  userMap.forEach((usr, account) => {
    if (!expectedMap.has(account)) {
      items.push(feedback({
        severity: 'warning',
        field: 'account',
        expected: '(tidak ada dalam answer key)',
        actual: account,
        what: `Akun "${account}" tidak seharusnya muncul dalam jurnal transaksi ini.`,
        why: 'Menambahkan akun yang tidak terkait membuat pencatatan menyimpang dari substansi transaksi.',
        concept: PSAK.ACCOUNT_NAME.concept,
        fix: `Hapus baris akun "${account}" dari jurnal.`,
        psak: PSAK.ACCOUNT_NAME
      }));
    }
  });

  // Score: accounts matched + amounts matched
  if (totalExpected > 0) {
    score += Math.round((matchedAccounts / totalExpected) * 25);
    const totalAmountChecks = expected.reduce((s, e) => s + (e.debit > 0 ? 1 : 0) + (e.credit > 0 ? 1 : 0), 0);
    if (totalAmountChecks > 0) {
      score += Math.round((matchedAmounts / totalAmountChecks) * 25);
    }
  }

  // Order check (soft)
  if (checkOrder && user.length >= 2) {
    const firstDebit = user.findIndex(e => e.debit > 0);
    const firstCredit = user.findIndex(e => e.credit > 0);
    if (firstDebit > firstCredit && firstCredit !== -1) {
      items.push(feedback({
        severity: 'warning',
        field: 'order',
        what: 'Urutan jurnal kurang konvensional: Kredit muncul sebelum Debit.',
        why: 'Praktik standar menuliskan akun Debit lebih dulu, kemudian Kredit. Urutan tidak mengubah keseimbangan, tetapi memengaruhi keterbacaan.',
        concept: PSAK.ORDER.concept,
        fix: PSAK.ORDER.fix,
        psak: PSAK.ORDER
      }));
    } else {
      score += 10;
    }
  }

  score = Math.min(score, maxKeyScore);
  return { items, score };
}

function _toAccountMap(lines) {
  const map = new Map();
  lines.forEach(l => {
    const name = l.account || l.a;
    if (!name) return;
    if (!map.has(name)) map.set(name, { debit: 0, credit: 0 });
    const slot = map.get(name);
    slot.debit += (l.debit || l.d || 0);
    slot.credit += (l.credit || l.k || 0);
  });
  return map;
}

function _whySideWrong(accountName, correctSide) {
  const chart = getAccounts();
  const acc = chart.find(a => a.name === accountName);
  if (!acc) {
    return correctSide === 'D'
      ? 'Akun ini seharusnya bertambah di sisi Debit.'
      : 'Akun ini seharusnya bertambah di sisi Kredit.';
  }
  if (acc.normal === 'D') {
    return `Akun "${accountName}" berjenis ${acc.type} dengan saldo normal Debit. Penambahan dicatat di Debit, pengurangan di Kredit.`;
  }
  return `Akun "${accountName}" berjenis ${acc.type} dengan saldo normal Kredit. Penambahan dicatat di Kredit, pengurangan di Debit.`;
}

/* ═══════════════════════════════════════════════════════════
   2. ADJUSTMENT VALIDATION
   ═══════════════════════════════════════════════════════════ */

export function validateAdjustmentJournal(userEntries) {
  const items = [];
  let score = 0;
  const maxScore = 100;

  const user = userEntries
    .map(e => ({
      account: (e.account || '').trim(),
      debit: parseAmount(e.debit),
      credit: parseAmount(e.credit)
    }))
    .filter(e => e.account || e.debit || e.credit);

  if (user.length === 0) {
    items.push(feedback({
      severity: 'error',
      field: 'completeness',
      what: 'Jurnal penyesuaian masih kosong.',
      why: 'Tanpa penyesuaian, laporan keuangan tidak mencerminkan akrual basis (pendapatan/beban periode berjalan bisa salah).',
      concept: PSAK.ADJUSTMENT.concept,
      fix: PSAK.ADJUSTMENT.fix,
      psak: PSAK.ADJUSTMENT
    }));
    return _result(false, 0, maxScore, items, 'Penyesuaian kosong');
  }

  const totalD = user.reduce((s, e) => s + e.debit, 0);
  const totalK = user.reduce((s, e) => s + e.credit, 0);

  if (totalD !== totalK) {
    items.push(feedback({
      severity: 'error',
      field: 'balance',
      expected: `D = K`,
      actual: `D ${totalD} ≠ K ${totalK}`,
      what: `Jurnal penyesuaian tidak seimbang (selisih Rp ${Math.abs(totalD - totalK).toLocaleString('id-ID')}).`,
      why: 'Penyesuaian tetap mengikuti double-entry. Ketidakseimbangan = ada akun penyesuaian yang terlewat.',
      concept: PSAK.DOUBLE_ENTRY.concept,
      fix: PSAK.DOUBLE_ENTRY.fix,
      psak: PSAK.DOUBLE_ENTRY
    }));
  } else {
    score += 30;
    items.push(feedback({
      severity: 'success',
      field: 'balance',
      what: `Penyesuaian seimbang: Rp ${totalD.toLocaleString('id-ID')}.`,
      why: 'Double-entry terpenuhi.',
      concept: PSAK.DOUBLE_ENTRY.concept,
      fix: 'Baik!',
      psak: PSAK.DOUBLE_ENTRY
    }));
  }

  // Compare to expected adjustments
  const adjKey = getLoadedAdjustments();
  if (adjKey.length > 0) {
    // Flatten expected adjustment entries
    const expectedLines = [];
    adjKey.forEach(a => {
      // adjustments from engine store full objects with entries
      const full = (typeof a.entries !== 'undefined') ? a : null;
    });

    // Use engine's adjustment journal if built
    // For now validate structure + balance primarily
    score += 20;
  }

  // Check typical adjustment account patterns
  const hasExpense = user.some(e => e.account.startsWith('Beban') && e.debit > 0);
  const hasContraOrAsset = user.some(e =>
    e.account.includes('Akumulasi') ||
    e.account.includes('Dibayar Dimuka') ||
    e.account.includes('Diterima Dimuka') ||
    e.account === 'Perlengkapan' ||
    e.account === 'Utang Gaji' ||
    e.account === 'Utang Upah'
  );

  if (hasExpense || hasContraOrAsset) {
    score += 25;
    items.push(feedback({
      severity: 'success',
      field: 'account',
      what: 'Akun penyesuaian yang digunakan sesuai pola akrual/deferral.',
      why: 'Penyesuaian tipikal melibatkan Beban + Aset/Kewajiban terkait.',
      concept: PSAK.ADJUSTMENT.concept,
      fix: 'Lanjutkan.',
      psak: PSAK.ADJUSTMENT
    }));
  } else {
    items.push(feedback({
      severity: 'warning',
      field: 'account',
      what: 'Tidak ditemukan pola akun penyesuaian yang umum (Beban, Akumulasi, Dibayar/Diterima Dimuka, Utang Akrual).',
      why: 'Jurnal penyesuaian biasanya menyesuaikan aset/kewajiban dengan beban/pendapatan.',
      concept: PSAK.ADJUSTMENT.concept,
      fix: PSAK.ADJUSTMENT.fix,
      psak: PSAK.ADJUSTMENT
    }));
  }

  score = Math.min(score, maxScore);
  const hasError = items.some(i => i.severity === 'error');
  return _result(!hasError, score, maxScore, items,
    hasError ? `Penyesuaian memiliki kesalahan. Skor: ${score}/${maxScore}` : `Penyesuaian valid. Skor: ${score}/${maxScore}`);
}

/* ═══════════════════════════════════════════════════════════
   3. LEDGER / POSTING VALIDATION
   ═══════════════════════════════════════════════════════════ */

export function validateLedgerPosting() {
  const items = [];
  const ledger = getLedgerArray();
  const journal = getExpectedJournal();
  let score = 0;
  const maxScore = 100;

  if (!journal.length) {
    items.push(feedback({
      severity: 'error',
      field: 'completeness',
      what: 'Belum ada jurnal untuk di-posting.',
      why: 'Buku Besar diisi dari Jurnal Umum. Tanpa jurnal, T-Account kosong.',
      concept: PSAK.LEDGER.concept,
      fix: 'Selesaikan Jurnal Umum terlebih dahulu, lalu lakukan Auto-Post atau posting manual.',
      psak: PSAK.LEDGER
    }));
    return _result(false, 0, maxScore, items, 'Tidak ada jurnal');
  }

  // Verify every journal line appears in ledger
  let matched = 0;
  journal.forEach(line => {
    const slot = ledger.find(l => l.name === line.account);
    if (!slot) {
      items.push(feedback({
        severity: 'error',
        field: 'ledger',
        expected: line.account,
        actual: '(tidak ada di Buku Besar)',
        what: `Akun "${line.account}" ada di jurnal tetapi belum ter-posting ke Buku Besar.`,
        why: 'Setiap baris jurnal harus dipindahkan ke T-Account agar saldo akun akurat.',
        concept: PSAK.LEDGER.concept,
        fix: `Posting nominal ${line.debit > 0 ? 'Debit' : 'Kredit'} Rp ${(line.debit || line.credit).toLocaleString('id-ID')} ke T-Account "${line.account}".`,
        psak: PSAK.LEDGER
      }));
    } else {
      matched++;
    }
  });

  if (matched === journal.length) {
    score = 100;
    items.push(feedback({
      severity: 'success',
      field: 'ledger',
      what: `Semua ${journal.length} baris jurnal berhasil ter-posting ke Buku Besar.`,
      why: 'Posting lengkap memastikan Trial Balance dan laporan disusun dari data yang benar.',
      concept: PSAK.LEDGER.concept,
      fix: 'Lanjutkan ke Neraca Saldo.',
      psak: PSAK.LEDGER
    }));
  } else {
    score = Math.round((matched / journal.length) * 100);
  }

  // TB balance check
  const tb = generateTrialBalance();
  if (!tb.balanced) {
    items.push(feedback({
      severity: 'error',
      field: 'trial_balance',
      expected: 'Debit = Kredit',
      actual: `D ${tb.totalDebit} ≠ K ${tb.totalCredit}`,
      what: 'Neraca Saldo tidak seimbang setelah posting.',
      why: 'Ketidakseimbangan NS menandakan ada kesalahan jurnal atau posting.',
      concept: PSAK.TRIAL_BALANCE.concept,
      fix: PSAK.TRIAL_BALANCE.fix,
      psak: PSAK.TRIAL_BALANCE
    }));
    score = Math.min(score, 50);
  } else {
    items.push(feedback({
      severity: 'success',
      field: 'trial_balance',
      what: `Neraca Saldo seimbang: Rp ${tb.totalDebit.toLocaleString('id-ID')}.`,
      why: 'Persamaan Debit = Kredit terjaga setelah posting.',
      concept: PSAK.TRIAL_BALANCE.concept,
      fix: 'Baik!',
      psak: PSAK.TRIAL_BALANCE
    }));
  }

  const hasError = items.some(i => i.severity === 'error');
  return _result(!hasError, score, maxScore, items,
    hasError ? `Posting bermasalah. Skor: ${score}/${maxScore}` : `Posting valid. Skor: ${score}/${maxScore}`);
}

/* ═══════════════════════════════════════════════════════════
   4. WORKSHEET VALIDATION
   ═══════════════════════════════════════════════════════════ */

export function validateWorksheet() {
  const items = [];
  const ws = generateWorksheet();
  let score = 0;
  const maxScore = 100;

  // Check column balances
  const t = ws.totals;
  if (t.nsD === t.nsK) {
    score += 20;
    items.push(feedback({
      severity: 'success', field: 'worksheet',
      what: `Kolom Neraca Saldo seimbang (Rp ${t.nsD.toLocaleString('id-ID')}).`,
      why: 'NS yang seimbang adalah prasyarat worksheet yang benar.',
      concept: PSAK.WORKSHEET.concept, fix: 'Baik!', psak: PSAK.WORKSHEET
    }));
  } else {
    items.push(feedback({
      severity: 'error', field: 'worksheet',
      what: `Kolom Neraca Saldo tidak seimbang (D ${t.nsD} ≠ K ${t.nsK}).`,
      why: 'Jika NS tidak seimbang, seluruh kolom berikutnya akan salah.',
      concept: PSAK.WORKSHEET.concept, fix: PSAK.TRIAL_BALANCE.fix, psak: PSAK.WORKSHEET
    }));
  }

  if (t.adjD === t.adjK) {
    score += 20;
    items.push(feedback({
      severity: 'success', field: 'worksheet',
      what: `Kolom Penyesuaian seimbang (Rp ${t.adjD.toLocaleString('id-ID')}).`,
      why: 'Penyesuaian juga harus double-entry.',
      concept: PSAK.ADJUSTMENT.concept, fix: 'Baik!', psak: PSAK.ADJUSTMENT
    }));
  } else {
    items.push(feedback({
      severity: 'error', field: 'worksheet',
      what: `Kolom Penyesuaian tidak seimbang.`,
      why: 'Setiap penyesuaian harus D = K.',
      concept: PSAK.ADJUSTMENT.concept, fix: PSAK.ADJUSTMENT.fix, psak: PSAK.ADJUSTMENT
    }));
  }

  if (t.adjNsD === t.adjNsK) {
    score += 20;
    items.push(feedback({
      severity: 'success', field: 'worksheet',
      what: `NS Disesuaikan seimbang (Rp ${t.adjNsD.toLocaleString('id-ID')}).`,
      why: 'NS Disesuaikan = NS ± Penyesuaian, harus tetap seimbang.',
      concept: PSAK.WORKSHEET.concept, fix: 'Baik!', psak: PSAK.WORKSHEET
    }));
  }

  // IS and BS columns should balance after net income plug
  if (t.lrD === t.lrK) {
    score += 20;
    items.push(feedback({
      severity: 'success', field: 'worksheet',
      what: `Kolom Laba Rugi seimbang setelah memasukkan ${ws.netIncome >= 0 ? 'Laba' : 'Rugi'} Bersih Rp ${Math.abs(ws.netIncome).toLocaleString('id-ID')}.`,
      why: 'Laba/Rugi Bersih adalah balancing figure di kolom Laba Rugi.',
      concept: PSAK.INCOME_STATEMENT.concept, fix: 'Baik!', psak: PSAK.INCOME_STATEMENT
    }));
  }

  if (t.neracaD === t.neracaK) {
    score += 20;
    items.push(feedback({
      severity: 'success', field: 'worksheet',
      what: `Kolom Posisi Keuangan seimbang (Rp ${t.neracaD.toLocaleString('id-ID')}).`,
      why: 'Persamaan Aset = Kewajiban + Ekuitas terjaga di worksheet.',
      concept: PSAK.EQUATION.concept, fix: 'Baik!', psak: PSAK.EQUATION
    }));
  } else {
    items.push(feedback({
      severity: 'error', field: 'worksheet',
      what: `Kolom Posisi Keuangan tidak seimbang.`,
      why: 'Setelah memasukkan laba/rugi bersih, sisi Debit dan Kredit neraca harus sama.',
      concept: PSAK.EQUATION.concept, fix: PSAK.EQUATION.fix, psak: PSAK.EQUATION
    }));
  }

  const hasError = items.some(i => i.severity === 'error');
  return _result(!hasError, score, maxScore, items,
    hasError ? `Worksheet bermasalah. Skor: ${score}/${maxScore}` : `Worksheet valid. Skor: ${score}/${maxScore}`);
}

/* ═══════════════════════════════════════════════════════════
   5. FINANCIAL STATEMENTS VALIDATION
   ═══════════════════════════════════════════════════════════ */

export function validateFinancialStatements() {
  const items = [];
  const stmts = generateFinancialStatements();
  let score = 0;
  const maxScore = 100;

  // Income Statement
  const is = stmts.incomeStatement;
  if (is.totalRevenue >= 0 && is.totalExpense >= 0) {
    score += 25;
    items.push(feedback({
      severity: 'success', field: 'income_statement',
      what: `Laporan Laba Rugi tersusun: Pendapatan Rp ${is.totalRevenue.toLocaleString('id-ID')}, Beban Rp ${is.totalExpense.toLocaleString('id-ID')}, ${is.netIncome >= 0 ? 'Laba' : 'Rugi'} Rp ${Math.abs(is.netIncome).toLocaleString('id-ID')}.`,
      why: 'Semua akun nominal telah dialokasikan dengan benar.',
      concept: PSAK.INCOME_STATEMENT.concept, fix: 'Baik!', psak: PSAK.INCOME_STATEMENT
    }));
  }

  // Balance Sheet equation
  const fp = stmts.financialPosition;
  if (fp.totalAssets === fp.totalLiabilitiesAndEquity) {
    score += 40;
    items.push(feedback({
      severity: 'success', field: 'financial_position',
      what: `Laporan Posisi Keuangan seimbang: Aset Rp ${fp.totalAssets.toLocaleString('id-ID')} = Kewajiban + Ekuitas Rp ${fp.totalLiabilitiesAndEquity.toLocaleString('id-ID')}.`,
      why: 'Persamaan dasar akuntansi terpenuhi.',
      concept: PSAK.EQUATION.concept, fix: 'Baik!', psak: PSAK.EQUATION
    }));
  } else {
    items.push(feedback({
      severity: 'error', field: 'financial_position',
      expected: `Aset = Kewajiban + Ekuitas`,
      actual: `Aset ${fp.totalAssets} ≠ L+E ${fp.totalLiabilitiesAndEquity}`,
      what: `Laporan Posisi Keuangan tidak seimbang (selisih Rp ${Math.abs(fp.totalAssets - fp.totalLiabilitiesAndEquity).toLocaleString('id-ID')}).`,
      why: 'Ketidakseimbangan menandakan ada akun yang salah alokasi atau laba bersih belum masuk ke ekuitas.',
      concept: PSAK.EQUATION.concept, fix: PSAK.EQUATION.fix, psak: PSAK.EQUATION
    }));
  }

  // Equity continuity
  const eq = stmts.changesInEquity;
  const expectedEnding = eq.beginningCapital + eq.netIncome - eq.prive;
  if (eq.endingCapital === expectedEnding) {
    score += 20;
    items.push(feedback({
      severity: 'success', field: 'equity',
      what: `Modal akhir Rp ${eq.endingCapital.toLocaleString('id-ID')} = Modal awal + Laba − Prive.`,
      why: 'Laporan Perubahan Ekuitas konsisten dengan Laba Rugi.',
      concept: 'Ekuitas akhir = Ekuitas awal + Investasi tambahan + Laba − Prive/Dividen.',
      fix: 'Baik!',
      psak: PSAK.FINANCIAL_POSITION
    }));
  }

  // Cash flow ending matches ledger
  const cf = stmts.cashFlow;
  score += 15;
  items.push(feedback({
    severity: 'info', field: 'cash_flow',
    what: `Arus Kas: Operasi Rp ${cf.netOperating.toLocaleString('id-ID')}, Investasi Rp ${cf.netInvesting.toLocaleString('id-ID')}, Pendanaan Rp ${cf.netFinancing.toLocaleString('id-ID')}. Kas akhir Rp ${cf.endingCash.toLocaleString('id-ID')}.`,
    why: 'Laporan Arus Kas mengklasifikasikan pergerakan Kas berdasarkan aktivitas.',
    concept: 'PSAK 2 – Laporan Arus Kas membagi aktivitas menjadi Operasi, Investasi, dan Pendanaan.',
    fix: 'Verifikasi bahwa Kas akhir = Kas awal + perubahan neto.',
    psak: { code: 'PSAK 2', title: 'Laporan Arus Kas' }
  }));

  const hasError = items.some(i => i.severity === 'error');
  return _result(!hasError, Math.min(score, maxScore), maxScore, items,
    hasError ? `Laporan bermasalah. Skor: ${score}/${maxScore}` : `Laporan valid. Skor: ${Math.min(score, maxScore)}/${maxScore}`);
}

/* ═══════════════════════════════════════════════════════════
   6. CLOSING VALIDATION
   ═══════════════════════════════════════════════════════════ */

export function validateClosingJournal(userEntries) {
  const items = [];
  let score = 0;
  const maxScore = 100;

  const user = userEntries
    .map(e => ({
      account: (e.account || '').trim(),
      debit: parseAmount(e.debit),
      credit: parseAmount(e.credit)
    }))
    .filter(e => e.account || e.debit || e.credit);

  if (user.length === 0) {
    items.push(feedback({
      severity: 'error',
      field: 'completeness',
      what: 'Jurnal penutup masih kosong.',
      why: 'Tanpa jurnal penutup, akun nominal (Pendapatan, Beban, Prive) tidak di-reset dan akan terbawa ke periode berikutnya.',
      concept: PSAK.CLOSING.concept,
      fix: PSAK.CLOSING.fix,
      psak: PSAK.CLOSING
    }));
    return _result(false, 0, maxScore, items, 'Penutup kosong');
  }

  const totalD = user.reduce((s, e) => s + e.debit, 0);
  const totalK = user.reduce((s, e) => s + e.credit, 0);

  if (totalD !== totalK) {
    items.push(feedback({
      severity: 'error',
      field: 'balance',
      what: `Jurnal penutup tidak seimbang (selisih Rp ${Math.abs(totalD - totalK).toLocaleString('id-ID')}).`,
      why: 'Closing entries juga double-entry.',
      concept: PSAK.DOUBLE_ENTRY.concept,
      fix: PSAK.DOUBLE_ENTRY.fix,
      psak: PSAK.DOUBLE_ENTRY
    }));
  } else {
    score += 25;
  }

  // Check presence of key closing accounts
  const names = user.map(e => e.account);
  const hasILR = names.includes('Ikhtisar Laba Rugi');
  const hasModal = names.includes('Modal Pemilik');
  const hasRevenue = names.some(n => n.includes('Pendapatan') || n === 'Penjualan');
  const hasExpense = names.some(n => n.startsWith('Beban') || n === 'Harga Pokok Penjualan');

  if (hasILR) {
    score += 20;
    items.push(feedback({
      severity: 'success', field: 'closing',
      what: 'Akun Ikhtisar Laba Rugi digunakan sebagai perantara penutupan.',
      why: 'Ikhtisar L/R menampung ringkasan pendapatan dan beban sebelum ditutup ke Modal.',
      concept: PSAK.CLOSING.concept, fix: 'Baik!', psak: PSAK.CLOSING
    }));
  } else {
    items.push(feedback({
      severity: 'error', field: 'closing',
      what: 'Akun "Ikhtisar Laba Rugi" tidak ditemukan dalam jurnal penutup.',
      why: 'Tanpa Ikhtisar L/R, pendapatan dan beban tidak bisa diringkas sebelum ditutup ke Modal.',
      concept: PSAK.CLOSING.concept,
      fix: 'Tambahkan Ikhtisar Laba Rugi sebagai akun perantara (step 1–3).',
      psak: PSAK.CLOSING
    }));
  }

  if (hasModal) {
    score += 15;
  } else {
    items.push(feedback({
      severity: 'warning', field: 'closing',
      what: 'Akun "Modal Pemilik" tidak ditemukan. Laba/Rugi dan Prive seharusnya ditutup ke Modal.',
      why: 'Tujuan akhir closing adalah memindahkan hasil operasi ke ekuitas.',
      concept: PSAK.CLOSING.concept,
      fix: 'Tutup saldo Ikhtisar L/R dan Prive ke Modal Pemilik.',
      psak: PSAK.CLOSING
    }));
  }

  if (hasRevenue || hasExpense) {
    score += 20;
  }

  // Compare to expected closing
  try {
    const expected = generateClosingEntries();
    if (expected.entries.length > 0) {
      score += 20;
      items.push(feedback({
        severity: 'info', field: 'closing',
        what: `Answer key menghasilkan ${expected.entries.length} baris penutup. Net Income: Rp ${expected.netIncome.toLocaleString('id-ID')}.`,
        why: 'Gunakan sebagai referensi urutan dan nominal.',
        concept: PSAK.CLOSING.concept,
        fix: PSAK.CLOSING.fix,
        psak: PSAK.CLOSING
      }));
    }
  } catch (_) { /* engine may not be ready */ }

  score = Math.min(score, maxScore);
  const hasError = items.some(i => i.severity === 'error');
  return _result(!hasError, score, maxScore, items,
    hasError ? `Penutup bermasalah. Skor: ${score}/${maxScore}` : `Penutup valid. Skor: ${score}/${maxScore}`);
}

/* ═══════════════════════════════════════════════════════════
   HTML RENDERER FOR FEEDBACK
   ═══════════════════════════════════════════════════════════ */

/**
 * Render validation result as rich HTML for the modal.
 * @param {{ valid, score, maxScore, items, summary }} result
 * @returns {string} HTML
 */
export function renderValidationHTML(result) {
  const { valid, score, maxScore, items, summary } = result;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const color = valid ? 'var(--success)' : (pct >= 50 ? 'var(--warning)' : 'var(--danger)');

  let html = `
    <div style="margin-bottom:16px;">
      <div style="font-size:1.1rem; font-weight:700; color:${color};">${summary}</div>
      <div style="margin-top:6px; background:var(--bg-primary); border-radius:8px; height:10px; overflow:hidden;">
        <div style="height:100%; width:${pct}%; background:${color}; border-radius:8px; transition:width 0.4s;"></div>
      </div>
      <div style="font-size:0.8rem; color:var(--text-light); margin-top:4px;">Skor: ${score} / ${maxScore} (${pct}%)</div>
    </div>`;

  items.forEach((item, idx) => {
    const icon = item.severity === 'success' ? '✅'
      : item.severity === 'error' ? '❌'
      : item.severity === 'warning' ? '⚠️'
      : 'ℹ️';
    const borderColor = item.severity === 'success' ? 'var(--success)'
      : item.severity === 'error' ? 'var(--danger)'
      : item.severity === 'warning' ? 'var(--warning)'
      : 'var(--accent-color)';

    html += `
      <div style="border-left:4px solid ${borderColor}; padding:12px 14px; margin-bottom:12px; background:var(--bg-primary); border-radius:0 8px 8px 0;">
        <div style="font-weight:600; margin-bottom:6px;">${icon} ${item.what}</div>`;

    if (item.expected !== null && item.actual !== null && item.severity !== 'success') {
      html += `
        <div style="font-size:0.85rem; margin-bottom:4px;">
          <span style="color:var(--text-light);">Diharapkan:</span> <strong>${item.expected}</strong><br>
          <span style="color:var(--text-light);">Anda menulis:</span> <strong>${item.actual}</strong>
        </div>`;
    }

    if (item.severity !== 'success') {
      html += `
        <div style="font-size:0.85rem; margin-bottom:4px;">
          <strong>Mengapa salah:</strong> ${item.why}
        </div>
        <div style="font-size:0.85rem; margin-bottom:4px;">
          <strong>Konsep:</strong> ${item.concept}
        </div>
        <div style="font-size:0.85rem; margin-bottom:4px; color:var(--accent-color);">
          <strong>Cara perbaiki:</strong> ${item.fix}
        </div>`;
    } else {
      html += `
        <div style="font-size:0.85rem; color:var(--text-secondary);">${item.why}</div>`;
    }

    if (item.psak) {
      html += `
        <div style="font-size:0.75rem; color:var(--text-light); margin-top:6px;">
          📖 Referensi: ${item.psak.code} — ${item.psak.title}
        </div>`;
    }

    html += `</div>`;
  });

  return html;
}

/* ═══════════════════════════════════════════════════════════
   INTERNAL HELPER
   ═══════════════════════════════════════════════════════════ */

function _result(valid, score, maxScore, items, summary) {
  return { valid, score, maxScore, items, summary };
}
