// E2E poin 5: Analitik belajar (portal) + rekap untuk pengajar + Ruang Pengajar (apps/pengajar).
import { test, expect } from '@playwright/test';
import { makeFakeDb, installFake } from './fake-firebase.mjs';
import { readFileSync } from 'node:fs';

const db = makeFakeDb();
test.beforeEach(() => db.reset());

const SEED = {
  'efpg:progress': { xp: 90, soalDikerjakan: 12, jawabanBenar: 7, levelAktif: 1, riwayat: [], rumusDipelajari: { IF: { dikerjakan: 4, benar: 1 }, COUNTIF: { dikerjakan: 3, benar: 2 }, SUM: { dikerjakan: 5, benar: 5 }, VLOOKUP: { dikerjakan: 1, benar: 0 } } },
  sqlpq_progress_v1: { xp: 300, totalAnswered: 20, totalCorrect: 16, completedLessons: {}, history: [], wrongAttempts: { groupAgg: 4, where: 2, join: 1 } },
  ACT_MASTER_PROGRESS: { attemptCount: 6, correctCount: 3, totalScore: 300, errorCount: 3, history: [], componentScores: { side: [30, 20, 40], account: [40, 50, 45], posting: [95, 90, 99] } },
  // data sensitif yang TIDAK boleh ikut rekap
  ACT_MASTER_TAX_STATE: { company: { name: 'PT RAHASIA ABADI', npwp: '99.999.999.9-999.999', address: 'Jl. Pribadi 1' } },
  spt_simulator_data: { xp: 10, level: 1, history: [], email: 'rahasia-spt@contoh.id', displayName: 'Nama Asli SPT' },
};
const seedScript = (data) => ([d]) => { if (sessionStorage.getItem('__seed')) return; sessionStorage.setItem('__seed', '1'); for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); };

async function portalPage(browser, { seed = {}, user = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', acceptDownloads: true });
  await installFake(ctx, db);                                   // Firebase tiruan: sesi login nyata bisa ada tanpa jaringan
  await ctx.addInitScript(seedScript(), [seed]);
  if (user) await ctx.addInitScript(([u]) => { if (sessionStorage.getItem('__u')) return; sessionStorage.setItem('__u', '1');
    localStorage.setItem('__fake_fb_user', JSON.stringify(u)); localStorage.setItem('unified_portal_session', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.displayName, isGuest: false })); }, [user]);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700);
  return { ctx, page, errors };
}
const recFile = (o) => ({ format: 'portal-belajar-rekap', version: 1, createdAt: new Date().toISOString(), participant: { name: 'X' }, modules: [], weak: [], hub: null, ...o });
const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
const mod = (id, xp, act, score, lastDays, started = true) => ({ id, xp, level: 1, activities: act, scorePct: score, started, lastActive: lastDays === null ? null : day(lastDays) });
const asFile = (name, obj) => ({ name, mimeType: 'application/json', buffer: Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)) });

