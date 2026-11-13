/**
 * Re-renders public/media/img/earth-borders-poster.webp — the still globe of the Immigration page's
 * "Explore the world" (css tier, reduced motion, no JS). It is a screenshot of our own WebGL globe.
 * Run it again whenever the palette, the globe shader or the borders file change:
 *   npm run dev      then      node scripts/render-globe-still.mjs      (needs ffmpeg for the WebP)
 */
import { launch } from './qa-browser.mjs';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321';
const browser = await launch();
const page = await (await browser.newContext({ viewport: { width: 1000, height: 1300 }, deviceScaleFactor: 1 })).newPage();
await page.goto(`${base}/en/services/immigration-study-visa/?tier=high`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.mouse.move(200, 200); await page.mouse.move(240, 230);          // first interaction → the stage loads
await page.addStyleTag({ content: '.explore__scrim, .explore__hint, .explore__zoom, .explore__poster, .cursor { display: none !important }' });
await page.evaluate(() => {
  const el = document.querySelector('.explore__globe');
  window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' });
});
await page.waitForSelector('#explore.is-live', { timeout: 20000 });
await page.waitForTimeout(3000);
await page.locator('.explore__stage').screenshot({ path: 'public/media/img/earth-borders-poster.png' });
await browser.close();
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'public/media/img/earth-borders-poster.png', '-c:v', 'libwebp', '-quality', '80', 'public/media/img/earth-borders-poster.webp']);
rmSync('public/media/img/earth-borders-poster.png');
console.log('wrote public/media/img/earth-borders-poster.webp');
