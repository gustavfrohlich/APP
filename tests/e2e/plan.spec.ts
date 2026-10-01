// Terv: tartalék hét felhasználása és jövőbeli hét áthelyezése (a kezdés előtt minden teszthét jövőbeli).
import { expect, test } from '@playwright/test';

test('tartalék hét felhasználása és átrendezés', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-01T09:00:00'));
  await page.goto('/#/terv');
  const timeline = page.getByRole('list', { name: 'A hetek idővonala' });
  await timeline.getByRole('button', { name: /tartalék hét/ }).click();
  await page.getByRole('button', { name: 'Tartalék hét felhasználása' }).click();
  await page.getByLabel('Új étel (ez látszik mindenhol)').fill('hagyma + fokhagyma külön');
  await page.getByRole('button', { name: 'Mentés' }).click();
  await expect(timeline.getByText('hagyma + fokhagyma külön')).toBeVisible();

  await timeline.getByRole('button', { name: /\+ búza/ }).click();
  await page.getByRole('button', { name: 'Feljebb' }).click();
  await expect(page.locator('#week-4')).toContainText('+ búza');
  await expect(page.locator('#week-5')).toContainText('+ tojás');
});
