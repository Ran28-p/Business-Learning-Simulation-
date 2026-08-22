/**
 * AI Tutor – Pedagogical Explanation Engine
 * ============================================================
 * When a student makes a mistake, the tutor explains:
 *   • What they chose vs what is correct
 *   • Why the chosen account / side is wrong
 *   • The underlying accounting concept
 *   • Correct journal example
 *   • Memory tips
 *   • PSAK reference
 *
 * Tone: patient accounting lecturer (dosen akuntansi).
 * Language: Indonesian.
 */

import { getAccounts, getExpectedJournal, getLoadedTransactions } from '../accounting/engine.js';
import { parseAmount } from '../utils/formatters.js';

/* ═══════════════════════════════════════════════════════════
   KNOWLEDGE BASE – account nature & teaching tips
   ═══════════════════════════════════════════════════════════ */

const ACCOUNT_NATURE = {
  'Kas': {
    type: 'Aset', normal: 'D',
    tip: 'Kas adalah uang tunai. Bertambah di Debit, berkurang di Kredit. Ingat: "Kas masuk = Debit, Kas keluar = Kredit".'
  },
  'Piutang Usaha': {
    type: 'Aset', normal: 'D',
    tip: 'Piutang = hak menagih. Bertambah saat jual kredit (Debit), berkurang saat pelanggan bayar (Kredit).'
  },
  'Perlengkapan': {
    type: 'Aset', normal: 'D',
    tip: 'Perlengkapan dicatat sebagai Aset saat dibeli. Saat terpakai, pindahkan ke Beban Perlengkapan lewat jurnal penyesuaian.'
  },
  'Sewa Dibayar Dimuka': {
    type: 'Aset', normal: 'D',
    tip: 'Sewa dibayar di muka = aset (manfaat belum dinikmati). Setiap bulan, alihkan sebagian ke Beban Sewa.'
  },
  'Asuransi Dibayar Dimuka': {
    type: 'Aset', normal: 'D',
    tip: 'Sama seperti sewa dibayar di muka: aset di awal, menjadi beban secara bertahap.'
  },
  'Peralatan': {
    type: 'Aset', normal: 'D',
    tip: 'Peralatan dicatat sebesar harga perolehan. Penyusutan dicatat terpisah lewat Akumulasi Penyusutan.'
  },
  'Kendaraan': {
    type: 'Aset', normal: 'D',
    tip: 'Kendaraan adalah aset tetap. Jangan langsung dibebankan — susutkan secara berkala.'
  },
  'Akumulasi Penyusutan Peralatan': {
    type: 'Kontra-Aset', normal: 'K',
    tip: 'Akumulasi Penyusutan mengurangi nilai buku aset. Bertambah di Kredit setiap periode.'
  },
  'Utang Usaha': {
    type: 'Kewajiban', normal: 'K',
    tip: 'Utang Usaha = kewajiban ke supplier. Bertambah di Kredit (saat beli kredit), berkurang di Debit (saat bayar).'
  },
  'Pendapatan Diterima Dimuka': {
    type: 'Kewajiban', normal: 'K',
    tip: 'Uang muka dari pelanggan = kewajiban (jasa belum diberikan). Saat jasa selesai, pindahkan ke Pendapatan.'
  },
  'Utang Gaji': {
    type: 'Kewajiban', normal: 'K',
    tip: 'Gaji yang sudah menjadi beban tetapi belum dibayar → Utang Gaji (akrual).'
  },
  'Modal Pemilik': {
    type: 'Ekuitas', normal: 'K',
    tip: 'Modal bertambah di Kredit (setor modal / laba), berkurang di Debit (prive / rugi).'
  },
  'Prive': {
    type: 'Ekuitas', normal: 'D',
    tip: 'Prive = pengambilan pribadi pemilik. Debit Prive, Kredit Kas. Di akhir periode ditutup ke Modal.'
  },
  'Ikhtisar Laba Rugi': {
    type: 'Ekuitas', normal: 'K',
    tip: 'Akun perantara penutupan. Tampung pendapatan (Kredit) dan beban (Debit), lalu saldo ditutup ke Modal.'
  },
  'Pendapatan Jasa': {
    type: 'Pendapatan', normal: 'K',
    tip: 'Pendapatan selalu bertambah di Kredit. Saat tutup buku, Debit Pendapatan → Kredit Ikhtisar L/R.'
  },
  'Penjualan': {
    type: 'Pendapatan', normal: 'K',
    tip: 'Penjualan = pendapatan usaha dagang. Bertambah di Kredit.'
  },
  'Beban Gaji': {
    type: 'Beban', normal: 'D',
    tip: 'Semua beban bertambah di Debit. Ingat: "Beban = Debit".'
  },
  'Beban Sewa': {
    type: 'Beban', normal: 'D',
    tip: 'Sewa yang sudah dinikmati = beban. Jika bayar di muka, jangan langsung Beban Sewa — gunakan Sewa Dibayar Dimuka dulu.'
  },
  'Beban Perlengkapan': {
    type: 'Beban', normal: 'D',
    tip: 'Muncul di jurnal penyesuaian: Debit Beban Perlengkapan, Kredit Perlengkapan (yang terpakai).'
  },
  'Beban Penyusutan': {
    type: 'Beban', normal: 'D',
    tip: 'Debit Beban Penyusutan, Kredit Akumulasi Penyusutan. Tidak menyentuh akun aset secara langsung.'
  },
  'Beban Utilitas': {
    type: 'Beban', normal: 'D',
    tip: 'Listrik, air, internet = beban operasional. Debit Beban Utilitas, Kredit Kas.'
  },
  'Beban Asuransi': {
    type: 'Beban', normal: 'D',
    tip: 'Bagian asuransi yang sudah berlalu = beban. Alirkan dari Asuransi Dibayar Dimuka.'
  },
  'Pembelian': {
    type: 'Beban', normal: 'D',
    tip: 'Dalam sistem periodik, Pembelian dicatat di Debit saat beli barang dagangan.'
  },
  'Harga Pokok Penjualan': {
    type: 'Beban', normal: 'D',
    tip: 'HPP = biaya barang yang terjual. Debit HPP, Kredit Persediaan (sistem perpetual).'
  }
};

