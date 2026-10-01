import type { Page } from '@playwright/test';

/** Friss böngészőprofilban az első indítás varázsló jelenik meg – a tesztekhez átugorjuk. */
export async function skipOnboarding(page: Page): Promise<void> {
  const start = page.getByRole('button', { name: 'Kezdjük' });
  try {
    await start.waitFor({ state: 'visible', timeout: 4000 });
  } catch {
    return;
  }
  await start.click();
  await page.getByRole('button', { name: 'Az egészet kihagyom' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
