/**
 * Re-renders public/media/img/scales-poster.webp — the still of the balanced scales that the Legal page shows on
 * the css tier (no WebGL) and without JS. It is a screenshot of our own WebGL scene (act `justice`) in
 * its final state: every weight on the pan, perfect balance, camera centred (dev URL `?scales=poster`).
 * Run it again whenever the palette, the model or its lighting change:
 *   npm run dev      then      node scripts/render-scales-still.mjs      (needs ffmpeg for the WebP)
 */
import { launch } from './qa-browser.mjs';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321';
const browser = await launch();
// the wide still (soft-edged, beside the text) and the tall one that fills a phone screen behind the text
for (const [file, width, height, quality] of [['scales-poster', 1100, 1300, 78], ['scales-poster-m', 780, 1688, 62]]) {
  const png = `public/media/img/${file}.png`, webp = `public/media/img/${file}.webp`;
  const page = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })).newPage();
  await page.goto(`${base}/en/services/legal-services/?tier=full&scales=poster`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.mouse.move(200, 200); await page.mouse.move(240, 230);        // first interaction → the stage loads
  await page.addStyleTag({ content: '.site-header, .cursor, .flight-rail, .flight-bar, .whatsapp-float { display: none !important }' });
  await page.waitForSelector('.legal__stage.is-drawing', { timeout: 30000 });
  await page.mouse.move(width / 2, height / 2);                            // pointer in the middle: no parallax
  await page.waitForTimeout(3500);
  await page.locator('.legal__stage').screenshot({ path: png });
  await page.context().close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', String(quality), webp]);
  rmSync(png);
  console.log(`wrote ${webp}`);
}
await browser.close();