const PSAK_REFS = {
  double_entry: {
    code: 'Kerangka Konseptual SAK',
    title: 'Sistem Pencatatan Berpasangan',
    text: 'Setiap transaksi dicatat pada minimal dua akun dengan total Debit = total Kredit.'
  },
  expense: {
    code: 'Kerangka Konseptual SAK',
    title: 'Definisi Beban',
    text: 'Beban adalah penurunan manfaat ekonomi selama periode pelaporan yang mengakibatkan penurunan ekuitas (selain distribusi ke pemilik).'
  },
  revenue: {
    code: 'PSAK 72',
    title: 'Pendapatan dari Kontrak dengan Pelanggan',
    text: 'Pendapatan diakui saat (atau selama) entitas memenuhi kewajiban pelaksanaan dengan mengalihkan barang/jasa yang dijanjikan.'
  },
  asset: {
    code: 'Kerangka Konseptual SAK',
    title: 'Definisi Aset',
    text: 'Aset adalah sumber daya ekonomi saat ini yang dikendalikan oleh entitas sebagai akibat peristiwa masa lalu.'
  },
  liability: {
    code: 'Kerangka Konseptual SAK',
    title: 'Definisi Kewajiban',
    text: 'Kewajiban adalah kewajiban saat ini untuk menyerahkan sumber daya ekonomi sebagai akibat peristiwa masa lalu.'
  },
  accrual: {
    code: 'PSAK 1',
    title: 'Dasar Akrual',
    text: 'Entitas menyusun laporan keuangan atas dasar akrual (kecuali arus kas). Transaksi diakui saat terjadi, bukan saat kas diterima/dibayar.'
  },
  prepaid: {
    code: 'Kerangka Konseptual SAK & PSAK 1',
    title: 'Deferral (Beban/Pendapatan Ditangguhkan)',
    text: 'Pembayaran di muka dicatat sebagai aset; pengakuan beban dilakukan secara proporsional seiring berlalunya waktu/manfaat.'
  },
  depreciation: {
    code: 'PSAK 16',
    title: 'Aset Tetap – Penyusutan',
    text: 'Penyusutan adalah alokasi sistematis jumlah tersusutkan suatu aset selama umur manfaatnya.'
  },
  closing: {
    code: 'Praktik Akuntansi Umum',
    title: 'Jurnal Penutup',
    text: 'Akun nominal ditutup ke ekuitas di akhir periode agar saldo kembali nol di awal periode berikutnya.'
  },
  measurement: {
    code: 'PSAK 1 & Kerangka Konseptual',
    title: 'Pengukuran',
    text: 'Unsur laporan keuangan diukur pada biaya historis, nilai wajar, atau dasar pengukuran lain yang relevan.'
  }
};

