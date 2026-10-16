// E2E poin 6: materi "Penggajian & PPh 21 (TER)" di Generator Excel — dari antarmuka sampai berkas .xlsx yang diunduh,
// dan bab 11 di Modul Pengetahuan. (Kebenaran ANGKA diuji di tests/test-payroll-ter.mjs terhadap tabel & contoh resmi DJP.)
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/** Pembaca ZIP minimal (cukup untuk .xlsx): nama berkas → Buffer. Memakai direktori pusat sehingga aman untuk zip streaming. */
function readZip(buf) {
  const files = new Map();
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32), lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const data = buf.subarray(start, start + csize);
    files.set(name, method === 8 ? inflateRawSync(data) : data);
    p += 46 + nlen + elen + clen;
  }
  return files;
}
const text = (files, name) => (files.get(name) || Buffer.alloc(0)).toString('utf8');
const allSheets = (files) => [...files.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).map((n) => text(files, n)).join('\n');

async function download(page, trigger) {
  const [dl] = await Promise.all([page.waitForEvent('download'), trigger()]);
  return { name: dl.suggestedFilename(), files: readZip(readFileSync(await dl.path())) };
}
async function openExcel(page) {
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/apps/excel/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  return errors;
}

test.describe('Generator Excel: materi Penggajian & PPh 21 (TER)', () => {
  test('opsi materi tersedia di antarmuka', async ({ page }) => {
    await openExcel(page);
    await expect(page.locator('#egMateri option[value="penggajian"]')).toHaveText('Penggajian & PPh 21 (TER)');
  });

  const LEVELS = {
    beginner: { masters: [], mustContain: ['IF(OR(', 'LEFT(', 'VALUE('], mustNot: ['VLOOKUP(', 'XLOOKUP(', 'SUMIFS('] },
    professional: { masters: ['PTKP Setahun', 'Batas Bawah', 'Batas Atas', 'Tarif TER'], mustContain: ['VLOOKUP(', 'SUMIFS(', 'ROUNDDOWN('], mustNot: ['XLOOKUP('] },
    expert: { masters: ['PTKP Setahun', 'Batas Bawah', 'Batas Atas', 'Tarif TER', 'Selisih Tarif', 'Batas Bawah PKP'], mustContain: ['XLOOKUP(', 'IFERROR(', 'SUMIFS(', 'SUMPRODUCT(', 'ROUNDDOWN('], mustNot: [] },
  };
  for (const [level, spec] of Object.entries(LEVELS)) {
    test(`${level}: workbook latihan diunduh dengan sheet, tabel referensi, dan rumus yang sesuai kontrak level`, async ({ page }) => {
      const errors = await openExcel(page);
      await page.selectOption('#egLevel', level);
      await page.selectOption('#egMateri', 'penggajian');
      const { name, files } = await download(page, () => page.locator('#btnGenerateExerciseXlsx').click());
      expect(name).toMatch(/\.xlsx$/);
      const wb = text(files, 'xl/workbook.xml');
      for (const sheet of ['Lembar latihan', 'dataset', 'kunci jawaban', 'Penjelasan Rumus']) expect(wb).toContain(`name="${sheet}"`);
      const strings = text(files, 'xl/sharedStrings.xml');
      expect(strings).toContain('PENGGAJIAN &amp; PPh 21 (TER)');
      for (const m of spec.masters) expect(strings, `header tabel referensi ${m}`).toContain(m);
      if (level === 'beginner') { expect(strings).not.toContain('Batas Bawah'); expect(strings).not.toContain('PTKP Setahun Referensi'); }
      expect(strings).toContain('Premi Asuransi Dibayar Perusahaan');
      const sheets = allSheets(files).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      for (const f of spec.mustContain) expect(sheets, `rumus ${f}`).toContain(f);
      for (const f of spec.mustNot) expect(sheets, `tidak boleh ${f}`).not.toContain(f);
      expect(errors).toEqual([]);
    });
  }

  test('expert: tabel TER lengkap (125 lapisan) ada di sheet dataset dan Pasal 17 punya kolom Selisih Tarif', async ({ page }) => {
    await openExcel(page);
    await page.selectOption('#egLevel', 'expert'); await page.selectOption('#egMateri', 'penggajian');
    const { files } = await download(page, () => page.locator('#btnGenerateExerciseXlsx').click());
    const strings = text(files, 'xl/sharedStrings.xml');
    for (const h of ['Batas Bawah', 'Batas Atas', 'Tarif TER', 'Selisih Tarif', 'Batas Bawah PKP']) expect(strings).toContain(h);
    const ds = allSheets(files);
    expect((ds.match(/0\.0025/g) || []).length).toBeGreaterThanOrEqual(3);         // tarif 0,25% muncul di kategori A, B, dan C
    expect(ds).toContain('999999999999');                                           // lapisan terakhir "tanpa batas"
    expect(ds).toContain('0.34');                                                   // tarif tertinggi TER
  });

  test('dataset mentah saja: ketiga tabel referensi ikut terekspor', async ({ page }) => {
    await openExcel(page);
    await page.selectOption('#egMateri', 'penggajian');
    const { name, files } = await download(page, () => page.locator('#btnGenerateDatasetXlsx').click());
    expect(name).toBe('dataset-penggajian.xlsx');
    const strings = text(files, 'xl/sharedStrings.xml');
    for (const t of ['Status PTKP', 'Kategori TER', 'Tarif TER', 'Selisih Tarif']) expect(strings).toContain(t);
  });

  test('semua level × beberapa kali bangkit: tanpa error halaman', async ({ page }) => {
    const errors = await openExcel(page);
    await page.selectOption('#egMateri', 'penggajian');
    for (const level of ['beginner', 'professional', 'expert', 'expert']) {
      await page.selectOption('#egLevel', level);
      const { files } = await download(page, () => page.locator('#btnGenerateExerciseXlsx').click());
      expect(files.size).toBeGreaterThan(5);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('Modul Pengetahuan Excel: bab 11', () => {
  test('bab 11 tampil di daftar isi, memuat contoh resmi, dan sumbernya tertaut', async ({ page }) => {
    await openExcel(page);
    await page.getByText('Modul Pengetahuan').first().click();
    await page.waitForSelector('.kb-titlepage h1');
    const toc = page.locator('.kb-sidebar, .kb-toc, nav').filter({ hasText: 'Daftar Isi' }).first();
    await expect(toc).toContainText('11. Penggajian & PPh 21 (TER)');
    await page.getByText('11. Penggajian & PPh 21 (TER)').first().click();
    const body = page.locator('.kb-panel');
    await expect(body).toContainText('11.4 Perhitungan Desember langkah demi langkah');
    await expect(body).toContainText('Rp515.000');                       // contoh resmi DJP (Tuan R)
    await expect(body).toContainText('Rp3.910.400');                     // contoh resmi DJP (Tuan A)
    await expect(body).toContainText('(23.750)');                        // hasil Desember negatif pada simulasi resmi
    await expect(body).toContainText('PTKP sedang dibahas');            // catatan regulasi yang sedang berubah
    const links = await body.locator('a[href^="https://pajak.go.id/"]').count();
    expect(links).toBeGreaterThan(0);                                    // sumber resmi tertaut
  });
});
