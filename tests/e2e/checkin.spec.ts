// Smoke teszt: a reggeli és az esti check-in csak billentyűzettel, 30 másodpercen belül.
// Asztali (1440×900) és laptop (1280×800) nézetben fut (lásd playwright.config.ts).

import { expect, test, type Page } from '@playwright/test';

async function fresh(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: /Reggel/ })).toBeVisible();
}

test('reggeli check-in csak billentyűzettel', async ({ page }) => {
  await fresh(page);
  const started = Date.now();

  await page.keyboard.press('r');
  const dialog = page.getByRole('dialog', { name: /Reggel – az éjszakáról/ });
  await expect(dialog).toBeVisible();

  // Hely: a javaslat elfogadása Enterrel, majd „Nem” a barátnőre (N betű).
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  await page.keyboard.press('n');
  await page.waitForTimeout(350);
  // Alvásminőség: 7
  await page.keyboard.press('7');
  await page.waitForTimeout(350);
  // Óraadatok: maszkolt bevitel, Enterrel tovább.
  for (const v of ['756', '11', '42', '205', '84', '51,5']) {
    await page.keyboard.type(v);
    await page.keyboard.press('Enter');
  }
  // Baseline nélkül az összegzés teendőt mond (importáld az óra exportját).
  await expect(dialog.getByText(/összkép/i).first()).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Kész/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden({ timeout: 4000 });

  expect(Date.now() - started).toBeLessThan(30_000);
  const card = page.getByRole('region', { name: /Reggel/ });
  await expect(card.getByText('7:56 alvás')).toBeVisible();
  await expect(card.getByText('érzésre 7/10')).toBeVisible();
});

test('esti check-in csak billentyűzettel', async ({ page }) => {
  await fresh(page);
  const started = Date.now();

  await page.keyboard.press('e');
  const dialog = page.getByRole('dialog', { name: /Este – a napról/ });
  await expect(dialog).toBeVisible();

  // Orr 2, fáradtság 3, evés utáni fáradtság 1, puffadás 4 → „Mikor?”: 3. lehetőség (Ebéd után).
  for (const d of ['2', '3', '1', '4']) {
    await page.keyboard.press(d);
    await page.waitForTimeout(350);
  }
  await expect(dialog.getByRole('radiogroup', { name: 'Puffadás mikor?' })).toBeVisible();
  await page.keyboard.press('3');
  await page.waitForTimeout(350);
  // A nap röviden: „Minden stimmel”
  await expect(dialog.getByRole('button', { name: /Minden stimmel/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  // Címkék: „Tovább”
  await expect(dialog.getByRole('button', { name: 'Tovább' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: /Kész/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden({ timeout: 4000 });

  expect(Date.now() - started).toBeLessThan(30_000);
  const card = page.getByRole('region', { name: /Este/ });
  await expect(card.getByText('puffadás 4')).toBeVisible();
  await expect(card.getByText('diéta: igen')).toBeVisible();
});

test('Esc bezárja a panelt, a válasz megmarad', async ({ page }) => {
  await fresh(page);
  await page.keyboard.press('r');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
  await page.keyboard.press('i');
  await page.waitForTimeout(350);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    page.getByRole('region', { name: /Reggel/ }).getByText(/félbehagytad/),
  ).toBeVisible();
});
