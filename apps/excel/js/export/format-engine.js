/**
 * format-engine.js
 * ---------------------------------------------------------------------------
 * Dua fungsi reusable inti (Bagian 21 & 22 spesifikasi redesign):
 *   - getExcelNumberFormat(fieldSemantic) → kode format angka Excel yang tepat
 *   - calculateColumnWidth(values, options) → lebar kolom berbasis konten,
 *     bukan lebar seragam untuk semua kolom.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  /**
   * Menebak "semantik" satu kolom dari nama header + columnType dataset
   * (columnType dari dataset-generator.js hanya 'text'|'date'|'number' —
   * fungsi ini memperhalusnya jadi kategori yang lebih spesifik untuk
   * keperluan format & lebar kolom).
   * @returns {'id'|'date'|'currency'|'percentage'|'integer'|'decimal'|'category'|'text-long'|'text-medium'}
   */
  function inferColumnSemantic(header, columnType, sampleValues) {
    const h = (header || '').toLowerCase();
    if (columnType === 'date') return 'date';
    if (columnType === 'number') {
      const looksLikeCurrency = /harga|total|dpp|pajak|ppn|gaji|nilai|biaya|omzet|revenue|debit|kredit|saldo|bunga|premi|tunjangan|potongan|upah|komisi|cicilan|iuran|insentif|thr|denda/.test(h);
      if (looksLikeCurrency) return 'currency';
      // Cek persentase SETELAH currency, dan hanya bila header benar-benar
      // menunjukkan kolom itu sendiri adalah persentase (mis. "Diskon (%)"),
      // bukan sekadar menyebut sebuah tarif di dalam nama pos (mis. "Pajak (PPN 11%)").
      if (/persen|%|diskon|margin|growth|pertumbuhan/.test(h) && !/pajak|ppn|pph|tarif \d/.test(h)) return 'percentage';
      if (/qty|jumlah|stok|masuk|keluar|unit|umur|usia|lama|durasi|jml/.test(h)) return 'integer';
      return 'decimal';
    }
    // text
    if (/^id\b|^kode\b| id$| kode$/.test(h)) return 'id';
    if (/kategori|status|wilayah|region|departemen|divisi|jenis|tipe|gender|golongan/.test(h)) return 'category';
    if (/deskripsi|keterangan|catatan|alamat|instruksi/.test(h)) return 'text-long';
    return 'text-medium';
  }

  /**
   * getExcelNumberFormat — kode format Excel untuk satu semantik kolom.
   * @param {{semantic: string}} columnDefinition
   * @returns {string} numFmt Excel, atau 'General' bila tidak relevan.
   */
  function getExcelNumberFormat(columnDefinition) {
    const semantic = (columnDefinition && columnDefinition.semantic) || 'text-medium';
    switch (semantic) {
      case 'date': return 'dd/mm/yyyy';
      case 'currency': return '"Rp" #,##0';
      case 'percentage': return '0.00"%"'; // nilai disimpan sebagai angka biasa (mis. 11), bukan pecahan 0.11
      case 'integer': return '#,##0';
      case 'decimal': return '#,##0.00';
      default: return 'General';
    }
  }

  /**
   * calculateColumnWidth — lebar kolom Excel berbasis konten & semantik.
   * @param {Array<any>} values - seluruh nilai pada kolom (tanpa header)
   * @param {{header?: string, semantic?: string, min?: number, max?: number}} options
   * @returns {number} lebar kolom dalam satuan karakter Excel
   */
  function calculateColumnWidth(values, options = {}) {
    const header = options.header || '';
    const semantic = options.semantic || 'text-medium';

    const SEMANTIC_MIN = {
      id: 12, date: 13, currency: 16, percentage: 12, integer: 10,
      decimal: 14, category: 16, 'text-long': 32, 'text-medium': 18,
    };
    const min = options.min ?? SEMANTIC_MIN[semantic] ?? 12;
    const max = options.max ?? (semantic === 'text-long' ? 55 : 40);

    const longestValueLen = (values || []).reduce((max_, v) => {
      if (v === null || v === undefined) return max_;
      const s = semantic === 'currency' || semantic === 'integer' || semantic === 'decimal'
        ? Number(v).toLocaleString('id-ID')
        : String(v);
      return Math.max(max_, s.length);
    }, 0);

    const headerLen = header.length;
    const contentBasedWidth = Math.max(longestValueLen, headerLen) + 2.5; // padding
    return Math.round(Math.min(max, Math.max(min, contentBasedWidth)) * 10) / 10;
  }

  window.WorkbookExport = window.WorkbookExport || {};
  window.WorkbookExport.inferColumnSemantic = inferColumnSemantic;
  window.WorkbookExport.getExcelNumberFormat = getExcelNumberFormat;
  window.WorkbookExport.calculateColumnWidth = calculateColumnWidth;
})();
