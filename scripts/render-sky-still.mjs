/**
 * Re-renders the stills of the Services page — what the page shows on the css tier (no WebGL), without JS, and on
 * first paint before the stage loads. Screenshots of our own WebGL sky (act `sky`, dev URL ?sky=…):
 *   public/media/img/sky-scatter(.webp | -m.webp)   the hero's scattered stars (the canvas starts exactly like this)
 *   public/media/img/sky-all(.webp | -m.webp)       the four constellations, drawn
 *   public/media/img/sky-<area>.webp                one constellation, rendered on black and turned into alpha (light =
 *                                                   opacity) for its area's window, `.area__sky` (no blend mode: the sticky
 *                                                   side column is its own stacking context)
 * Run again whenever the palette, the emblems or the sky shaders change:
 *   npm run dev      then      node scripts/render-sky-still.mjs      (needs ffmpeg for the WebP)
 */
import { launch } from './qa-browser.mjs';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4321';
const jobs = [
  ['scatter', 'sky-scatter', 1600, 1000, 70], ['scatter', 'sky-scatter-m', 780, 1688, 58],
  ['all', 'sky-all', 1600, 1000, 70], ['all', 'sky-all-m', 780, 1688, 58],
  ...['legal', 'travel', 'events', 'software'].map((a) => [a, `sky-${a}`, 720, 720, 72]),
];
const browser = await launch();
for (const [still, file, width, height, quality] of jobs) {
  const png = `public/media/img/${file}.png`, webp = `public/media/img/${file}.webp`;
  const page = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })).newPage();
  await page.goto(`${base}/en/services/?tier=full&sky=${still}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.mouse.move(width / 2, height / 2); await page.mouse.move(width / 2 + 1, height / 2);   // first interaction → the stage loads
  await page.addStyleTag({ content: '.site-header, .cursor, .flight-rail, .flight-bar, .whatsapp-float, .star-trail { display: none !important }' });
  await page.waitForSelector('.sky__stage.is-drawing', { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.locator('.sky__stage').screenshot({ path: png });
  await page.context().close();
  // a constellation on black → colour + alpha (alpha = the brightest channel, colour un-premultiplied)
  const M = 'max(max(r(X,Y),g(X,Y)),b(X,Y))';
  const alpha = ['legal', 'travel', 'events', 'software'].includes(still)
    ? ['-vf', `format=rgba,geq=r='if(gt(${M},0),r(X,Y)*255/${M},0)':g='if(gt(${M},0),g(X,Y)*255/${M},0)':b='if(gt(${M},0),b(X,Y)*255/${M},0)':a='${M}'`] : [];
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', png, ...alpha, '-c:v', 'libwebp', '-quality', String(quality), webp]);
  rmSync(png);
  console.log(`wrote ${webp}`);
}
await browser.close();
