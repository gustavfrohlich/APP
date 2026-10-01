// Az app ikonjainak PNG-változatai a public/icon.svg-ből (Playwright Chromiummal renderelve).
// Futtatás: npm run icons
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = await readFile(path.join(root, 'public/icon.svg'), 'utf8');

const targets = [
  { file: 'pwa-192.png', size: 192, pad: 0, bg: 'transparent' },
  { file: 'pwa-512.png', size: 512, pad: 0, bg: 'transparent' },
  { file: 'apple-touch-icon.png', size: 180, pad: 0, bg: '#FAF8F5' },
  // A maskable ikonnál a biztonsági zóna miatt kicsinyítve, teli háttérrel.
  { file: 'maskable-512.png', size: 512, pad: 0.12, bg: '#FAF8F5' },
  { file: 'favicon-32.png', size: 32, pad: 0, bg: 'transparent' },
];

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const t of targets) {
  const inner = Math.round(t.size * (1 - 2 * t.pad));
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:${t.bg};display:grid;place-items:center;width:${t.size}px;height:${t.size}px">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  );
  await page.screenshot({
    path: path.join(root, 'public', t.file),
    omitBackground: t.bg === 'transparent',
  });
  console.log('✓', t.file);
}
await browser.close();