/* ═══════════════════════════════════════════════════════════
   TUTOR – MAIN ENTRY
   ═══════════════════════════════════════════════════════════ */

/**
 * Generate tutor explanations from a validation result.
 * @param {object} validationResult – from validationEngine
 * @param {Array}  userEntries      – user's journal lines
 * @returns {{ lessons: Array, summary: string }}
 */
export function generateTutorLessons(validationResult, userEntries = []) {
  const items = (validationResult.items || []).filter(i => i.severity === 'error' || i.severity === 'warning');
  const expected = getExpectedJournal();
  const transactions = getLoadedTransactions();
  const lessons = [];
  const seen = new Set(); // dedupe by title+account key

  // Classic mistake patterns (rule-based teaching, independent of full answer key)
  _detectClassicMistakes(userEntries, transactions).forEach(l => {
    if (!l) return;
    const key = l.type + '|' + l.title;
    if (!seen.has(key)) { seen.add(key); lessons.push(l); }
  });

  function addLesson(lesson) {
    if (!lesson) return;
    const key = lesson.type + '|' + (lesson.title || '') + '|' + (lesson.explanation || '').slice(0, 40);
    if (seen.has(key)) return;
    seen.add(key);
    lessons.push(lesson);
  }

  // Prioritise: balance first, then side, then account (max 2), then amount (max 2)
  const balanceErr = items.find(i => i.field === 'balance');
  if (balanceErr) addLesson(_lessonWrongAmount(balanceErr, expected, userEntries));

  const sideErrors = items.filter(i => i.field === 'debit_credit').slice(0, 2);
  sideErrors.forEach(err => addLesson(_lessonWrongSide(err, expected, userEntries)));

  // For account errors: pick the most instructive ones (wrong account chosen, not every missing)
  const wrongChosen = items.filter(i =>
    (i.field === 'account' || i.field === 'completeness') &&
    i.actual && i.actual !== '(tidak ada)' && i.expected !== '(tidak ada dalam answer key)'
  ).slice(0, 2);
  wrongChosen.forEach(err => addLesson(_lessonWrongAccount(err, expected, userEntries, transactions)));

  // Missing accounts – one combined lesson instead of many
  const missing = items.filter(i =>
    i.field === 'completeness' && i.actual === '(tidak ada)'
  );
  if (missing.length > 0 && wrongChosen.length === 0) {
    const names = missing.map(m => m.expected).filter(Boolean).slice(0, 5);
    addLesson({
      type: 'account',
      title: 'Kelengkapan Jurnal',
      explanation: `Jurnal Anda belum mencantumkan akun berikut: <strong>${names.join(', ')}</strong>. ` +
        `Setiap akun yang terpengaruh transaksi wajib dicatat. Tanpa akun-akun ini, jurnal tidak mencerminkan substansi ekonomi transaksi secara lengkap.`,
      concept: PSAK_REFS.double_entry.text,
      correctExample: null,
      tip: 'Baca deskripsi transaksi, identifikasi minimal 2 akun yang berubah, lalu tentukan Debit dan Kredit masing-masing.',
      psak: { code: PSAK_REFS.double_entry.code, title: PSAK_REFS.double_entry.title }
    });
  }

  const amountErrors = items.filter(i => i.field === 'amount').slice(0, 2);
  amountErrors.forEach(err => addLesson(_lessonWrongAmount(err, expected, userEntries)));

  // Other (order, date) – max 1
  const other = items.find(i => ['order', 'date'].includes(i.field));
  if (other) addLesson(_lessonGeneric(other));

  if (lessons.length === 0 && !validationResult.valid) {
    addLesson(_lessonGeneric(items[0] || {
      what: 'Ada ketidaksesuaian dengan answer key.',
      why: 'Periksa kembali setiap baris jurnal.',
      concept: PSAK_REFS.double_entry.text,
      fix: 'Bandingkan dengan contoh jurnal yang benar di bawah.',
      psak: PSAK_REFS.double_entry
    }));
  }

  // Always append correct journal example
  if (expected.length > 0) {
    addLesson(_lessonCorrectExample(expected, transactions));
  }

  const errorCount = items.filter(i => i.severity === 'error').length;
  const summary = errorCount === 0
    ? 'Bagus sekali! Jurnal Anda sudah sesuai prinsip akuntansi.'
    : `Dosen menemukan beberapa poin yang perlu diperbaiki. Mari kita bahas bersama.`;

  return { lessons: lessons.filter(Boolean), summary };
}

