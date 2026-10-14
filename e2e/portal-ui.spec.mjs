// Uji browser nyata untuk Portal Belajar. Menjaga hal-hal yang tidak tertangkap uji unit:
// layout responsif, tema gelap yang benar-benar berlaku, kontras, profil pengguna, dan data nyata (bukan angka karangan).
import { test, expect } from '@playwright/test';

const PAGES = [
  { id: 'portal', path: '/index.html' },
  { id: 'spt', path: '/apps/spt/index.html' },
  { id: 'accounting', path: '/apps/accounting/index.html' },
  { id: 'excel', path: '/apps/excel/index.html' },
  { id: 'sqlpq', path: '/apps/sql-pq/index.html' },
  { id: 'gamehub', path: '/apps/game-hub/index.html' },
  { id: 'pengajar', path: '/apps/pengajar/index.html' },
];
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, tablet: { width: 820, height: 1100 }, mobile: { width: 390, height: 844 } };
const THEMES = ['light', 'dark'];

// Permintaan ke CDN luar (Firebase/gstatic/fonts) boleh gagal di CI/sandbox; yang LOKAL tidak boleh.
const isExternal = (url) => !/^http:\/\/127\.0\.0\.1/.test(url);

async function open(page, path, { theme = 'light', session = null, extra = {} } = {}) {
  await page.addInitScript(([theme, session, extra]) => {
    // Seed hanya SEKALI per tab: navigasi berikutnya (mis. hub → portal) tidak boleh mengembalikan data ke nilai awal.
    if (sessionStorage.getItem('__e2e_seeded')) return;
    sessionStorage.setItem('__e2e_seeded', '1');
    if (theme === 'dark') { localStorage.setItem('theme', 'dark'); localStorage.setItem('sqlpq_theme', 'dark'); localStorage.setItem('portal_theme', 'dark'); }
    if (session) localStorage.setItem('unified_portal_session', JSON.stringify(session));
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }, [theme, session, extra]);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
}

