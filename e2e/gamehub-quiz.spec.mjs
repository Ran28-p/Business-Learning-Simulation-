// Kuis Langsung (apps/game-hub) di browser nyata: guru & siswa = dua halaman dalam SATU konteks (mode lokal, localStorage + event storage).
// Menjaga dua regresi yang hanya tampak di browser asli: (1) header meluap di layar HP, (2) layar siswa macet di "Memuat soal…".
import { test, expect } from '@playwright/test';

const HUB = '/apps/game-hub/index.html';
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const noOverflow = async (page, label) => expect(await overflow(page), 'scroll horizontal di ' + label).toBeLessThanOrEqual(1);

for (const [vpName, vp] of [['mobile', { width: 390, height: 844 }], ['mobile-kecil', { width: 320, height: 700 }], ['desktop', { width: 1280, height: 800 }]]) {
  test(`Kuis Langsung: alur guru + siswa utuh tanpa overflow · ${vpName}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'block' });
    const T = await ctx.newPage(), S = await ctx.newPage(), errors = [];
    for (const p of [T, S]) { p.on('pageerror', (e) => errors.push(e.message)); p.on('dialog', (d) => d.accept()); }

    await T.goto(HUB); await noOverflow(T, 'awal (guru)');
    await expect(T.locator('link[rel="icon"]')).toHaveAttribute('href', '../spt/icons/favicon-32.png');
    await expect(T.locator('#btn-role-teacher')).toBeVisible(); await expect(T.locator('#btn-role-student')).toBeVisible();
    await T.check('#chk-local'); await T.click('#btn-role-teacher');
    await expect(T.locator('#v-setup')).toBeVisible(); await noOverflow(T, 'atur kuis kosong');
    const code = (await T.locator('#lq-roomcode').innerText()).trim(); expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    await expect(T.locator('.lq-theme')).toHaveCount(5);

    // siswa masuk SELAMA guru mengatur
    await S.goto(HUB); await S.check('#chk-local'); await S.click('#btn-role-student'); await noOverflow(S, 'form masuk');
    await S.fill('#in-code', code.toLowerCase()); await S.fill('#in-name', 'Ani'); await S.click('#btn-join');
    await expect(S.locator('#v-play')).toContainText(/menunggu guru/i); await noOverflow(S, 'lobi siswa');
    await expect(T.locator('#lq-count')).toHaveText('1');

    // tema → 20 soal otomatis, tiap tema berbeda isi
    const firstOf = {};
    for (const th of ['pajak', 'akuntansi', 'excel', 'sqlpq']) {
      await T.click(`[data-theme-id="${th}"]`);
      await expect(T.locator('#lq-editor .lq-q')).toHaveCount(20); await expect(T.locator(`[data-theme-id="${th}"]`)).toHaveAttribute('aria-checked', 'true');
      if (th === 'sqlpq') await expect(T.locator('#lq-editor .lq-q textarea[aria-label^="Pertanyaan"]').first()).not.toHaveValue(firstOf.excel);
      firstOf[th] = await T.locator('#lq-editor .lq-q textarea[aria-label^="Pertanyaan"]').first().inputValue();
    }
    await expect(T.locator('#btn-start')).toBeEnabled(); await noOverflow(T, 'editor 20 soal');
    await expect(T.locator('#lq-errors')).toContainText('valid');
    const tableQuestion = 'Tabel jual(kategori, wilayah, jumlah): (Alat, Bali, 90) (Alat, Jawa, 40) (Cat, Jawa, 90) (Alat, Riau, 70) (Buku, Riau, 60) (Cat, Riau, 20). Hasil query: SELECT kategori FROM jual GROUP BY kategori ORDER BY SUM(jumlah) DESC LIMIT 1 ?';
    const joinQuestion = 'Tabel p(id_pelanggan, nama): (1, Ani) (2, Budi) (3, Cici) (4, Dedi). Tabel o(id_pelanggan, nomor_pesanan): (3, 1) (4, 2) (5, 3) (1, 4) (5, 5) (1, 6). Catatan: id_pelanggan 5 tidak terdapat di tabel p. Hasil: SELECT COUNT(*) FROM p LEFT JOIN o ON o.id_pelanggan = p.id_pelanggan ?';
    await T.locator('#lq-editor .lq-q textarea[aria-label^="Pertanyaan"]').nth(0).fill(tableQuestion);
    await T.locator('#lq-editor .lq-q textarea[aria-label^="Pertanyaan"]').nth(1).fill(joinQuestion);
    await expect(T.locator('#lq-editor .lq-q').nth(0).locator('.lq-table tbody tr')).toHaveCount(6);
    await expect(T.locator('#lq-editor .lq-q').nth(1).locator('.lq-table')).toHaveCount(2);
    await T.locator('#lq-editor .lq-q textarea[aria-label^="Pertanyaan"]').nth(0).fill('Pertanyaan teks biasa.');
    await expect(T.locator('#lq-editor .lq-q').nth(0).locator('.lq-table')).toHaveCount(0);
    await T.locator('#lq-editor .lq-q textarea[aria-label^="Pertanyaan"]').nth(0).fill(tableQuestion);

    // mulai → siswa harus melihat SOAL segera (bukan menunggu waktu habis)
    await T.click('#btn-start'); await expect(T.locator('#v-host .lq-question')).toBeVisible(); await noOverflow(T, 'guru: soal');
    expect(await T.locator('#v-host .lq-question').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(22);
    expect(await T.locator('#v-host .lq-ans').first().evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(64);
    expect(await T.locator('#v-host .lq-timer').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(26);
    await expect(T.locator('#v-host .lq-table thead th')).toHaveText(['kategori', 'wilayah', 'jumlah']);
    await expect(T.locator('#v-host .lq-table tbody tr')).toHaveCount(6);
    await expect(S.locator('.lq-ans')).not.toHaveCount(0, { timeout: 4000 }); await expect(S.locator('#v-play')).not.toContainText('Memuat soal');
    await expect(S.locator('#v-play .lq-table tbody tr')).toHaveCount(6);
    await noOverflow(S, 'siswa: soal');
    await expect(S.locator('#v-play')).not.toContainText('Benar'); // kunci belum bocor
    await S.click('.lq-ans[data-i="0"]');
    await expect(S.locator('.lq-result.is-ok, .lq-result.is-no')).toBeVisible({ timeout: 8000 }); // semua sudah menjawab → reveal otomatis
    await expect(S.locator('#v-play')).toContainText('Papan peringkat'); await noOverflow(S, 'siswa: reveal'); await noOverflow(T, 'guru: reveal');
    await expect(T.locator('#v-host .lq-ans.is-right')).toHaveCount(1);

    // soal berikutnya, lalu akhiri → hasil akhir
    await T.locator('#v-host .lq-btn--primary', { hasText: /berikutnya/i }).click();
    await expect(S.locator('#v-play')).toContainText('Soal 2 /'); await expect(S.locator('.lq-ans').first()).toBeEnabled();
    await expect(T.locator('#v-host .lq-table')).toHaveCount(2);
    await expect(T.locator('#v-host .lq-table caption')).toHaveText(['Tabel p', 'Tabel o']);
    await expect(T.locator('#v-host .lq-table').nth(0).locator('thead th')).toHaveText(['id_pelanggan', 'nama']);
    await expect(T.locator('#v-host .lq-table').nth(1).locator('thead th')).toHaveText(['id_pelanggan', 'nomor_pesanan']);
    await expect(T.locator('#v-host .lq-table').nth(0).locator('tbody tr')).toHaveCount(4);
    await expect(T.locator('#v-host .lq-table').nth(1).locator('tbody tr')).toHaveCount(6);
    await expect(S.locator('#v-play .lq-table')).toHaveCount(2);
    await T.locator('#v-host .lq-btn--ghost', { hasText: /Akhiri/ }).click();
    await expect(T.locator('#v-host')).toContainText('Hasil akhir'); await expect(S.locator('#v-play')).toContainText('Kuis selesai');
    await noOverflow(T, 'hasil akhir guru'); await noOverflow(S, 'hasil akhir siswa');
    expect(errors, 'error JavaScript').toEqual([]);
    await ctx.close();
  });
}

test('Kuis Langsung: kode salah & nama kosong ditolak dengan pesan jelas', async ({ page }) => {
  await page.goto(HUB); await page.check('#chk-local'); await page.click('#btn-role-student');
  await page.fill('#in-code', 'ZZZZZZ'); await page.fill('#in-name', 'Budi'); await page.click('#btn-join');
  await expect(page.locator('#lq-banner')).toContainText(/tidak ditemukan/i);
  await page.fill('#in-code', 'ABC234'); await page.fill('#in-name', '   '); await page.click('#btn-join');
  await expect(page.locator('#lq-banner')).toContainText(/nama/i);
});

for (const [route, label] of [[HUB, 'utama']]) {
  test(`Kuis esai: penilaian otomatis dan kunci baru terlihat setelah reveal · ${label}`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const T = await ctx.newPage(), S = await ctx.newPage(), errors = [];
    for (const p of [T, S]) { p.on('pageerror', (e) => errors.push(e.message)); p.on('dialog', (d) => d.accept()); }
    await T.goto(route); await T.check('#chk-local'); await T.click('#btn-role-teacher');
    await expect(T.locator('#v-setup')).toBeVisible();
    await T.click('[data-theme-id="pajak"]'); await expect(T.locator('#lq-editor .lq-q')).toHaveCount(20);
    await T.check('input[name="quiz-mode"][value="essay"]');
    await expect(T.locator('#lq-editor .lq-q')).toHaveCount(5);
    await expect(T.locator('#lq-mode-note')).toBeVisible();
    await T.locator('#in-count').fill('1'); await T.locator('#in-count').press('Tab');
    await expect(T.locator('#lq-editor .lq-q')).toHaveCount(1);
    const modelQuestion = await T.locator('#lq-editor textarea[aria-label^="Pertanyaan"]').inputValue();
    const modelAnswer = await T.locator('#lq-editor textarea[aria-label^="Contoh jawaban"]').inputValue();
    await T.waitForTimeout(1000);
    await expect(T.locator('#lq-editor textarea[aria-label^="Pertanyaan"]')).toHaveValue(modelQuestion);
    await expect(T.locator('#lq-editor textarea[aria-label^="Contoh jawaban"]')).toHaveValue(modelAnswer);

    await S.goto(route); await S.check('#chk-local'); await S.click('#btn-role-student');
    const code = (await T.locator('#lq-roomcode').innerText()).trim();
    await S.fill('#in-code', code); await S.fill('#in-name', 'Esai'); await S.click('#btn-join');
    await expect(T.locator('#lq-editor textarea[aria-label^="Pertanyaan"]')).toHaveValue(modelQuestion);
    await T.click('#btn-start');
    await expect(T.locator('#v-host .lq-question')).toContainText(modelQuestion);
    await expect(S.locator('#v-play .lq-essay-text')).toBeVisible();
    await expect(S.locator('#v-play')).not.toContainText(modelAnswer);
    await S.fill('#v-play .lq-essay-text', modelAnswer); await S.locator('#v-play button', { hasText: 'Kirim jawaban' }).click();
    await expect(T.locator('#v-host .lq-essay-submission')).toContainText(modelAnswer);
    await expect(S.locator('#v-play .lq-result')).toContainText(/1[.]?000 \/ 1000 poin/, { timeout: 8000 });
    await expect(S.locator('#v-play .lq-essay-key')).toHaveText(modelAnswer);
    await expect(T.locator('#v-host .lq-essay-score')).toContainText('1000 poin');
    await expect(T.locator('#v-host .lq-essay-submission')).toContainText(modelAnswer);
    await noOverflow(T, 'editor esai ' + label); await noOverflow(S, 'jawaban esai ' + label);
    expect(errors, 'error JavaScript').toEqual([]);
    await ctx.close();
  });
}
