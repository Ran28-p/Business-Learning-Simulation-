// E2E sinkron cloud: adapter di browser nyata + Firebase tiruan bersama (beberapa konteks = beberapa perangkat).
import { test, expect } from '@playwright/test';
import { makeFakeDb, installFake } from './fake-firebase.mjs';

const db = makeFakeDb();
test.beforeEach(() => db.reset());
test.describe.configure({ mode: 'serial' });

const U1 = { uid: 'u1', email: 'siti@contoh.id', name: 'Siti' };
const U2 = { uid: 'u2', email: 'budi@contoh.id', name: 'Budi' };
const sql = (xp, n) => JSON.stringify({ xp, totalAnswered: n, totalCorrect: Math.floor(n * 0.8), completedLessons: {}, history: [] });
const xl = (xp, n) => JSON.stringify({ xp, soalDikerjakan: n, jawabanBenar: Math.floor(n * 0.7), levelAktif: 1, riwayat: [] });

/** Satu "perangkat": konteks browser sendiri (storage terpisah) yang berbagi `db` palsu. */
async function device(browser, { user = null, local = {}, path = '/index.html' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await installFake(ctx, db);
  await ctx.addInitScript(([u, local]) => {
    if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    if (u) {
      localStorage.setItem('__fake_fb_user', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.name }));
      localStorage.setItem('unified_portal_session', JSON.stringify({ uid: u.uid, email: u.email, displayName: u.name, isGuest: false }));
    }
    for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
  }, [user, local]);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  return { ctx, page, errors };
}
const state = (page) => page.evaluate(() => window.CloudSync ? window.CloudSync.status().state : 'tidak-dimuat');
const waitState = (page, s, timeout = 15000) => expect.poll(() => state(page), { timeout }).toBe(s);
const ls = (page, k) => page.evaluate((k) => localStorage.getItem(k), k);

