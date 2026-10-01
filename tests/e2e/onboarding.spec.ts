// Első indítás: a varázsló végigvihető, minden lépés kihagyható, a végén a Ma képernyő jön.
import { expect, test } from '@playwright/test';

test('varázsló: kezdés, becslés, kész', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-01T09:00:00'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Üdv a Bázisban!' })).toBeVisible();
  await page.getByRole('button', { name: 'Kezdjük' }).click();
  await expect(page.getByLabel('Kezdés dátuma')).toHaveValue('2026-10-05');
  await page.getByRole('button', { name: 'Tovább' }).click();
  await page.getByRole('button', { name: 'Kihagyom', exact: true }).click();
  await page.getByLabel('Alvásminőség').fill('6');
  await page.getByRole('button', { name: 'Tovább' }).click();
  await page.getByRole('button', { name: 'Kész, indulhat' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: /Reggel/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Üdv a Bázisban!' })).toBeHidden();
});

test('varázsló: demó adatokkal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Kipróbálom demó adatokkal' }).click();
  await expect(page.getByRole('link', { name: /Demó/ })).toBeVisible();
  await expect(page.getByText(/napos sorozat/)).toBeVisible();
});