test.describe('Analitik belajar (portal)', () => {
  test('pengguna baru: keadaan kosong yang jujur, tanpa saran palsu', async ({ browser }) => {
    const { ctx, page } = await portalPage(browser);
    await expect(page.locator('#analyticsEmpty')).toBeVisible();
    await expect(page.locator('#recList li')).toHaveCount(0);
    await expect(page.locator('#recMore')).toBeHidden();
    await ctx.close();
  });

  test('data nyata → saran terurut, beralasan angka, bertaut ke modul; data sedikit ditandai', async ({ browser }) => {
    const { ctx, page, errors } = await portalPage(browser, { seed: SEED });
    const items = page.locator('#recList .rec-item');
    expect(await items.count()).toBeGreaterThanOrEqual(3); expect(await items.count()).toBeLessThanOrEqual(5);
    await expect(items.first()).toContainText('GROUP BY + fungsi agregat');          // prioritas tertinggi (4× salah)
    await expect(items.first()).toContainText('4 kali salah');
    await expect(page.locator('#recList')).toContainText('Fungsi IF');
    await expect(page.locator('#recList')).toContainText('1 dari 4 soal benar (25%)');
    await expect(page.locator('#recList')).toContainText('Sisi debit/kredit');
    await page.locator('#recMore summary').click();
    await expect(page.locator('#analyticsModules')).toContainText('Fungsi VLOOKUP — 0 dari 1 soal benar (0%) (data masih sedikit)');
    await expect(page.locator('#analyticsModules')).toContainText('Fungsi SUM');                // kekuatan
    await expect(page.locator('#analyticsModules')).toContainText('Posting ke buku besar');
    await items.first().locator('a.rec-item__go').click();
    await expect(page).toHaveURL(/\/apps\/sql-pq\/index\.html$/);
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('rekap: nama wajib; unduhan hanya memuat agregat (tanpa data perusahaan/NPWP/email SPT)', async ({ browser }) => {
    const { ctx, page } = await portalPage(browser, { seed: SEED });
    await page.locator('#btnRecap').click();
    await expect(page.locator('#recapError')).toBeVisible();                                    // tamu tanpa nama
    await page.locator('#recapName').fill('  Budi   Santoso ');
    await page.locator('.recap-preview summary').click();
    const preview = await page.locator('#recapPreview').innerText();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#btnRecap').click()]);
    expect(dl.suggestedFilename()).toMatch(/^rekap-belajar-budi-santoso-\d{4}-\d{2}-\d{2}\.json$/);
    const text = readFileSync(await dl.path(), 'utf8'); const rec = JSON.parse(text);
    expect(rec.format).toBe('portal-belajar-rekap'); expect(rec.version).toBe(1);
    expect(rec.participant).toEqual({ name: 'Budi Santoso' });
    for (const secret of ['PT RAHASIA ABADI', '99.999.999.9-999.999', 'Jl. Pribadi 1', 'rahasia-spt@contoh.id', 'Nama Asli SPT']) expect(text).not.toContain(secret);
    expect(rec.modules.map((m) => m.id).sort()).toEqual(['accounting', 'excel', 'spt', 'sqlpq']);
    expect(rec.modules.find((m) => m.id === 'sqlpq').xp).toBe(300);
    expect(rec.weak.some((w) => w.label === 'Fungsi IF')).toBe(true);
    expect(rec.weak.every((w) => !/VLOOKUP/.test(w.label))).toBe(true);                         // tentatif tidak ikut
    expect(JSON.parse(preview).participant.name).toBe('Budi Santoso');                           // yang dipratinjau = yang diunduh
    expect(JSON.parse(preview).modules).toEqual(rec.modules);
    await ctx.close();
  });

  test('email hanya ikut bila dipilih (login nyata via Firebase tiruan)', async ({ browser }) => {
    const { ctx, page } = await portalPage(browser, { seed: SEED, user: { uid: 'u1', email: 'siti@contoh.id', displayName: 'Siti' } });
    await expect(page.locator('#recapName')).toHaveValue('Siti');
    await expect(page.locator('#recapEmail')).toBeEnabled();
    await expect(page.locator('#recapEmailShow')).toHaveText('siti@contoh.id');
    const get = async () => { const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#btnRecap').click()]); return JSON.parse(readFileSync(await dl.path(), 'utf8')); };
    expect((await get()).participant.email).toBeUndefined();
    await page.locator('#recapEmail').check();
    expect((await get()).participant.email).toBe('siti@contoh.id');
    await ctx.close();
  });
});

test.describe('Ruang Pengajar', () => {
  async function room(browser, viewport = { width: 1280, height: 900 }) {
    const ctx = await browser.newContext({ viewport, acceptDownloads: true, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const reqs = []; page.on('request', (r) => reqs.push({ url: r.url(), method: r.method() }));
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/apps/pengajar/index.html', { waitUntil: 'domcontentloaded' });
    return { ctx, page, reqs, errors };
  }
  const COHORT = [
    asFile('ani.json', recFile({ participant: { name: 'Ani Wijaya' }, modules: [mod('excel', 200, 20, 90, 1), mod('sqlpq', 100, 10, 70, 2)], weak: [{ moduleId: 'excel', label: 'Fungsi IF', detail: 'x', priority: 84 }], hub: { level: 3, totalXp: 300, streak: 2 } })),
    asFile('budi.json', recFile({ participant: { name: 'Budi Santoso' }, modules: [mod('excel', 50, 10, 40, 3), mod('accounting', 30, 5, 50, 4)], weak: [{ moduleId: 'excel', label: 'Fungsi IF', detail: 'x', priority: 90 }, { moduleId: 'accounting', label: 'Sisi debit/kredit', detail: 'x', priority: 70 }] })),
    asFile('citra.json', recFile({ participant: { name: 'Citra Dewi' }, modules: [mod('sqlpq', 400, 40, 95, 6)], weak: [{ moduleId: 'sqlpq', label: 'GROUP BY', detail: 'x', priority: 88 }] })),
    asFile('dewi.json', recFile({ participant: { name: 'Dewi Lestari' }, modules: [mod('spt', 20, 6, 80, 12)] })),
  ];

  test('memuat banyak berkas: ringkasan, topik tersulit, tabel; berkas buruk ditolak dengan alasan', async ({ browser }) => {
    const { ctx, page, errors } = await room(browser);
    await expect(page.locator('#tr-results')).toBeHidden();
    await page.setInputFiles('#tr-file', [...COHORT, asFile('rusak.json', '{bukan json'), asFile('lain.json', { format: 'lain' }),
      { name: 'besar.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(recFile({ pad: 'x'.repeat(120000) }))) }]);
    await expect(page.locator('#tr-status')).toContainText('4 berkas rekap diterima');
    await expect(page.locator('#tr-status')).toContainText('3 berkas ditolak');
    await expect(page.locator('#tr-rejected')).toContainText('rusak.json — bukan JSON yang valid');
    await expect(page.locator('#tr-rejected')).toContainText('lain.json — bukan berkas rekap Portal Belajar');
    await expect(page.locator('#tr-rejected')).toContainText('besar.json — berkas terlalu besar');
    await expect(page.locator('#tr-cards')).toContainText('4'); await expect(page.locator('#tr-cards')).toContainText('peserta');
    await expect(page.locator('#tr-weak li').first()).toContainText('Fungsi IF');
    await expect(page.locator('#tr-weak li').first()).toContainText('2 peserta');
    await expect(page.locator('#tr-body tr')).toHaveCount(4);
    await expect(page.locator('#tr-body tr', { hasText: 'Budi Santoso' })).toContainText('Perlu perhatian');
    await expect(page.locator('#tr-body tr', { hasText: 'Dewi Lestari' })).toContainText('Tidak aktif');
    await expect(page.locator('#tr-body tr', { hasText: 'Ani Wijaya' })).toContainText('Aktif');
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('unggahan ulang peserta yang sama: rekap terbaru menang', async ({ browser }) => {
    const { ctx, page } = await room(browser);
    await page.setInputFiles('#tr-file', [asFile('lama.json', recFile({ createdAt: day(5), participant: { name: 'Ani' }, modules: [mod('excel', 10, 1, 50, 5)] }))]);
    await expect(page.locator('#tr-body tr')).toContainText('10');
    await page.setInputFiles('#tr-file', [asFile('baru.json', recFile({ createdAt: day(0), participant: { name: 'ani' }, modules: [mod('excel', 999, 30, 80, 0)] }))]);
    await expect(page.locator('#tr-status')).toContainText('1 rekap lama digantikan');
    await expect(page.locator('#tr-body tr')).toHaveCount(1);
    await expect(page.locator('#tr-body tr')).toContainText('999');
    await ctx.close();
  });

  test('urut, filter, cari', async ({ browser }) => {
    const { ctx, page } = await room(browser);
    await page.setInputFiles('#tr-file', COHORT);
    const names = () => page.locator('#tr-body tr td:first-child').allInnerTexts();
    expect((await names())[0]).toContain('Ani Wijaya');                                          // awal: nama A→Z
    await page.locator('.tr-sort[data-sort="totalXp"]').click();                               // pertama: terbesar dulu
    expect((await names())[0]).toContain('Citra Dewi');
    await expect(page.locator('th[aria-sort]')).toHaveAttribute('aria-sort', 'descending');
    await page.locator('.tr-sort[data-sort="totalXp"]').click();                               // kedua: terkecil dulu
    expect((await names())[0]).toContain('Dewi Lestari');
    await expect(page.locator('th[aria-sort]')).toHaveAttribute('aria-sort', 'ascending');
    await page.locator('#tr-filter button[data-filter="struggling"]').click();
    await expect(page.locator('#tr-body tr')).toHaveCount(1); await expect(page.locator('#tr-body tr')).toContainText('Budi Santoso');
    await expect(page.locator('#tr-filter button[data-filter="struggling"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#tr-filter button[data-filter="all"]').click();
    await page.locator('#tr-search').fill('cit');
    await expect(page.locator('#tr-body tr')).toHaveCount(1); await expect(page.locator('#tr-body tr')).toContainText('Citra');
    await page.locator('#tr-search').fill('zzz');
    await expect(page.locator('#tr-body')).toContainText('Tidak ada peserta yang cocok');
    await ctx.close();
  });

  test('nama berbahaya hanya tampil sebagai teks; CSV menetralkan rumus', async ({ browser }) => {
    const { ctx, page, errors } = await room(browser);
    await page.setInputFiles('#tr-file', [
      asFile('xss.json', recFile({ participant: { name: '<img src=x onerror="window.__pwned=1">' }, modules: [mod('excel', 5, 1, 50, 1)] })),
      asFile('csv.json', recFile({ participant: { name: '=HYPERLINK("http://jahat","klik")' }, modules: [mod('excel', 7, 1, 50, 1)], weak: [{ moduleId: 'excel', label: '+evil', detail: 'd', priority: 1 }] })),
      asFile('extra.json', recFile({ participant: { name: 'Normal', role: 'dosen', isAdmin: true }, modules: [mod('excel', 9, 1, 50, 1)], __proto__: { admin: 1 } })),
    ]);
    await expect(page.locator('#tr-body tr')).toHaveCount(3);
    await expect(page.locator('#tr-body img')).toHaveCount(0);
    await expect(page.locator('#tr-body')).toContainText('<img src=x onerror="window.__pwned=1">');
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#tr-csv').click()]);
    expect(dl.suggestedFilename()).toMatch(/^rekap-kelompok-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = readFileSync(await dl.path(), 'utf8');
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain(`"'=HYPERLINK(""http://jahat"",""klik"")"`);
    expect(csv).toContain(`"'+evil`);
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(4);
    expect(csv).not.toContain('dosen');
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('privasi: tidak ada permintaan jaringan selain berkas statis, tidak ada POST, tidak ada penyimpanan', async ({ browser }) => {
    const { ctx, page, reqs } = await room(browser);
    await page.setInputFiles('#tr-file', COHORT);
    await expect(page.locator('#tr-body tr')).toHaveCount(4);
    await page.locator('#tr-csv').click().catch(() => {});
    expect(reqs.filter((r) => !/^http:\/\/127\.0\.0\.1/.test(r.url) && !r.url.startsWith('blob:') && !r.url.startsWith('data:'))).toEqual([]);
    expect(reqs.filter((r) => r.method !== 'GET')).toEqual([]);
    const stored = await page.evaluate(() => JSON.stringify({ l: Object.keys(localStorage), s: Object.keys(sessionStorage) }));
    expect(stored).not.toMatch(/Ani|Budi|Citra|Dewi|rekap/i);                                   // data peserta tidak disimpan
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#tr-results')).toBeHidden();                                      // hilang saat dimuat ulang
    await ctx.close();
  });

  test('hapus data: hasil hilang dari halaman', async ({ browser }) => {
    const { ctx, page } = await room(browser);
    await page.setInputFiles('#tr-file', COHORT);
    await expect(page.locator('#tr-results')).toBeVisible();
    await page.locator('#tr-clear').click();
    await expect(page.locator('#tr-results')).toBeHidden(); await expect(page.locator('#tr-status')).toHaveText('');
    await ctx.close();
  });

  test('mobile: tanpa scroll horizontal halaman; tabel menggulir di dalam pembungkusnya', async ({ browser }) => {
    const { ctx, page } = await room(browser, { width: 390, height: 844 });
    await page.setInputFiles('#tr-file', COHORT);
    await expect(page.locator('#tr-body tr')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.locator('#tr-table').locator('xpath=..').evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
    await ctx.close();
  });

  test('alur utuh: rekap diunduh dari portal → dimuat di Ruang Pengajar', async ({ browser }) => {
    const { ctx, page } = await portalPage(browser, { seed: SEED });
    await page.locator('#recapName').fill('Siti Rahma');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#btnRecap').click()]);
    const buf = readFileSync(await dl.path());
    const teacher = await ctx.newPage();
    await teacher.goto('/apps/pengajar/index.html', { waitUntil: 'domcontentloaded' });
    await teacher.setInputFiles('#tr-file', [{ name: dl.suggestedFilename(), mimeType: 'application/json', buffer: buf }]);
    await expect(teacher.locator('#tr-status')).toContainText('1 berkas rekap diterima');
    const row = teacher.locator('#tr-body tr');
    await expect(row).toContainText('Siti Rahma'); await expect(row).toContainText('400');          // 300 SQL + 90 Excel + 10 SPT
    await expect(row).toContainText('GROUP BY + fungsi agregat');   // topik terlemah = prioritas tertinggi (SQL 88 > IF 84)
    await ctx.close();
  });
});