// luminansi relatif & kontras WCAG dari string "rgb(...)"/"rgba(...)"
const lum = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test.describe('Halaman termuat bersih & responsif', () => {
  for (const pg of PAGES) for (const [vpName, vp] of Object.entries(VIEWPORTS)) for (const theme of THEMES) {
    test(`${pg.id} · ${vpName} · ${theme}`, async ({ page }, info) => {
      await page.setViewportSize(vp);
      const localFails = []; const jsErrors = [];
      page.on('requestfailed', (r) => { if (!isExternal(r.url())) localFails.push(r.url()); });
      page.on('response', (r) => { if (!isExternal(r.url()) && r.status() >= 400) localFails.push(r.status() + ' ' + r.url()); });
      page.on('pageerror', (e) => jsErrors.push(e.message));
      await open(page, pg.path, { theme });

      expect(localFails, 'file lokal gagal dimuat').toEqual([]);
      expect(jsErrors, 'error JavaScript tak tertangani').toEqual([]);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'halaman scroll horizontal').toBeLessThanOrEqual(1);
      await info.attach(`${pg.id}-${vpName}-${theme}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    });
  }
});

test.describe('Tema gelap benar-benar berlaku', () => {
  for (const pg of PAGES) {
    test(`${pg.id}: latar body & kartu gelap`, async ({ page }) => {
      await open(page, pg.path, { theme: 'dark' });
      const bg = await page.evaluate(() => {
        const g = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).backgroundColor : null; };
        return { body: g('body'), card: g('.card') || g('.module-card') || g('.stat-card') || g('.gh-mission') || g('.tr-card') };
      });
      expect(lum(bg.body)).toBeLessThan(0.1);
      if (bg.card) expect(lum(bg.card)).toBeLessThan(0.15);
    });
  }

  test('spt: tombol tema mengubah SELURUH halaman (bukan hanya header)', async ({ page }) => {
    await open(page, '/apps/spt/index.html');
    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const cardBg = () => page.evaluate(() => getComputedStyle(document.querySelector('.card, .chart-card')).backgroundColor);
    expect(lum(await bodyBg())).toBeGreaterThan(0.5);
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    // CSS memakai transisi warna → tunggu sampai nilai akhir (poll), jangan baca di tengah animasi.
    await expect.poll(async () => lum(await bodyBg()), { timeout: 3000 }).toBeLessThan(0.1);
    await expect.poll(async () => lum(await cardBg()), { timeout: 3000 }).toBeLessThan(0.15);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect.poll(async () => lum(await bodyBg()), { timeout: 3000 }).toBeGreaterThan(0.5);
  });

  test('spt dark: teks banner hero terbaca (kontras ≥ 4.5)', async ({ page }) => {
    await open(page, '/apps/spt/index.html', { theme: 'dark' });
    const { fg, bg } = await page.evaluate(() => { const h = document.querySelector('.hero-card'); return { fg: getComputedStyle(h.querySelector('h2')).color, bg: getComputedStyle(h).backgroundColor }; });
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('Dashboard portal', () => {
  test('empat modul menuju URL yang benar & status "Belum dimulai" tanpa data', async ({ page }) => {
    await open(page, '/index.html');
    const cards = await page.locator('.module-card[data-module]').evaluateAll((els) => els.map((e) => ({ href: e.getAttribute('data-module'), status: e.querySelector('[data-progress-for]')?.textContent.trim() })));
    expect(cards.map((c) => c.href)).toEqual(['./apps/spt/index.html', './apps/accounting/index.html', './apps/excel/index.html', './apps/sql-pq/index.html']);
    for (const c of cards) expect(c.status).toBe('Belum dimulai');
    await expect(page.locator('#recentList')).toContainText('Belum ada aktivitas');
  });

  test('tombol tema portal menyimpan pilihan & meneruskan ke kunci modul', async ({ page }) => {
    await open(page, '/index.html');
    await page.locator('#btn-theme').click();
    const keys = await page.evaluate(() => ['portal_theme', 'theme', 'sqlpq_theme'].map((k) => localStorage.getItem(k)));
    expect(keys).toEqual(['dark', 'dark', 'dark']);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('dialog login muat di layar kecil dan bisa ditutup', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await open(page, '/index.html');
    await page.locator('#btn-login').click();
    const card = page.locator('#loginModal .ds-dialog__card');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390); expect(box.y + box.height).toBeLessThanOrEqual(844);
    await page.locator('#btn-cancel-login').click();
    await expect(card).toBeHidden();
  });

  test('layar sentuh: tombol header ≥ 44px', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.mobile, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await open(page, '/index.html');
    for (const sel of ['#btn-theme', '#btn-login']) { const b = await page.locator(sel).boundingBox(); expect(b.height, sel).toBeGreaterThanOrEqual(44); }
    await ctx.close();
  });
});

test.describe('Profil pengguna dari login portal (semua modul)', () => {
  const SESSION = { uid: 'u1', email: 'ran@contoh.id', displayName: 'Ran', isGuest: false };
  const CHIPS = { gamehub: '[data-ds-user-chip] .ds-profile-chip__name', pengajar: '[data-ds-user-chip] .ds-profile-chip__name', spt: '#profile-name', accounting: '[data-ds-user-chip] .ds-profile-chip__name', excel: '[data-ds-user-chip] .ds-profile-chip__name', sqlpq: '[data-ds-user-chip] .ds-profile-chip__name' };
  for (const pg of PAGES.filter((p) => p.id !== 'portal')) {
    test(`${pg.id}: menampilkan nama & email dari sesi portal`, async ({ page }) => {
      await open(page, pg.path, { session: SESSION });
      await expect(page.locator(CHIPS[pg.id]).first()).toHaveText('Ran');
      await expect(page.getByText('ran@contoh.id').first()).toBeVisible();
    });
    test(`${pg.id}: tanpa sesi → "Tamu"`, async ({ page }) => {
      await open(page, pg.path);
      await expect(page.locator(CHIPS[pg.id]).first()).toHaveText('Tamu');
    });
  }
  test('spt: data lama di localStorage SPT tidak menimpa identitas portal', async ({ page }) => {
    await open(page, '/apps/spt/index.html', { session: SESSION, extra: { spt_simulator_data: { xp: 5, level: 1, history: [], email: 'lama@x.id', displayName: 'Nama Lama' } } });
    await expect(page.locator('#profile-name')).toHaveText('Ran');
  });
});

test.describe('Tidak ada statistik karangan', () => {
  test('spt: grafik progres kosong tanpa riwayat', async ({ page }) => {
    await open(page, '/apps/spt/index.html');
    const heights = await page.locator('#progress-chart-bars .chart-rect').evaluateAll((els) => els.map((e) => e.style.height));
    expect(heights).toEqual(['0%', '0%', '0%', '0%', '0%']);
    await expect(page.locator('#progress-chart-caption')).toHaveText('Belum ada latihan tercatat');
  });

  test('spt: grafik mengikuti riwayat nyata per minggu', async ({ page }) => {
    const fmt = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toLocaleDateString('id-ID'); };
    const history = [0, 1, 2, 3, 10, 12].map((n) => ({ date: fmt(n), module: 'x', mode: 'form', score: 80 })); // 4 minggu ini, 2 di -1 minggu
    await open(page, '/apps/spt/index.html', { extra: { spt_simulator_data: { xp: 50, level: 1, history, email: '', displayName: '' } } });
    const heights = await page.locator('#progress-chart-bars .chart-rect').evaluateAll((els) => els.map((e) => e.style.height));
    expect(heights).toEqual(['0%', '0%', '0%', '50%', '100%']);
  });
});

// ───────────────────────── Poin 2: shell & tema terpusat ─────────────────────────
const MODULE_PAGES = [
  { id: 'spt', path: '/apps/spt/index.html' },
  { id: 'accounting', path: '/apps/accounting/index.html' },
  { id: 'excel', path: '/apps/excel/index.html' },
  { id: 'excel-pivot', path: '/apps/excel/pivot-dashboard/index.html' },
  { id: 'sqlpq', path: '/apps/sql-pq/index.html' },
  { id: 'gamehub', path: '/apps/game-hub/index.html' },
  { id: 'pengajar', path: '/apps/pengajar/index.html' },
];
const THEME_KEYS = ['theme', 'portal_theme', 'sqlpq_theme'];
const readKeys = (page) => page.evaluate((keys) => keys.map((k) => localStorage.getItem(k)), THEME_KEYS);

test.describe('App shell: tautan Portal di header', () => {
  for (const pg of MODULE_PAGES) {
    test(`${pg.id}: ada tautan "← Portal" di header, tanpa tombol melayang`, async ({ page }) => {
      await open(page, pg.path);
      const link = page.locator('[data-ds-portal-link]');
      await expect(link).toHaveCount(1);
      await expect(link).toBeVisible();
      await expect(page.locator('.bls-back-to-portal')).toHaveCount(0);
      await link.click();
      await expect(page).toHaveURL(/\/index\.html$/);
      await expect(page.locator('#hubTitle')).toBeVisible();
    });
  }
  test('mobile: tautan Portal tetap terlihat & cukup besar (hanya panah)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.mobile, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await open(page, '/apps/sql-pq/index.html');
    const b = await page.locator('[data-ds-portal-link]').boundingBox();
    expect(b.width).toBeGreaterThanOrEqual(44); expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
    await ctx.close();
  });
});

test.describe('Tema terpusat', () => {
  test('kunci lama yang bertentangan disamakan saat dimuat (SQL ikut gelap)', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('theme', 'dark'); localStorage.setItem('sqlpq_theme', 'light'); });
    await page.goto('/apps/sql-pq/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await readKeys(page)).toEqual(['dark', 'dark', 'dark']);
  });

  const TOGGLES = { sqlpq: ['/apps/sql-pq/index.html', '#btnThemeToggle'], accounting: ['/apps/accounting/index.html', '#themeBtn'], excel: ['/apps/excel/index.html', '[data-ds-theme-btn]'], gamehub: ['/apps/game-hub/index.html', '[data-ds-theme-btn]'], pengajar: ['/apps/pengajar/index.html', '[data-ds-theme-btn]'], spt: ['/apps/spt/index.html', 'button[aria-label="Toggle theme"]'] };
  for (const [id, [path, sel]] of Object.entries(TOGGLES)) {
    test(`${id}: toggle bawaan menyalin pilihan ke SEMUA kunci tema`, async ({ page }) => {
      await open(page, path);
      await page.locator(sel).first().click();
      await expect.poll(() => readKeys(page)).toEqual(['dark', 'dark', 'dark']);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.locator(sel).first().click();
      await expect.poll(() => readKeys(page)).toEqual(['light', 'light', 'light']);
    });
  }

  test('ganti tema di satu tab → tab modul lain ikut berubah (storage event)', async ({ context }) => {
    const a = await context.newPage(); const b = await context.newPage();
    await open(a, '/apps/excel/index.html'); await open(b, '/apps/accounting/index.html');
    await expect(b.locator('html')).not.toHaveAttribute('data-theme', 'dark');
    await a.locator('[data-ds-theme-btn]').click();
    await expect(b.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('portal: tombol tema mengubah modul yang dibuka sesudahnya', async ({ page }) => {
    await open(page, '/index.html');
    await page.locator('#btn-theme').click();
    await page.goto('/apps/sql-pq/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Excel mode gelap', () => {
  test('pivot-dashboard: select/tombol tidak putih & judul terbaca', async ({ page }) => {
    await open(page, '/apps/excel/pivot-dashboard/index.html', { theme: 'dark' });
    await page.getByText('2. Pivot Table').click();
    const r = await page.evaluate(() => {
      const sel = document.querySelector('.pd-field-label select');
      const h1 = document.querySelector('.pd-header h1');
      return { selBg: getComputedStyle(sel).backgroundColor, selFg: getComputedStyle(sel).color, h1: getComputedStyle(h1).color, body: getComputedStyle(document.body).backgroundColor };
    });
    expect(lum(r.selBg)).toBeLessThan(0.15);
    expect(contrast(r.selFg, r.selBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(r.h1, r.body)).toBeGreaterThanOrEqual(4.5);
  });

  test('halaman utama: tombol "Latihan Baru" terbaca (kontras ≥ 4.5)', async ({ page }) => {
    await open(page, '/apps/excel/index.html', { theme: 'dark' });
    const r = await page.evaluate(() => {
      const el = [...document.querySelectorAll('a,button')].find((e) => /Pivot/.test(e.textContent));
      let bg = getComputedStyle(el).backgroundColor, n = el;
      while ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && n.parentElement) { n = n.parentElement; bg = getComputedStyle(n).backgroundColor; }
      return { fg: getComputedStyle(el).color, bg };
    });
    expect(contrast(r.fg, r.bg)).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('Modul Pengetahuan (overlay) terbaca di kedua tema', () => {
  const OPEN = { excel: ['/apps/excel/index.html', (p) => p.getByText('Modul Pengetahuan').first()], sqlpq: ['/apps/sql-pq/index.html', (p) => p.locator('[id*=nowledge]').first()], accounting: ['/apps/accounting/index.html', (p) => p.getByText('Pengetahuan').first()], spt: ['/apps/spt/index.html', (p) => p.getByText('Pengetahuan').first()] };
  for (const [id, [path, btn]] of Object.entries(OPEN)) for (const theme of THEMES) {
    test(`${id} · ${theme}: judul vs panel kontras ≥ 4.5`, async ({ page }) => {
      await open(page, path, { theme });
      await btn(page).click();
      await page.waitForSelector('.kb-titlepage h1');
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('.kb-titlepage h1')).color, panel: getComputedStyle(document.querySelector('.kb-panel')).backgroundColor }));
      expect(contrast(r.h1, r.panel)).toBeGreaterThanOrEqual(4.5);
      if (theme === 'dark') expect(lum(r.panel)).toBeLessThan(0.15);
    });
  }
});

// ───────────────────────── Poin 3: Game Hub ─────────────────────────
const HUB = '/apps/game-hub/index.html';
const sqlP = (xp, n) => ({ sqlpq_progress_v1: { xp, totalAnswered: n, totalCorrect: Math.floor(n * 0.8), completedLessons: {}, history: [] } });
const setProgress = (page, obj) => page.evaluate((o) => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, JSON.stringify(v)); window.dispatchEvent(new Event('focus')); }, obj);
const xpMission = (page) => page.locator('.gh-mission[data-mission="xp"]');
const targetOf = async (page) => Number(await xpMission(page).locator('[role=progressbar]').getAttribute('aria-valuemax'));
const rewardOf = async (page) => Number((await xpMission(page).locator('.gh-chip').innerText()).replace(/\D/g, ''));
const bonus = async (page) => Number((await page.locator('#gh-xp-bonus').innerText()).replace(/\D/g, ''));

test.describe('Gaya komponen utuh (bukan sekadar struktur)', () => {
  test('portal: kartu modul & banner Game Hub benar-benar bergaya', async ({ page }) => {
    await open(page, '/index.html');
    const r = await page.evaluate(() => {
      const c = getComputedStyle(document.querySelector('.module-card'));
      const b = getComputedStyle(document.querySelector('.gh-banner'));
      return { cardBorder: c.borderTopWidth, cardPad: parseFloat(c.paddingTop), cardRadius: parseFloat(c.borderTopLeftRadius), bannerBg: b.backgroundColor, bannerDisplay: b.display };
    });
    expect(r.cardBorder).toBe('3px'); expect(r.cardPad).toBeGreaterThanOrEqual(16); expect(r.cardRadius).toBeGreaterThanOrEqual(8);
    expect(lum(r.bannerBg)).toBeLessThan(0.1); expect(r.bannerDisplay).toBe('flex');
  });
});

test.describe('Game Hub', () => {
  test('pengguna baru: 3 misi nol, level 1, tanpa lencana palsu', async ({ page }) => {
    await open(page, HUB);
    await expect(page.locator('.gh-mission')).toHaveCount(3);
    await expect(page.locator('#gh-level-num')).toHaveText('1');
    await expect(page.locator('#gh-xp-total')).toHaveText('0');
    await expect(page.locator('#gh-streak')).toHaveText('0 hari');
    for (const bar of await page.locator('.gh-mission [role=progressbar]').all()) expect(await bar.getAttribute('aria-valuenow')).toBe('0');
    await expect(page.locator('.gh-badge.is-on')).toHaveCount(0);
    await expect(page.locator('#gh-ach-count')).toHaveText('0 dari 9 terbuka');
    await expect(page.locator('#gh-log')).toContainText('Belum ada klaim');
  });

  test('progres lama sebelum hub dibuka tidak dihitung; XP gabungan memuat XP modul nyata', async ({ page }) => {
    await open(page, HUB, { extra: sqlP(300, 20) });
    await expect(page.locator('#gh-xp-module')).toHaveText('300');
    await expect(page.locator('#gh-xp-total')).toHaveText('300');
    for (const bar of await page.locator('.gh-mission [role=progressbar]').all()) expect(await bar.getAttribute('aria-valuenow')).toBe('0');
    await expect(page.locator('#gh-level-num')).toHaveText('3'); // 300 XP = level 3
  });

  test('berlatih → misi selesai → klaim sekali → bonus XP, tersimpan, tak bisa diklaim ulang', async ({ page }) => {
    await open(page, HUB, { extra: sqlP(10, 1) });
    const tgt = await targetOf(page), reward = await rewardOf(page);
    await setProgress(page, sqlP(10 + tgt, 1 + Math.ceil(tgt / 15)));            // berlatih di SQL (modul nyata)
    await expect(xpMission(page)).toHaveClass(/is-done/);
    const claim = xpMission(page).locator('.gh-claim');
    await expect(claim).toHaveText(`Klaim +${reward} XP`);
    await claim.click();
    await expect(page.locator('#gh-toast')).toContainText(`+${reward} XP`);
    await expect(page.locator('#gh-xp-bonus')).toHaveText(String(reward));
    await expect(page.locator('#gh-xp-total')).toHaveText(String(10 + tgt + reward));
    await expect(page.locator('#gh-streak')).toHaveText('1 hari');
    await expect(xpMission(page).locator('button')).toBeDisabled();
    await expect(page.locator('.gh-badge.is-on[data-achievement="mission_1"]')).toHaveCount(1);
    await expect(page.locator('.gh-badge.is-on[data-achievement="first_step"]')).toHaveCount(1);
    await expect(page.locator('#gh-log li').first()).toContainText(`+${reward} XP`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#gh-xp-bonus')).toHaveText(String(reward));          // persisten
    await expect(xpMission(page)).toHaveClass(/is-claimed/);
  });

  test('klaim yang melewati batas level menampilkan pemberitahuan naik level', async ({ page }) => {
    await open(page, HUB, { extra: sqlP(0, 0) });
    await setProgress(page, sqlP(99, 7));                  // total 99 XP = masih level 1; bonus klaim (≥20) melewati 100
    await expect(page.locator('#gh-level-num')).toHaveText('1');
    await xpMission(page).locator('.gh-claim').click();
    await expect(page.locator('#gh-toast')).toContainText('Naik ke Level 2');
    await expect(page.locator('#gh-level-num')).toHaveText('2');
  });

  test('dua tab Game Hub: klaim ganda lintas tab tidak menggandakan XP', async ({ context }) => {
    const a = await context.newPage(); const b = await context.newPage();
    await open(a, HUB, { extra: sqlP(10, 1) });
    await b.goto(HUB, { waitUntil: 'domcontentloaded' }); await b.waitForTimeout(500);
    const tgt = await targetOf(a), reward = await rewardOf(a);
    await setProgress(a, sqlP(10 + tgt, 1 + Math.ceil(tgt / 15)));
    await b.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(xpMission(a)).toHaveClass(/is-done/); await expect(xpMission(b)).toHaveClass(/is-done/);
    await xpMission(a).locator('.gh-claim').click();
    await xpMission(b).locator('.gh-claim, button').first().click({ force: true }).catch(() => {});
    await b.waitForTimeout(400);
    expect(await bonus(a)).toBe(reward);
    await b.reload({ waitUntil: 'domcontentloaded' });
    expect(await bonus(b)).toBe(reward);
  });

  test('pergantian hari: misi mulai ulang dari 0, klaim kemarin tidak ikut, streak bertahan', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 9, 12, 9, 0, 0) });
    await open(page, HUB, { extra: sqlP(10, 1) });
    const tgt = await targetOf(page);
    await setProgress(page, sqlP(10 + tgt, 1 + Math.ceil(tgt / 15)));
    await xpMission(page).locator('.gh-claim').click();
    await expect(page.locator('#gh-streak')).toHaveText('1 hari');
    await page.clock.setFixedTime(new Date(2026, 9, 13, 9, 0, 0));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('#gh-streak')).toHaveText('1 hari');                  // klaim kemarin → streak masih berlaku
    for (const bar of await page.locator('.gh-mission [role=progressbar]').all()) expect(await bar.getAttribute('aria-valuenow')).toBe('0');
    await expect(page.locator('.gh-mission.is-claimed')).toHaveCount(0);
    await page.clock.setFixedTime(new Date(2026, 9, 15, 9, 0, 0));                 // lompat 2 hari
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('#gh-streak')).toHaveText('0 hari');                  // putus
  });

  test('data state rusak di localStorage tidak merusak halaman', async ({ page }) => {
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await open(page, HUB, { extra: { gamehub_state_v1: '{"bonusXp":"jahat","claimed":{"x":1},"log":[1,null],"__proto__":{"polluted":1}}' } });
    await expect(page.locator('.gh-mission')).toHaveCount(3);
    await expect(page.locator('#gh-xp-bonus')).toHaveText('0');
    expect(errs).toEqual([]);
    expect(await page.evaluate(() => ({}).polluted)).toBeUndefined();
  });

  test('portal: banner Game Hub memuat angka nyata & menuju hub', async ({ page }) => {
    await open(page, '/index.html', { extra: sqlP(300, 20) });
    await expect(page.locator('#ghBannerStats')).toContainText('Level 3');
    await expect(page.locator('#ghBannerStats')).toContainText('300 XP gabungan');
    await page.locator('#ghBanner').click();
    await expect(page).toHaveURL(/\/apps\/game-hub\/index\.html$/);
    await expect(page.locator('#gh-xp-total')).toHaveText('300');
  });

  test('portal: banner menyebut misi siap klaim setelah berlatih', async ({ page }) => {
    await open(page, HUB, { extra: sqlP(10, 1) });
    const tgt = await targetOf(page);
    await setProgress(page, sqlP(10 + tgt, 1 + Math.ceil(tgt / 15)));
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600);
    await expect(page.locator('#ghBannerStats')).toContainText('siap diklaim');
  });
});