/* ═══════════════════════════════════════════════════════════
   LESSON BUILDERS
   ═══════════════════════════════════════════════════════════ */


function _detectClassicMistakes(userEntries, transactions) {
  const lessons = [];
  if (!userEntries || !userEntries.length) return lessons;

  const accounts = userEntries.map(e => e.account);
  const hasUtang = accounts.includes('Utang Usaha');
  const hasKasKredit = userEntries.some(e => e.account === 'Kas' && (Number(e.credit) || 0) > 0);
  const hasKasDebit = userEntries.some(e => e.account === 'Kas' && (Number(e.debit) || 0) > 0);
  const hasBeban = accounts.some(a => a && a.startsWith('Beban'));
  const hasPendapatan = accounts.some(a => a && (a.includes('Pendapatan') || a === 'Penjualan'));
  const desc = (transactions || []).map(t => t.deskripsi || '').join(' ').toLowerCase();

  // Mistake: using Utang Usaha when paying cash expense (sewa, gaji, utilitas)
  if (hasUtang && hasKasKredit && !hasBeban) {
    const isSewa = desc.includes('sewa');
    const isGaji = desc.includes('gaji');
    const isUtil = desc.includes('listrik') || desc.includes('utilitas') || desc.includes('internet');
    let correctAcc = 'Beban Utilitas';
    let why = 'beban operasional';
    if (isSewa) { correctAcc = 'Sewa Dibayar Dimuka atau Beban Sewa'; why = 'pembayaran sewa'; }
    else if (isGaji) { correctAcc = 'Beban Gaji'; why = 'pembayaran gaji karyawan'; }
    else if (isUtil) { correctAcc = 'Beban Utilitas'; why = 'pembayaran utilitas'; }

    lessons.push({
      type: 'account',
      title: 'Pemilihan Akun — Utang Usaha vs Beban',
      explanation:
        `Anda memilih akun <strong>Utang Usaha</strong>. ` +
        `Transaksi ini merupakan <em>${why}</em>. ` +
        `Utang Usaha digunakan ketika perusahaan <em>berutang kepada supplier</em> (membeli secara kredit), bukan ketika membayar beban secara tunai. ` +
        `Karena ini pengorbanan manfaat ekonomi periode berjalan (atau pembayaran di muka), akun yang tepat adalah <strong>${correctAcc}</strong>. ` +
        `Kas berkurang sehingga di-<strong>Kredit</strong>.`,
      concept: PSAK_REFS.expense.text,
      correctExample: null,
      tip: 'Tanya diri: "Apakah saya berutang ke seseorang?" Jika tidak — dan uang keluar untuk operasional — gunakan akun Beban (atau Aset dibayar di muka), bukan Utang Usaha.',
      psak: { code: PSAK_REFS.expense.code, title: PSAK_REFS.expense.title }
    });
  }

  // Mistake: debiting revenue account
  if (hasPendapatan) {
    const revLine = userEntries.find(e => e.account && (e.account.includes('Pendapatan') || e.account === 'Penjualan') && (Number(e.debit) || 0) > 0);
    if (revLine) {
      lessons.push({
        type: 'side',
        title: 'Posisi Debit/Kredit — Pendapatan',
        explanation:
          `Anda mendebit akun <strong>${revLine.account}</strong>. ` +
          `Pendapatan memiliki saldo normal <strong>Kredit</strong>. Saat pendapatan bertambah, kita <em>mengkredit</em> akun pendapatan — bukan mendebit. ` +
          `Debit pada akun pendapatan justru mengurangi pendapatan (misalnya untuk retur atau penutup).`,
        concept: PSAK_REFS.revenue.text,
        correctExample: null,
        tip: 'Hafalkan: "Pendapatan = Kredit". Satu-satunya saat Debit pendapatan adalah saat menutup buku atau mencatat retur.',
        psak: { code: PSAK_REFS.revenue.code, title: PSAK_REFS.revenue.title }
      });
    }
  }

  // Mistake: crediting expense
  if (hasBeban) {
    const expLine = userEntries.find(e => e.account && e.account.startsWith('Beban') && (Number(e.credit) || 0) > 0);
    if (expLine) {
      lessons.push({
        type: 'side',
        title: 'Posisi Debit/Kredit — Beban',
        explanation:
          `Anda mengkredit akun <strong>${expLine.account}</strong>. ` +
          `Beban memiliki saldo normal <strong>Debit</strong>. Saat beban bertambah, kita <em>mendebit</em> akun beban. ` +
          `Kredit pada beban hanya terjadi saat jurnal penutup (menutup beban ke Ikhtisar Laba Rugi).`,
        concept: PSAK_REFS.expense.text,
        correctExample: null,
        tip: 'Hafalkan: "Beban = Debit". Bayangkan beban sebagai "pengurang laba" yang menumpuk di sisi Debit.',
        psak: { code: PSAK_REFS.expense.code, title: PSAK_REFS.expense.title }
      });
    }
  }

  // Mistake: both sides on same row already handled by validation

  return lessons;
}

