import { test, expect } from '@playwright/test';

test('kursus VBA mengajarkan empat pola bertahap dengan koreksi dan simulasi aman', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/apps/excel/interactive/index.html');
  await expect(page.getByRole('heading', { name: 'Belajar VBA Interaktif' })).toBeVisible();
  await expect(page.locator('#xlScore')).toHaveText('0 dari 4 latihan selesai');
  await expect(page.locator('#xlLessonList button')).toHaveCount(4);
  await expect(page.locator('#xlDataGrid')).toContainText('Harga Satuan');
  await expect(page.locator('#xlDataGrid tbody tr')).toHaveCount(5);

  const code = page.locator('#xlVbaAnswer');
  await code.fill('');
  await page.locator('#xlCheckVba').click();
  await expect(page.locator('#xlFeedback')).toContainText('Periksa struktur prosedur');

  await page.locator('#xlShowHint').click();
  await expect(page.locator('#xlCodeHint')).toBeVisible();
  await code.fill('Sub SapaPengguna()\n    MsgBox "Selamat belajar VBA!"\nEnd Sub');
  await page.locator('#xlCheckVba').click();
  await expect(page.locator('#xlFeedback')).toContainText('Benar');
  await expect(page.locator('#xlOutput')).toContainText('Kode VBA tidak dijalankan');
  await expect(page.locator('#xlOutput')).toContainText('Selamat belajar VBA!');
  await expect(page.locator('#xlScore')).toHaveText('1 dari 4 latihan selesai');

  await page.locator('#xlNext').click();
  await code.fill('Sub HitungTotalBarisPertama()\n    Range("E2").Value = Range("C2").Value * Range("D2").Value\nEnd Sub');
  await page.locator('#xlCheckVba').click();
  await expect(page.locator('#xlFeedback')).toContainText('Benar');
  await expect(page.locator('#xlOutput')).toContainText('E2 = Rp375.000');

  await page.locator('#xlNext').click();
  await code.fill('Sub HitungSemuaTotal()\n    Dim baris As Long\n    For baris = 2 To 6\n        Cells(baris, 5).Value = Cells(baris, 3).Value * Cells(baris, 4).Value\n    Next baris\nEnd Sub');
  await page.locator('#xlCheckVba').click();
  await expect(page.locator('#xlFeedback')).toContainText('Benar');
  await expect(page.locator('#xlOutput li')).toHaveCount(5);
  await expect(page.locator('#xlOutput')).toContainText('E6 (Bali, Papan ketik) = Rp750.000');

  await page.locator('#xlNext').click();
  await code.fill([
    'Sub TandaiTargetPenjualan()',
    '    Dim baris As Long',
    '    For baris = 2 To 6',
    '        If Cells(baris, 5).Value >= 500000 Then',
    '            Cells(baris, 6).Value = "Target tercapai"',
    '        Else',
    '            Cells(baris, 6).Value = "Perlu ditingkatkan"',
    '        End If',
    '    Next baris',
    'End Sub',
  ].join('\n'));
  await page.locator('#xlCheckVba').click();
  await expect(page.locator('#xlFeedback')).toContainText('Benar');
  await expect(page.locator('#xlOutput')).toContainText('F2 (Jawa Barat, Mouse nirkabel) = Perlu ditingkatkan');
  await expect(page.locator('#xlOutput')).toContainText('F3 (Jabodetabek, Papan ketik) = Target tercapai');
  await expect(page.locator('#xlScore')).toHaveText('4 dari 4 latihan selesai');
  expect(pageErrors).toEqual([]);
});

test('kursus VBA mempertahankan draf saat berpindah dan bisa mengganti lembar contoh', async ({ page }) => {
  await page.goto('/apps/excel/interactive/index.html');
  const code = page.locator('#xlVbaAnswer');
  await code.fill('Sub SapaPengguna()\nEnd Sub');
  await page.locator('#xlNext').click();
  await code.fill('Sub HitungTotalBarisPertama()\n');
  await page.locator('#xlPrevious').click();
  await expect(code).toHaveValue('Sub SapaPengguna()\nEnd Sub');
  await page.locator('#xlSheetMacroTab').click();
  await expect(page.locator('#xlSheetMacro')).toBeVisible();
  await expect(page.locator('#xlSheetData')).toBeHidden();
  await expect(page.locator('#xlSheetMacro')).toContainText('Kode tidak dijalankan');
});

test('halaman utama tetap menyediakan generator workbook dan tautan kursus VBA', async ({ page }) => {
  await page.goto('/apps/excel/index.html');
  const link = page.getByRole('link', { name: 'Belajar VBA Interaktif' });
  await expect(link).toHaveAttribute('href', 'interactive/index.html');
  await expect(page.getByRole('heading', { name: 'Generator Workbook Latihan (.xlsx)' })).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/apps\/excel\/interactive\/index\.html$/);
});

test('kursus VBA tetap muat di layar ponsel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/apps/excel/interactive/index.html');
  await expect(page.getByRole('heading', { name: 'Belajar VBA Interaktif' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
});
