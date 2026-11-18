/**
 * Re-renders the stills of the Exhibitions & Conferences page — what the page shows on the css tier (no WebGL), without
 * JS, and on first paint before the stage loads:
 *   public/media/img/curtain-poster(.webp | -m.webp)   the closed velvet curtain in the follow spot (dev URL ?gala=curtain)
 *   public/media/img/hall-poster(.webp | -m.webp)      the hall with the curtain open (dev URL ?gala=hall)
 * Screenshots of our own WebGL scene (act `gala`). Run again whenever the palette, the world or its lighting change:
 *   npm run dev      then      node scripts/render-gala-still.mjs      (needs ffmpeg for the WebP)
 */
import { launch } from './qa-browser.mjs';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321';
const browser = await launch();
for (const [still, file, width, height, quality] of [
  ['curtain', 'curtain-poster', 1600, 1000, 72], ['curtain', 'curtain-poster-m', 780, 1688, 60],
  ['hall', 'hall-poster', 1600, 1000, 70], ['hall', 'hall-poster-m', 780, 1688, 58],
]) {
  const png = `public/media/img/${file}.png`, webp = `public/media/img/${file}.webp`;
  const page = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })).newPage();
  await page.goto(`${base}/en/services/exhibitions-conferences/?tier=full&gala=${still}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.mouse.move(200, 200); await page.mouse.move(240, 230);        // first interaction → the stage loads
  await page.addStyleTag({ content: '.site-header, .cursor, .flight-rail, .flight-bar, .whatsapp-float { display: none !important }' });
  await page.waitForSelector('.gala__stage.is-drawing', { timeout: 30000 });
  await page.mouse.move(width / 2, height / 2);                            // pointer in the middle: no parallax
  await page.waitForTimeout(4000);
  await page.locator('.gala__stage').screenshot({ path: png });
  await page.context().close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, '-c:v', 'libwebp', '-quality', String(quality), webp]);
  rmSync(png);
  console.log(`wrote ${webp}`);
}
await browser.close();