function _lessonWrongAccount(err, expected, userEntries, transactions) {
  const wrongAccount = err.actual && err.actual !== '(tidak ada)' ? err.actual : _guessWrongAccount(userEntries, expected);
  const correctAccount = err.expected && err.expected !== '(tidak ada dalam answer key)' ? err.expected : null;

  const nature = ACCOUNT_NATURE[wrongAccount] || null;
  const correctNature = correctAccount ? (ACCOUNT_NATURE[correctAccount] || null) : null;

  // Detect transaction context for richer explanation
  const ctx = _inferTransactionContext(transactions, expected);

  let explanation = '';

  if (wrongAccount && correctAccount && wrongAccount !== correctAccount) {
    explanation = `Anda memilih akun <strong>${wrongAccount}</strong>. `;

    if (ctx.kind === 'prepaid_rent' || (correctAccount === 'Sewa Dibayar Dimuka')) {
      explanation += `Transaksi ini merupakan <em>pembayaran sewa di muka</em> untuk periode mendatang. `;
      explanation += `Karena manfaat sewa belum dinikmati seluruhnya, pembayaran dicatat sebagai <strong>aset</strong> (Sewa Dibayar Dimuka), bukan langsung sebagai Beban Sewa. `;
      explanation += `Beban Sewa baru diakui kemudian melalui jurnal penyesuaian, seiring berlalunya waktu.`;
    } else if (ctx.kind === 'expense' || (correctNature && correctNature.type === 'Beban')) {
      explanation += `Transaksi ini merupakan <em>beban operasional</em>. `;
      explanation += `Karena bersifat pengorbanan manfaat ekonomi periode berjalan, akun yang tepat adalah <strong>${correctAccount}</strong> (Beban), bukan ${wrongAccount}. `;
      if (wrongAccount === 'Utang Usaha') {
        explanation += `Utang Usaha digunakan saat kita <em>berutang kepada supplier</em> (beli kredit), bukan saat membayar beban tunai.`;
      }
    } else if (ctx.kind === 'revenue' || (correctNature && correctNature.type === 'Pendapatan')) {
      explanation += `Transaksi ini menghasilkan <em>pendapatan</em>. `;
      explanation += `Pendapatan dicatat dengan mengkredit akun <strong>${correctAccount}</strong>. `;
      explanation += `Jangan mencatat pendapatan ke akun aset atau kewajiban kecuali ada uang muka (Pendapatan Diterima Dimuka).`;
    } else if (correctAccount === 'Utang Usaha') {
      explanation += `Transaksi ini menimbulkan <em>kewajiban</em> kepada pihak lain (pembelian kredit). `;
      explanation += `Akun yang tepat adalah <strong>Utang Usaha</strong>, yang bertambah di sisi Kredit.`;
    } else if (correctAccount === 'Kas' || wrongAccount === 'Kas') {
      explanation += `Pergerakan uang tunai selalu melibatkan akun <strong>Kas</strong>. `;
      explanation += `Kas masuk → Debit Kas; Kas keluar → Kredit Kas.`;
    } else {
      explanation += `Untuk transaksi ini, akun yang benar adalah <strong>${correctAccount}</strong>`;
      if (correctNature) explanation += ` (jenis: ${correctNature.type}, saldo normal: ${correctNature.normal === 'D' ? 'Debit' : 'Kredit'})`;
      explanation += `.`;
    }
  } else if (correctAccount && err.actual === '(tidak ada)') {
    explanation = `Akun <strong>${correctAccount}</strong> seharusnya ada dalam jurnal, tetapi tidak Anda cantumkan. `;
    explanation += `Setiap akun yang terpengaruh transaksi wajib dicatat agar jurnal lengkap dan seimbang.`;
  } else if (wrongAccount && err.expected === '(tidak ada dalam answer key)') {
    explanation = `Akun <strong>${wrongAccount}</strong> tidak terkait dengan transaksi ini. `;
    explanation += `Menambahkan akun yang tidak relevan membuat pencatatan menyimpang dari substansi ekonomi transaksi.`;
  } else {
    explanation = err.what || 'Pemilihan akun perlu ditinjau ulang.';
  }

  const psak = _pickPsak(correctNature || nature, ctx);
  const tip = (correctNature && correctNature.tip) || (nature && nature.tip) ||
    'Tentukan dulu: apakah transaksi ini memengaruhi Aset, Kewajiban, Ekuitas, Pendapatan, atau Beban? Baru pilih akunnya.';

  return {
    type: 'account',
    title: 'Pemilihan Akun',
    explanation,
    concept: psak.text,
    correctExample: correctAccount
      ? _formatSingleEntry(correctAccount, expected)
      : null,
    tip,
    psak: { code: psak.code, title: psak.title }
  };
}

