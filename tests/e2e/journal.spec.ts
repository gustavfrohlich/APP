// Napló: táblázat cellánkénti szerkesztése billentyűzettel, és a naptár nézet üres állapota.
import { expect, test } from '@playwright/test';

test('táblázat: gépelés, Enter, nyilak', async ({ page }) => {
  await page.goto('/#/naplo?nezet=table');
  const grid = page.getByRole('grid');
  await expect(grid).toBeVisible();
  // A mai sor alvásminőség-cellája aktív: gépelés → szerkesztés, Enter → mentés.
  await page.keyboard.type('8');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type('730');
  await page.keyboard.press('Tab');
  const today = page.locator('tr').last();
  await expect(today.getByRole('gridcell').nth(5)).toHaveText('8');
  await expect(today.getByRole('gridcell').nth(6)).toHaveText('7:30');
  // Érvénytelen érték: a szerkesztés nyitva marad.
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.type('xyz');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  await page.keyboard.press('Escape');
  await expect(today.getByRole('gridcell').nth(5)).toHaveText('8');
});

test('naptár: üres állapot és nap részletei', async ({ page }) => {
  await page.goto('/#/naplo');
  await expect(page.getByText('Még üres a napló')).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: /okt\.|szept\.|nov\./ }).first(),
  ).toBeVisible();
});
