import { test, expect } from '@playwright/test';

test('Dashboard Pivot yang dihapus tidak lagi dapat diakses', async ({ request }) => {
  const response = await request.get('/apps/excel/pivot-dashboard/index.html');
  expect(response.status()).toBe(404);
});