function _lessonWrongSide(err, expected, userEntries) {
  const account = _extractAccountFromMessage(err.what) || err.actual || '';
  const nature = ACCOUNT_NATURE[account] || _lookupFromChart(account);
  const shouldBeDebit = err.expected && String(err.expected).includes('Debit');

  let explanation = '';
  if (account) {
    explanation = `Untuk akun <strong>${account}</strong>, Anda menempatkannya di sisi yang salah. `;
    if (nature) {
      explanation += `Akun ini berjenis <em>${nature.type}</em> dengan saldo normal <strong>${nature.normal === 'D' ? 'Debit' : 'Kredit'}</strong>. `;
      if (shouldBeDebit) {
        explanation += `Karena akun ini bertambah (atau baru muncul), nominal harus di sisi <strong>Debit</strong>. `;
        if (nature.type === 'Aset' || nature.type === 'Beban') {
          explanation += `${nature.type} bertambah di Debit — ini aturan fundamental yang perlu dihafal.`;
        }
      } else {
        explanation += `Karena akun ini bertambah, nominal harus di sisi <strong>Kredit</strong>. `;
        if (nature.type === 'Kewajiban' || nature.type === 'Ekuitas' || nature.type === 'Pendapatan') {
          explanation += `${nature.type} bertambah di Kredit.`;
        }
      }
    } else {
      explanation += shouldBeDebit
        ? 'Nominal seharusnya di sisi Debit.'
        : 'Nominal seharusnya di sisi Kredit.';
    }

    // Cash-specific teaching
    if (account === 'Kas') {
      explanation += shouldBeDebit
        ? ' Kas bertambah (uang masuk) → Debit Kas.'
        : ' Kas berkurang (uang keluar) → Kredit Kas.';
    }
  } else {
    explanation = err.what || 'Posisi Debit/Kredit perlu diperbaiki.';
  }

  const tip = nature
    ? nature.tip
    : 'Hafalkan: Aset & Beban = Debit; Kewajiban, Ekuitas & Pendapatan = Kredit. Lalu terapkan: bertambah di sisi normal, berkurang di sisi lawan.';

  return {
    type: 'side',
    title: 'Posisi Debit / Kredit',
    explanation,
    concept: 'Aturan saldo normal: Aset dan Beban bertambah di Debit; Kewajiban, Ekuitas, dan Pendapatan bertambah di Kredit.',
    correctExample: account ? _formatSingleEntry(account, expected) : null,
    tip,
    psak: { code: PSAK_REFS.double_entry.code, title: PSAK_REFS.double_entry.title }
  };
}

function _lessonWrongAmount(err, expected, userEntries) {
  let explanation = err.what || 'Nominal tidak sesuai.';
  if (err.expected && err.actual) {
    explanation = `Nominal yang Anda tulis (<strong>${err.actual}</strong>) berbeda dari yang seharusnya (<strong>${err.expected}</strong>). `;
    explanation += `Bacalah deskripsi transaksi dengan teliti — angka biasanya disebutkan secara eksplisit. `;
    explanation += `Jika transaksi melibatkan sebagian pembayaran (misalnya DP + kredit), pastikan Anda memecah nominal dengan benar.`;
  }
  if (err.field === 'balance') {
    explanation = `Jurnal Anda tidak seimbang. ${err.what} `;
    explanation += `Dalam sistem berpasangan, total Debit <em>harus</em> sama dengan total Kredit. `;
    explanation += `Selisih menandakan ada akun yang terlewat atau nominal yang salah ketik.`;
  }

  return {
    type: 'amount',
    title: 'Nominal / Keseimbangan',
    explanation,
    concept: PSAK_REFS.measurement.text,
    correctExample: expected.length ? _formatFullJournal(expected) : null,
    tip: 'Setelah menulis jurnal, selalu jumlahkan kolom Debit dan Kredit. Jika belum sama, cari selisihnya — biasanya itu nominal yang terlewat atau salah ketik.',
    psak: { code: PSAK_REFS.measurement.code, title: PSAK_REFS.measurement.title }
  };
}

