// Fejlesztői segéd: képernyőképek a futó preview-ról. Használat:
//   node scripts/shoot.mjs <kimeneti-mappa> [útvonal...]  (a preview a 4173-as porton fusson)
import { chromium } from '@playwright/test';
import path from 'node:path';

const [outDir = 'screenshots', ...routes] = process.argv.slice(2);
const list = routes.length ? routes : ['/'];
const theme = process.env.THEME || 'light';
const sizes = (process.env.SIZES || '1440x900,1280x800')
  .split(',')
  .map((s) => s.split('x').map(Number));
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    locale: 'hu-HU',
    timezoneId: 'Europe/Budapest',
    colorScheme: theme === 'dark' ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text());
  });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  if (process.env.SETUP) {
    await page.goto('http://localhost:4173/');
    await page.evaluate(process.env.SETUP);
  }
  for (const r of list) {
    await page.goto(`http://localhost:4173/#${r}`);
    await page.waitForTimeout(Number(process.env.WAIT || 900));
    const name = `${(r.replace(/[^a-z0-9]+/gi, '_') || 'root').replace(/^_|_$/g, '') || 'root'}-${w}-${theme}.png`;
    await page.screenshot({ path: path.join(outDir, name), fullPage: process.env.FULL === '1' });
    console.log('saved', name);
  }
  await ctx.close();
}
await browser.close();
