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
      firstOf[th] = await T.locator('#lq-editor .lq-q textarea').first().inputValue();
    }
    await expect(T.locator('#btn-start')).toBeEnabled(); await noOverflow(T, 'editor 20 soal');
    await expect(T.locator('#lq-errors')).toContainText('valid');

    // mulai → siswa harus melihat SOAL segera (bukan menunggu waktu habis)
    await T.click('#btn-start'); await expect(T.locator('#v-host .lq-question')).toBeVisible(); await noOverflow(T, 'guru: soal');
    await expect(S.locator('.lq-ans')).not.toHaveCount(0, { timeout: 4000 }); await expect(S.locator('#v-play')).not.toContainText('Memuat soal');
    await noOverflow(S, 'siswa: soal');
    await expect(S.locator('#v-play')).not.toContainText('Benar'); // kunci belum bocor
    await S.click('.lq-ans[data-i="0"]');
    await expect(S.locator('.lq-result.is-ok, .lq-result.is-no')).toBeVisible({ timeout: 8000 }); // semua sudah menjawab → reveal otomatis
    await expect(S.locator('#v-play')).toContainText('Papan peringkat'); await noOverflow(S, 'siswa: reveal'); await noOverflow(T, 'guru: reveal');
    await expect(T.locator('#v-host .lq-ans.is-right')).toHaveCount(1);

    // soal berikutnya, lalu akhiri → hasil akhir
    await T.locator('#v-host .lq-btn--primary', { hasText: /berikutnya/i }).click();
    await expect(S.locator('#v-play')).toContainText('Soal 2 /'); await expect(S.locator('.lq-ans').first()).toBeEnabled();
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