function _lessonGeneric(err) {
  if (!err) return null;
  return {
    type: 'general',
    title: err.field === 'order' ? 'Urutan Jurnal' : 'Catatan Dosen',
    explanation: err.what + (err.why ? ' ' + err.why : ''),
    concept: err.concept || PSAK_REFS.double_entry.text,
    correctExample: null,
    tip: err.fix || 'Tinjau kembali konsep dasar double-entry dan coba lagi.',
    psak: err.psak || { code: PSAK_REFS.double_entry.code, title: PSAK_REFS.double_entry.title }
  };
}

function _lessonCorrectExample(expected, transactions) {
  const txDesc = transactions.length
    ? transactions.map(t => `• ${t.tanggal}: ${t.deskripsi}`).join('<br>')
    : '';

  return {
    type: 'example',
    title: 'Contoh Jurnal yang Benar',
    explanation: txDesc
      ? `Berdasarkan transaksi berikut:<br>${txDesc}<br><br>Jurnal yang benar adalah:`
      : 'Jurnal yang benar berdasarkan answer key:',
    concept: PSAK_REFS.double_entry.text,
    correctExample: _formatFullJournal(expected),
    tip: 'Bandingkan baris demi baris dengan jurnal Anda. Perhatikan nama akun, sisi Debit/Kredit, dan nominalnya.',
    psak: { code: PSAK_REFS.double_entry.code, title: PSAK_REFS.double_entry.title }
  };
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function _formatFullJournal(lines) {
  if (!lines || !lines.length) return null;
  let html = '<table style="width:100%; font-size:0.85rem; border-collapse:collapse; margin-top:6px;">';
  html += '<tr style="background:var(--bg-primary);"><th style="padding:6px; text-align:left;">Akun</th><th style="padding:6px; text-align:right;">Debit</th><th style="padding:6px; text-align:right;">Kredit</th></tr>';
  lines.forEach(l => {
    const name = l.account || l.a || '';
    const d = l.debit || l.d || 0;
    const k = l.credit || l.k || 0;
    const indent = k > 0 && d === 0 ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '';
    html += `<tr>
      <td style="padding:4px 6px; border-bottom:1px solid var(--border-color);">${indent}${name}</td>
      <td style="padding:4px 6px; text-align:right; border-bottom:1px solid var(--border-color);">${d ? 'Rp ' + Number(d).toLocaleString('id-ID') : ''}</td>
      <td style="padding:4px 6px; text-align:right; border-bottom:1px solid var(--border-color);">${k ? 'Rp ' + Number(k).toLocaleString('id-ID') : ''}</td>
    </tr>`;
  });
  const totD = lines.reduce((s, l) => s + (l.debit || l.d || 0), 0);
  const totK = lines.reduce((s, l) => s + (l.credit || l.k || 0), 0);
  html += `<tr style="font-weight:700;"><td style="padding:6px;">Total</td>
    <td style="padding:6px; text-align:right;">Rp ${totD.toLocaleString('id-ID')}</td>
    <td style="padding:6px; text-align:right;">Rp ${totK.toLocaleString('id-ID')}</td></tr>`;
  html += '</table>';
  return html;
}

function _formatSingleEntry(account, expected) {
  const line = expected.find(l => (l.account || l.a) === account);
  if (!line) return `<em>${account}</em> (lihat contoh jurnal lengkap)`;
  const d = line.debit || line.d || 0;
  const k = line.credit || line.k || 0;
  if (d > 0) return `<strong>${account}</strong> &nbsp; Debit Rp ${d.toLocaleString('id-ID')}`;
  return `<strong>${account}</strong> &nbsp; Kredit Rp ${k.toLocaleString('id-ID')}`;
}

function _guessWrongAccount(userEntries, expected) {
  const expNames = new Set(expected.map(l => l.account || l.a));
  const extra = userEntries.find(e => e.account && !expNames.has(e.account));
  return extra ? extra.account : (userEntries[0]?.account || '');
}

function _extractAccountFromMessage(msg) {
  if (!msg) return '';
  const m = msg.match(/akun "([^"]+)"/i) || msg.match(/Akun "([^"]+)"/);
  return m ? m[1] : '';
}

function _lookupFromChart(name) {
  const chart = getAccounts();
  const acc = chart.find(a => a.name === name);
  if (!acc) return null;
  return { type: acc.type, normal: acc.normal, tip: ACCOUNT_NATURE[name]?.tip || '' };
}

function _inferTransactionContext(transactions, expected) {
  const allDesc = transactions.map(t => t.deskripsi || '').join(' ').toLowerCase();
  const expAccounts = expected.map(l => (l.account || l.a || '')).join(' ');

  if (allDesc.includes('sewa') && expAccounts.includes('Sewa Dibayar Dimuka')) {
    return { kind: 'prepaid_rent' };
  }
  if (allDesc.includes('sewa') || expAccounts.includes('Beban Sewa')) {
    return { kind: 'expense' };
  }
  if (allDesc.includes('gaji') || allDesc.includes('utilitas') || allDesc.includes('listrik')) {
    return { kind: 'expense' };
  }
  if (allDesc.includes('pendapatan') || allDesc.includes('jasa') || allDesc.includes('desain') || allDesc.includes('konsultasi')) {
    return { kind: 'revenue' };
  }
  if (allDesc.includes('utang') || allDesc.includes('kredit')) {
    return { kind: 'liability' };
  }
  if (allDesc.includes('modal') || allDesc.includes('setoran')) {
    return { kind: 'capital' };
  }
  return { kind: 'general' };
}

function _pickPsak(nature, ctx) {
  if (ctx.kind === 'prepaid_rent') return PSAK_REFS.prepaid;
  if (ctx.kind === 'expense' || (nature && nature.type === 'Beban')) return PSAK_REFS.expense;
  if (ctx.kind === 'revenue' || (nature && nature.type === 'Pendapatan')) return PSAK_REFS.revenue;
  if (nature && nature.type === 'Aset') return PSAK_REFS.asset;
  if (nature && nature.type === 'Kewajiban') return PSAK_REFS.liability;
  if (nature && nature.type === 'Kontra-Aset') return PSAK_REFS.depreciation;
  return PSAK_REFS.double_entry;
}

/* ═══════════════════════════════════════════════════════════
   HTML RENDERER – Tutor style
   ═══════════════════════════════════════════════════════════ */

/**
 * Render tutor lessons as HTML (dosen style).
 * @param {{ lessons, summary }} tutorResult
 * @returns {string}
 */
export function renderTutorHTML(tutorResult) {
  const { lessons, summary } = tutorResult;

  let html = `
    <div style="background:var(--accent-light); border-radius:10px; padding:14px 16px; margin-bottom:16px;">
      <div style="font-weight:700; font-size:1rem; margin-bottom:4px;">🎓 Penjelasan Dosen</div>
      <div style="font-size:0.9rem;">${summary}</div>
    </div>`;

  lessons.forEach((lesson, idx) => {
    const isExample = lesson.type === 'example';
    html += `
      <div style="border:1px solid var(--border-color); border-radius:10px; padding:16px; margin-bottom:14px; background:var(--bg-secondary);">
        <div style="font-weight:700; font-size:0.95rem; color:var(--accent-color); margin-bottom:8px;">
          ${isExample ? '✅' : '📌'} ${lesson.title}
        </div>
        <div style="font-size:0.9rem; line-height:1.6; margin-bottom:10px;">
          ${lesson.explanation}
        </div>`;

    if (lesson.correctExample) {
      html += `
        <div style="background:var(--bg-primary); border-radius:8px; padding:10px 12px; margin-bottom:10px;">
          <div style="font-size:0.8rem; font-weight:600; margin-bottom:4px; color:var(--success);">Jurnal yang benar:</div>
          ${lesson.correctExample}
        </div>`;
    }

    if (lesson.concept) {
      html += `
        <div style="font-size:0.85rem; margin-bottom:8px;">
          <strong>Konsep:</strong> ${lesson.concept}
        </div>`;
    }

    if (lesson.tip) {
      html += `
        <div style="font-size:0.85rem; background:var(--bg-primary); border-left:3px solid var(--warning); padding:8px 12px; border-radius:0 6px 6px 0; margin-bottom:8px;">
          💡 <strong>Tips mengingat:</strong> ${lesson.tip}
        </div>`;
    }

    if (lesson.psak) {
      html += `
        <div style="font-size:0.75rem; color:var(--text-light);">
          📖 Referensi: ${lesson.psak.code} — ${lesson.psak.title}
        </div>`;
    }

    html += `</div>`;
  });

  return html;
}
