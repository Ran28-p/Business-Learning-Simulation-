import { test, expect } from '@playwright/test';

test('Pivot Table tetap berjalan dan Jalur Praktik tidak lagi ada di modul ini', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/apps/excel/pivot-dashboard/index.html');
  await expect(page.locator('#pdEngineStatus')).toContainText('HyperFormula siap');
  await expect(page.locator('.pd-tab')).toHaveCount(3);
  await expect(page.getByText('4. Jalur Praktik')).toHaveCount(0);

  await page.locator('#pdTabPivot').click();
  await page.locator('#btnBuildPivot').click();
  await expect(page.locator('#pdPivotTable')).toContainText('Total Baris');

  await page.locator('#pdTabDashboard').click();
  await expect(page.locator('#pdKpiRow .pd-kpi-card')).toHaveCount(4);
  expect(pageErrors).toEqual([]);
});
