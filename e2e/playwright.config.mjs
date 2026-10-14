import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT || 4173);
// Di CI: `npx playwright install chromium --with-deps` (default). Lokal/sandbox tanpa unduhan:
// set PW_CHROMIUM_PATH ke binary Chromium yang sudah ada.
const exe = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.mjs',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    launchOptions: exe ? { executablePath: exe, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block', // cache service worker tidak boleh menutupi perubahan saat uji
  },
  webServer: { command: 'node serve.mjs', url: `http://127.0.0.1:${PORT}/index.html`, reuseExistingServer: !process.env.CI, env: { E2E_PORT: String(PORT) } },
});
