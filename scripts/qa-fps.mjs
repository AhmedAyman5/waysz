/**
 * Scroll smoothness under CPU throttling: wheel-scrolls through the page and reports frame times.
 *   node scripts/qa-fps.mjs [url] [cpuRate=4]
 * Run against the production preview. Real GPU, CPU slowed down with DevTools throttling.
 */
import { launch } from './qa-browser.mjs';

const url = process.argv[2] ?? 'http://localhost:4322/';
const rate = Number(process.argv[3] ?? 4);
const browser = await launch();

for (const device of [
  { name: 'desktop 1440x900', viewport: { width: 1440, height: 900 } },
  { name: 'mobile 390x844', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
]) {
  const { name, ...options } = device;
  const context = await browser.newContext(options);
  await context.addInitScript(() => { try { sessionStorage.setItem('waysz-intro', '1'); } catch {} });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.mouse.move(200, 300); await page.mouse.move(260, 340);
  await page.evaluate(() => window.dispatchEvent(new Event('touchstart')));
  await page.waitForTimeout(3500);
  // warm pass: let the sequence frames stream in, then go back to the top (steady state is what we measure)
  await page.evaluate(() => window.scrollTo(0, innerHeight * 0.3));
  await page.waitForTimeout(9000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });

  await page.evaluate(() => {
    window.__dt = [];
    let last = performance.now();
    const loop = (now) => { window.__dt.push(now - last); last = now; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const end = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);   // the whole page
  for (let y = 0; y < end; y += 60) {
    if (device.isMobile) await page.evaluate((top) => window.scrollTo(0, top), y);
    else await page.mouse.wheel(0, 60);
    await page.waitForTimeout(24);
  }
  await page.waitForTimeout(800);
  const stats = await page.evaluate(() => {
    const d = window.__dt.slice(5).sort((a, b) => a - b);
    window.__marks = undefined;
    const at = (p) => d[Math.floor(d.length * p)];
    return {
      frames: d.length, median: at(0.5), p95: at(0.95), worst: d.at(-1),
      over33: d.filter((x) => x > 33.4).length, over50: d.filter((x) => x > 50).length,
      tier: document.documentElement.dataset.tier, live: !!document.querySelector('[data-flight].is-live'),
    };
  });
  console.log(`${name} · CPU ${rate}x · tier ${stats.tier} (WebGL live: ${stats.live}) · ${stats.frames} frames · median ${stats.median.toFixed(1)}ms · p95 ${
    stats.p95.toFixed(1)}ms · worst ${stats.worst.toFixed(0)}ms · >33ms: ${stats.over33} · >50ms: ${stats.over50}`);
  await context.close();
}
await browser.close();
