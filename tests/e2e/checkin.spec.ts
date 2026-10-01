// Smoke teszt: a reggeli és az esti check-in csak billentyűzettel, 30 másodpercen belül.
// Asztali (1440×900) és laptop (1280×800) nézetben fut (lásd playwright.config.ts).

import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

async function fresh(page: Page) {
  await page.goto('/');
  await skipOnboarding(page);
  await expect(page.getByRole('heading', { level: 2, name: /Reggel/ })).toBeVisible();
}

test('reggeli check-in csak billentyűzettel', async ({ page }) => {
  await fresh(page);
  const started = Date.now();

  await page.keyboard.press('r');
  const dialog = page.getByRole('dialog', { name: /Reggel – az éjszakáról/ });
  await expect(dialog).toBeVisible();

  // Hely: a javaslat elfogadása Enterrel, majd „Nem” a barátnőre (N betű).
  await expect(dialog.getByRole('radio', { name: 'Budapest' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('radio', { name: 'Igen' })).toBeFocused();
  await page.keyboard.press('n');
  // Alvásminőség: 7
  await expect(
    dialog
      .getByRole('radiogroup', { name: /Milyen volt az alvás/ })
      .getByRole('radio')
      .first(),
  ).toBeFocused();
  await page.keyboard.press('7');
  await expect(dialog.getByLabel('Alvásidő')).toBeFocused();
  // Óraadatok: maszkolt bevitel, Enterrel tovább.
  const labels = ['Alvásidő', 'Ébren', 'Mély', 'REM', 'HRV', 'Pulzus'];
  for (const [i, v] of ['756', '11', '42', '205', '84', '51,5'].entries()) {
    await expect(dialog.getByLabel(labels[i]!, { exact: true })).toBeFocused();
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

  await expect(
    dialog
      .getByRole('radiogroup', { name: 'Orr / légzés', exact: true })
      .getByRole('radio')
      .first(),
  ).toBeFocused();
  // Orr 2, fáradtság 3, evés utáni fáradtság 1, puffadás 4 → „Mikor?”: 3. lehetőség (Ebéd után).
  // Az „1” után a skála fél másodpercig vár egy „0”-ra; a következő számjegy ezt lezárja.
  for (const [d, next] of [
    ['2', 'Fáradtság'],
    ['3', 'Evés utáni fáradtság'],
    ['1', 'Puffadás'],
  ] as const) {
    await page.keyboard.press(d);
    await expect(
      dialog.getByRole('radiogroup', { name: next, exact: true }).getByRole('radio').first(),
    ).toBeFocused();
  }
  await page.keyboard.press('4');
  await expect(
    dialog.getByRole('radiogroup', { name: 'Puffadás mikor?' }).getByRole('radio').first(),
  ).toBeFocused();
  await page.keyboard.press('3');
  // A nap röviden: „Minden stimmel”
  await expect(dialog.getByRole('button', { name: /Minden stimmel/ })).toBeFocused();
  await page.keyboard.press('Enter');
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
  await expect(page.getByRole('radio', { name: 'Budapest' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('radio', { name: 'Igen' })).toBeFocused();
  await page.keyboard.press('i');
  await expect(page.getByRole('radio', { name: 'Igen' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(
    page.getByRole('region', { name: /Reggel/ }).getByText(/félbehagytad/),
  ).toBeVisible();
});