test.describe('Sinkron cloud', () => {
  test('tamu: tidak ada jaringan, tidak memuat Firebase, tombol nonaktif', async ({ browser }) => {
    const d = await device(browser, { path: '/apps/sql-pq/index.html', local: { sqlpq_progress_v1: sql(50, 4) } });
    await d.page.waitForTimeout(2500);
    expect(db.log).toEqual([]);
    expect(await d.page.evaluate(() => typeof window.firebase)).toBe('undefined');
    expect(await state(d.page)).toBe('off');
    await d.page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await expect(d.page.locator('#btnCloudSync')).toBeDisabled();
    await expect(d.page.locator('#cloudStatus')).toContainText('Masuk');
    await d.ctx.close();
  });

  test('login: progres terunggah ke portalSync/<uid>/<unit> dengan bentuk dokumen yang benar', async ({ browser }) => {
    const d = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(320, 20), 'efpg:progress': xl(90, 6) } });
    await waitState(d.page, 'ok');
    expect(db.paths().sort()).toEqual(['portalSync/u1/excel', 'portalSync/u1/sqlpq']);   // hanya unit yang berisi; SPT tak pernah
    const doc = db.get('portalSync/u1/sqlpq');
    expect(doc.rev).toBe(1); expect(doc.xp).toBe(320); expect(doc.act).toBe(20);
    expect(doc.data.sqlpq_progress_v1).toBe(sql(320, 20));
    expect(Object.keys(db.get('portalSync/u1/excel').data)).toEqual(['efpg%3Aprogress']);   // kunci ter-encode
    expect(Object.keys(doc).sort()).toEqual(['act', 'data', 'device', 'hash', 'rev', 'updatedAt', 'xp']);
    await expect(d.page.locator('#cloudStatus')).toContainText('Tersinkron');
    expect(d.errors).toEqual([]);
    await d.ctx.close();
  });

  test('perangkat baru: progres ditarik & ringkasan portal ikut berubah', async ({ browser }) => {
    const a = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(320, 20) } });
    await waitState(a.page, 'ok');
    const b = await device(browser, { user: U1 });
    await waitState(b.page, 'ok');
    expect(await ls(b.page, 'sqlpq_progress_v1')).toBe(sql(320, 20));
    await expect(b.page.locator('#progressTotals')).toContainText('320');
    await expect(b.page.locator('[data-progress-for="sqlpq"]')).not.toHaveText('Belum dimulai');
    await a.ctx.close(); await b.ctx.close();
  });

  test('di halaman modul: muncul bilah "Muat ulang", lalu progres terlihat; lencana ☁ di profil', async ({ browser }) => {
    const a = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(320, 20) } });
    await waitState(a.page, 'ok');
    const b = await device(browser, { user: U1, path: '/apps/sql-pq/index.html' });
    await waitState(b.page, 'ok');
    await expect(b.page.locator('#ds-cloud-notice')).toBeVisible();
    await expect(b.page.locator('.ds-profile-chip__sync')).toHaveText('☁');
    await b.page.locator('#ds-cloud-notice button', { hasText: 'Muat ulang' }).click();
    await expect(b.page.getByText('320').first()).toBeVisible();
    expect(b.errors).toEqual([]);
    await a.ctx.close(); await b.ctx.close();
  });

  test('reset di satu perangkat merambat ke perangkat lain (tidak "dihidupkan kembali")', async ({ browser }) => {
    const a = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(320, 20), 'efpg:progress': xl(90, 6) } });
    await waitState(a.page, 'ok');
    const b = await device(browser, { user: U1 }); await waitState(b.page, 'ok');
    await a.page.evaluate(() => { localStorage.removeItem('sqlpq_progress_v1'); return window.CloudSync.syncNow(); });
    await expect.poll(() => db.get('portalSync/u1/sqlpq')?.rev).toBe(2);
    expect(db.get('portalSync/u1/sqlpq').data).toBeUndefined();
    expect(await ls(a.page, 'sqlpq_progress_v1')).toBeNull();                 // A tidak dipulihkan dari cloud
    await b.page.evaluate(() => window.CloudSync.syncNow());
    await expect.poll(() => ls(b.page, 'sqlpq_progress_v1')).toBeNull();      // B ikut kosong
    expect(await ls(b.page, 'efpg:progress')).toBe(xl(90, 6));                // unit lain utuh
    await a.ctx.close(); await b.ctx.close();
  });

  test('tautan pertama dengan data berbeda: tampil pilihan, tidak ada yang berubah sebelum dipilih', async ({ browser }) => {
    const a = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(500, 40) } });
    await waitState(a.page, 'ok');
    const c = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(60, 5) } });
    await waitState(c.page, 'needs-choice');
    await expect(c.page.locator('#cloudChoice')).toBeVisible();
    await expect(c.page.locator('#cloudChoiceList')).toContainText('SQL & Power Query');
    await expect(c.page.locator('#cloudChoiceList')).toContainText('60 XP');
    await expect(c.page.locator('#cloudChoiceList')).toContainText('500 XP');
    expect(await ls(c.page, 'sqlpq_progress_v1')).toBe(sql(60, 5));           // lokal utuh
    expect(db.get('portalSync/u1/sqlpq').rev).toBe(1);                         // cloud utuh
    await c.page.locator('#cloudChoiceCloud').click();
    await waitState(c.page, 'ok');
    expect(await ls(c.page, 'sqlpq_progress_v1')).toBe(sql(500, 40));
    await expect(c.page.locator('#cloudChoice')).toBeHidden();
    await a.ctx.close(); await c.ctx.close();
  });

  test('ganti akun di perangkat yang sama: data lokal TIDAK terunggah ke akun baru sebelum dipilih', async ({ browser }) => {
    // perangkat ini pernah tersambung ke akun u1; sekarang u2 login
    const d = await device(browser, { user: U2, local: { sqlpq_progress_v1: sql(777, 50), cloudsync_v1: JSON.stringify({ uid: 'u1', units: {}, lastSyncAt: 1 }) } });
    await waitState(d.page, 'needs-choice');
    expect(db.paths()).toEqual([]);                                            // tidak ada yang terunggah
    expect(await ls(d.page, 'sqlpq_progress_v1')).toBe(sql(777, 50));
    await d.page.locator('#cloudChoiceLocal').click();
    await waitState(d.page, 'ok');
    expect(db.get('portalSync/u2/sqlpq').data.sqlpq_progress_v1).toBe(sql(777, 50));
    await d.ctx.close();
  });

  test('aturan Firebase belum diterapkan: pesan jelas, progres lokal aman', async ({ browser }) => {
    db.mode = 'deny';
    const d = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(320, 20) } });
    await waitState(d.page, 'rules');
    await expect(d.page.locator('#cloudStatus')).toContainText('Aturan Firebase');
    expect(await ls(d.page, 'sqlpq_progress_v1')).toBe(sql(320, 20));
    await d.ctx.close();
  });

  test('offline lalu pulih: status offline, kemudian sinkron dengan tombol', async ({ browser }) => {
    db.mode = 'offline';
    const d = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(320, 20) } });
    await waitState(d.page, 'offline');
    await expect(d.page.locator('#cloudStatus')).toContainText('Offline');
    expect(await ls(d.page, 'sqlpq_progress_v1')).toBe(sql(320, 20));
    db.mode = 'ok';
    await expect(d.page.locator('#btnCloudSync')).toBeEnabled();
    await d.page.locator('#btnCloudSync').click();
    await waitState(d.page, 'ok');
    expect(db.get('portalSync/u1/sqlpq').xp).toBe(320);
    await d.ctx.close();
  });

  test('keluar (logout) menghentikan sinkron; data lokal tetap', async ({ browser }) => {
    const d = await device(browser, { user: U1, local: { sqlpq_progress_v1: sql(320, 20) } });
    await waitState(d.page, 'ok');
    await d.page.locator('#btn-logout').click();
    await waitState(d.page, 'off');
    await expect(d.page.locator('#btnCloudSync')).toBeDisabled();
    expect(await ls(d.page, 'sqlpq_progress_v1')).toBe(sql(320, 20));
    await d.ctx.close();
  });

  test('Game Hub: bonus XP & lencana ikut pindah perangkat', async ({ browser }) => {
    const HUB = '/apps/game-hub/index.html';
    const a = await device(browser, { user: U1, path: HUB, local: { sqlpq_progress_v1: sql(0, 0) } });
    await waitState(a.page, 'ok');
    const target = Number(await a.page.locator('.gh-mission[data-mission="xp"] [role=progressbar]').getAttribute('aria-valuemax'));
    const reward = Math.round(target / 2);
    await a.page.evaluate((x) => { localStorage.setItem('sqlpq_progress_v1', JSON.stringify({ xp: x, totalAnswered: 9, totalCorrect: 7, completedLessons: {}, history: [] })); window.dispatchEvent(new Event('focus')); }, target + 1);
    await a.page.locator('.gh-mission[data-mission="xp"] .gh-claim').click();
    await expect(a.page.locator('#gh-xp-bonus')).toHaveText(String(reward));
    await a.page.evaluate(() => window.CloudSync.syncNow());
    await expect.poll(() => db.get('portalSync/u1/gamehub')?.xp).toBe(reward);
    const b = await device(browser, { user: U1, path: HUB });
    await waitState(b.page, 'ok');
    await expect(b.page.locator('#gh-xp-bonus')).toHaveText(String(reward));      // hub merender ulang setelah sinkron
    await expect(b.page.locator('.gh-badge.is-on[data-achievement="mission_1"]')).toHaveCount(1);
    await a.ctx.close(); await b.ctx.close();
  });

  test('SPT tidak memuat sinkron portalSync (punya sinkron sendiri)', async ({ browser }) => {
    const d = await device(browser, { user: U1, path: '/apps/spt/index.html' });
    await d.page.waitForTimeout(2500);
    expect(await d.page.evaluate(() => typeof window.CloudSync)).toBe('undefined');
    expect(db.log.filter((l) => l.includes('portalSync'))).toEqual([]);
    await d.ctx.close();
  });
});
