// JSON mentés → minden adat törlése (kétlépcsős) → visszatöltés: minden adat visszajön.
import { expect, test } from '@playwright/test';
import { skipOnboarding } from './helpers';

test('mentés, törlés és visszatöltés', async ({ page }) => {
  await page.goto('/');
  await skipOnboarding(page);

  // Egy adat a mai napra a táblázatból.
  await page.goto('/#/naplo?nezet=table');
  await expect(page.getByRole('grid')).toBeVisible();
  await page.keyboard.type('8');
  await page.keyboard.press('Enter');
  const todayRow = page.locator('tr').last();
  await expect(todayRow.getByRole('gridcell').nth(5)).toHaveText('8');

  // Mentés letöltése.
  await page.goto('/#/beallitasok');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'JSON-mentés letöltése' }).click(),
  ]);
  const file = await download.path();
  expect(download.suggestedFilename()).toMatch(/^bazis-mentes-\d{4}-\d{2}-\d{2}\.json$/);

  // Minden adat törlése – két lépésben.
  await page.getByRole('button', { name: 'Minden valódi adat törlése…' }).click();
  await page.getByRole('button', { name: 'Tovább a törléshez' }).click();
  const finalBtn = page.getByRole('button', { name: 'Végleges törlés' });
  await expect(finalBtn).toBeDisabled();
  await page.getByLabel('Megerősítés: TÖRLÉS').fill('TÖRLÉS');
  await finalBtn.click();
  await skipOnboarding(page);
  await page.goto('/#/naplo?nezet=table');
  await expect(page.locator('tr').last().getByRole('gridcell').nth(5)).toHaveText('');

  // Visszatöltés felülírással.
  await page.goto('/#/beallitasok');
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Visszatöltés mentésből…' }).click(),
  ]);
  await chooser.setFiles(file);
  await page.getByRole('button', { name: /Felülírás/ }).click();
  await expect(page.getByText('Visszatöltve: 1 nap.')).toBeVisible();

  await page.goto('/#/naplo?nezet=table');
  await expect(page.locator('tr').last().getByRole('gridcell').nth(5)).toHaveText('8');
});
