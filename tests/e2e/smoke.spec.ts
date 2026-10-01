// Füstpróba: minden képernyő betölt demó adatokkal és üresen is, konzolhiba nélkül;
// a telepített app net nélkül is elindul.
import { expect, test, type Page } from '@playwright/test';
import { skipOnboarding } from './helpers';

const ROUTES: [string, RegExp][] = [
  ['/', /Reggel/],
  ['/naplo', /Napló/],
  ['/elemzes', /Elemzés/],
  ['/terv', /Terv/],
  ['/osszefoglalo', /összefoglaló/],
  ['/beallitasok', /Beállítások/],
];

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function visitAll(page: Page) {
  for (const [route, heading] of ROUTES) {
    await page.goto(`/#${route}`);
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  }
}

test('üres adatokkal minden képernyő betölt, hiba nélkül', async ({ page }) => {
  const errors = collectErrors(page);
  await page.clock.setFixedTime(new Date('2026-10-01T09:00:00'));
  await page.goto('/');
  await skipOnboarding(page);
  await visitAll(page);
  expect(errors).toEqual([]);
});

test('demó módban minden képernyő betölt, hiba nélkül', async ({ page }) => {
  const errors = collectErrors(page);
  await page.clock.setFixedTime(new Date('2026-10-01T09:00:00'));
  await page.goto('/');
  await page.getByRole('button', { name: 'Kipróbálom demó adatokkal' }).click();
  await expect(page.getByRole('link', { name: /Demó/ })).toBeVisible();
  await visitAll(page);
  await page.goto('/#/elemzes');
  await expect(page.getByText('Heti összesítő')).toBeVisible();
  expect(errors).toEqual([]);
});

test('offline is elindul a service workerrel', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Üdv a Bázisban!' })).toBeVisible();
  await context.setOffline(false);
});
